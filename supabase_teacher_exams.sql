-- Teachers: exam marks for their classes, edits after publishing, remarks and reports
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
-- If the editor warns about "destructive operations", choose "Run without RLS":
-- only teacher exam rules from an earlier run of this file are dropped and re-created.
-- Needs supabase_exam_class_publish.sql and supabase_teacher_class_access.sql.
--
-- What it adds:
--   1. Teachers can see the exams that include their classes, and enter or edit the marks
--      of their own classes (every subject). Creating exams, subjects and publishing stay
--      admin-only. "Their classes" are the ones assigned to them in the Teachers tab.
--   2. Marks of a published class can now be corrected (by its teacher or an admin) without
--      unpublishing. The change is live at once: website result, leaderboard and parent
--      dashboard. Every such change is recorded in exam_mark_changes (who, old, new, when).
--      Subjects of a published class are still locked.
--   3. A remark per student per exam (exam_student_remarks) for the progress card.
--   4. get_class_exam_results(exam, class): every student's result in that class, ranked,
--      with attendance for the academic year. Used for result sheets and progress cards.
-- Nothing existing is deleted or changed in your data.

BEGIN;

-- ─── Helper: may the signed-in person manage this class? ────────────────────

CREATE OR REPLACE FUNCTION public.rms_can_manage_class(p_class_level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.rms_is_admin()
      OR p_class_level IN (SELECT public.rms_my_teacher_classes());
$$;

REVOKE ALL ON FUNCTION public.rms_can_manage_class(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rms_can_manage_class(text) TO authenticated;

-- ─── 1. Teacher access ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Teachers read exams of their classes" ON public.exams;
CREATE POLICY "Teachers read exams of their classes" ON public.exams
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.exam_subjects s
  WHERE s.exam_id = exams.id AND s.class_level IN (SELECT public.rms_my_teacher_classes())
));

DROP POLICY IF EXISTS "Teachers read subjects of their classes" ON public.exam_subjects;
CREATE POLICY "Teachers read subjects of their classes" ON public.exam_subjects
FOR SELECT TO authenticated
USING (class_level IN (SELECT public.rms_my_teacher_classes()));

DROP POLICY IF EXISTS "Teachers read publications of their classes" ON public.exam_class_publications;
CREATE POLICY "Teachers read publications of their classes" ON public.exam_class_publications
FOR SELECT TO authenticated
USING (class_level IN (SELECT public.rms_my_teacher_classes()));

-- True when the signed-in teacher teaches the class this exam subject belongs to and the
-- student is in that class now.
CREATE OR REPLACE FUNCTION public.rms_teacher_can_mark(p_exam_subject_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_subjects s
    JOIN public.students st ON st.id = p_student_id AND st.class_level = s.class_level
    WHERE s.id = p_exam_subject_id
      AND s.class_level IN (SELECT public.rms_my_teacher_classes())
  );
$$;

REVOKE ALL ON FUNCTION public.rms_teacher_can_mark(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rms_teacher_can_mark(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Teachers manage marks of their classes" ON public.exam_marks;
CREATE POLICY "Teachers manage marks of their classes" ON public.exam_marks
FOR ALL TO authenticated
USING (public.rms_teacher_can_mark(exam_subject_id, student_id))
WITH CHECK (public.rms_teacher_can_mark(exam_subject_id, student_id));

-- ─── 2. Corrections after publishing ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_mark_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  class_level text NOT NULL,
  subject_name text NOT NULL,
  student_id uuid,
  student_name text,
  old_marks numeric,
  old_absent boolean,
  new_marks numeric,
  new_absent boolean,
  changed_by uuid,
  changed_by_name text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_mark_changes_exam_idx ON public.exam_mark_changes (exam_id, changed_at DESC);

ALTER TABLE public.exam_mark_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exam_mark_changes FROM anon;
GRANT SELECT ON public.exam_mark_changes TO authenticated;

DROP POLICY IF EXISTS "Staff read mark changes" ON public.exam_mark_changes;
CREATE POLICY "Staff read mark changes" ON public.exam_mark_changes
FOR SELECT TO authenticated
USING (public.rms_can_manage_class(class_level));

-- Marks of published classes are no longer locked; subjects still are.
CREATE OR REPLACE FUNCTION public.exam_lock_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'exam_subjects' THEN
    IF TG_OP IN ('UPDATE', 'DELETE') AND public.rms_class_published(OLD.exam_id, OLD.class_level) THEN
      RAISE EXCEPTION '% is published for this exam. Unpublish that class before changing its subjects.', OLD.class_level;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') AND public.rms_class_published(NEW.exam_id, NEW.class_level) THEN
      RAISE EXCEPTION '% is published for this exam. Unpublish that class before changing its subjects.', NEW.class_level;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- After a mark of a published class changes: record it and update the leaderboard copy.
CREATE OR REPLACE FUNCTION public.exam_marks_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subj record;
  v_student uuid := coalesce(NEW.student_id, OLD.student_id);
  v_name text;
  v_old_marks numeric;
  v_old_absent boolean;
  v_new_marks numeric;
  v_new_absent boolean;
BEGIN
  SELECT s.exam_id, s.class_level, s.subject_name, s.max_marks, e.name AS exam_name, e.exam_date
  INTO subj
  FROM public.exam_subjects s
  JOIN public.exams e ON e.id = s.exam_id
  WHERE s.id = coalesce(NEW.exam_subject_id, OLD.exam_subject_id);

  IF subj.exam_id IS NULL OR NOT public.rms_class_published(subj.exam_id, subj.class_level) THEN
    RETURN NULL;
  END IF;

  -- The student is being deleted: nothing to record.
  SELECT full_name INTO v_name FROM public.students WHERE id = v_student;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    v_old_marks := OLD.marks_obtained;
    v_old_absent := OLD.is_absent;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_marks := NEW.marks_obtained;
    v_new_absent := NEW.is_absent;
  END IF;

  IF TG_OP = 'UPDATE'
     AND v_old_marks IS NOT DISTINCT FROM v_new_marks
     AND v_old_absent IS NOT DISTINCT FROM v_new_absent THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.exam_mark_changes (
    exam_id, class_level, subject_name, student_id, student_name,
    old_marks, old_absent, new_marks, new_absent, changed_by, changed_by_name
  ) VALUES (
    subj.exam_id, subj.class_level, subj.subject_name, v_student, v_name,
    v_old_marks, v_old_absent, v_new_marks, v_new_absent, auth.uid(),
    (SELECT full_name FROM public.profiles WHERE id = auth.uid())
  );

  -- Keep the leaderboard / parent copy in step (same rule as publishing).
  DELETE FROM public.scores
  WHERE exam_id = subj.exam_id AND student_id = v_student AND subject = subj.subject_name;

  IF TG_OP <> 'DELETE' AND NOT coalesce(v_new_absent, false) AND v_new_marks IS NOT NULL THEN
    INSERT INTO public.scores (student_id, exam_title, subject, marks_obtained, total_marks, exam_id)
    VALUES (v_student, subj.exam_name, subj.subject_name, v_new_marks, subj.max_marks, subj.exam_id);

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'date'
    ) THEN
      EXECUTE 'UPDATE public.scores SET date = $1 WHERE exam_id = $2 AND student_id = $3 AND subject = $4'
      USING coalesce(subj.exam_date, (now() AT TIME ZONE 'Asia/Kolkata')::date), subj.exam_id, v_student, subj.subject_name;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.exam_marks_after_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS exam_marks_after_change_trigger ON public.exam_marks;
CREATE TRIGGER exam_marks_after_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.exam_marks
  FOR EACH ROW
  EXECUTE FUNCTION public.exam_marks_after_change();

-- ─── 3. Remarks for the progress card ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_student_remarks (
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  remark text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, student_id)
);

ALTER TABLE public.exam_student_remarks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exam_student_remarks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_student_remarks TO authenticated;

DROP POLICY IF EXISTS "Staff manage remarks of their classes" ON public.exam_student_remarks;
CREATE POLICY "Staff manage remarks of their classes" ON public.exam_student_remarks
FOR ALL TO authenticated
USING (public.rms_is_admin() OR public.rms_teaches_student(student_id))
WITH CHECK (public.rms_is_admin() OR public.rms_teaches_student(student_id));

CREATE OR REPLACE FUNCTION public.exam_student_remarks_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.remark := left(btrim(coalesce(NEW.remark, '')), 500);
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exam_student_remarks_stamp_trigger ON public.exam_student_remarks;
CREATE TRIGGER exam_student_remarks_stamp_trigger
  BEFORE INSERT OR UPDATE ON public.exam_student_remarks
  FOR EACH ROW
  EXECUTE FUNCTION public.exam_student_remarks_stamp();

-- ─── 4. Class results for sheets and progress cards ─────────────────────────
-- Every student of the class: those who sat the exam in this class (ranked by total), then
-- current students of the class with no marks yet. Attendance runs from 1 June of the
-- academic year ("2026-27" -> 2026-06-01; otherwise one year before) to the exam date or today.

CREATE OR REPLACE FUNCTION public.get_class_exam_results(p_exam_id uuid, p_class_level text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ex public.exams%ROWTYPE;
  v_to date;
  v_from date;
  v_rows jsonb;
  v_subjects jsonb;
BEGIN
  IF NOT public.rms_can_manage_class(p_class_level) THEN
    RAISE EXCEPTION 'You can only see results of your own classes.';
  END IF;

  SELECT * INTO ex FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;

  v_to := coalesce(ex.exam_date, (now() AT TIME ZONE 'Asia/Kolkata')::date);
  v_from := CASE
    WHEN substring(coalesce(ex.academic_year, '') FROM '^\s*(\d{4})') IS NOT NULL
      THEN make_date(substring(ex.academic_year FROM '^\s*(\d{4})')::int, 6, 1)
    ELSE v_to - 365
  END;
  IF v_from > v_to THEN
    v_from := v_to - 365;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'subject', subject_name, 'max_marks', max_marks, 'pass_marks', pass_marks
         ) ORDER BY sort_order, subject_name), '[]'::jsonb)
  INTO v_subjects
  FROM public.exam_subjects
  WHERE exam_id = p_exam_id AND class_level = p_class_level;

  WITH sat AS (
    SELECT DISTINCT m.student_id
    FROM public.exam_marks m
    JOIN public.exam_subjects s ON s.id = m.exam_subject_id
    WHERE s.exam_id = p_exam_id AND s.class_level = p_class_level
  ), totals AS (
    SELECT m.student_id, sum(coalesce(m.marks_obtained, 0)) AS total
    FROM public.exam_marks m
    JOIN public.exam_subjects s ON s.id = m.exam_subject_id
    WHERE s.exam_id = p_exam_id AND s.class_level = p_class_level
    GROUP BY m.student_id
  ), ranked AS (
    SELECT student_id, total, rank() OVER (ORDER BY total DESC) AS position FROM totals
  ), people AS (
    SELECT student_id FROM sat
    UNION
    SELECT id FROM public.students
    WHERE class_level = p_class_level AND coalesce(status, 'active') = 'active'
  ), att AS (
    SELECT a.student_id,
           count(*) AS total_days,
           count(*) FILTER (WHERE a.status IN ('present', 'late')) AS present_days
    FROM public.attendance a
    WHERE a.student_id IN (SELECT student_id FROM people)
      AND a.date BETWEEN v_from AND v_to
    GROUP BY a.student_id
  )
  SELECT coalesce(jsonb_agg(row_data ORDER BY sort_group, position NULLS LAST, full_name), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      CASE WHEN r.student_id IS NULL THEN 1 ELSE 0 END AS sort_group,
      r.position,
      st.full_name,
      coalesce(
        public.build_exam_result(p_exam_id, st.id),
        jsonb_build_object(
          'student', jsonb_build_object(
            'id', st.id, 'full_name', st.full_name, 'registration_no', st.registration_no,
            'class_level', p_class_level
          ),
          'no_marks', true
        )
      ) || jsonb_build_object(
        'position', r.position,
        'remark', (SELECT remark FROM public.exam_student_remarks WHERE exam_id = p_exam_id AND student_id = st.id),
        'attendance', jsonb_build_object(
          'present', coalesce(att.present_days, 0),
          'total', coalesce(att.total_days, 0),
          'percentage', CASE WHEN coalesce(att.total_days, 0) > 0
                             THEN round(att.present_days * 100.0 / att.total_days, 1) END
        )
      ) AS row_data
    FROM people p
    JOIN public.students st ON st.id = p.student_id
    LEFT JOIN ranked r ON r.student_id = st.id
    LEFT JOIN att ON att.student_id = st.id
  ) x;

  RETURN jsonb_build_object(
    'exam', jsonb_build_object(
      'id', ex.id, 'name', ex.name, 'academic_year', ex.academic_year, 'exam_date', ex.exam_date,
      'grading_enabled', ex.grading_enabled, 'show_rank', ex.show_rank
    ),
    'class_level', p_class_level,
    'published', public.rms_class_published(p_exam_id, p_class_level),
    'attendance_from', v_from,
    'attendance_to', v_to,
    'subjects', v_subjects,
    'students', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_class_exam_results(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_exam_results(uuid, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ─── Report: exams and the classes each teacher can now mark ────────────────
SELECT p.full_name AS teacher,
       coalesce((SELECT string_agg(c, ', ' ORDER BY c) FROM public.rms_teacher_classes_for(p.id) AS c), '(no classes)') AS classes
FROM public.profiles p
WHERE p.role = 'teacher' AND p.status = 'approved'
ORDER BY 1;
