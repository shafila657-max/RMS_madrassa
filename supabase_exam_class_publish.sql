-- Exam results: publish class by class
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
-- If the editor warns about "destructive operations", choose "Run without RLS".
-- Needs supabase_exam_results.sql and supabase_security_fixes.sql.
--
-- Before: an exam was published or unpublished as a whole. Adding a class to a published
-- exam meant unpublishing it, which took every class's results off the website.
-- After: each class of an exam is published on its own.
--   * exam_class_publications records which classes of which exam are live.
--   * A published class is locked (subjects and marks); other classes stay editable, and
--     new classes can be added to an exam that already has published classes.
--   * exams.status is 'published' while at least one class is live.
--   * The public lookup and the parent/student dashboards show a student's most recent
--     published result. A student whose class is not published yet gets {"pending": true}.
-- Exams that are published today keep all their current classes published.

BEGIN;

-- ─── Which classes are live ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exam_class_publications (
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  class_level text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, class_level)
);

ALTER TABLE public.exam_class_publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read class publications" ON public.exam_class_publications;
CREATE POLICY "Admins read class publications" ON public.exam_class_publications
FOR SELECT TO authenticated
USING (public.rms_is_admin());
-- Writes only through publish_exam_class / unpublish_exam_class below.

-- Existing published exams: every class they have is published.
INSERT INTO public.exam_class_publications (exam_id, class_level, published_at)
SELECT DISTINCT e.id, s.class_level, coalesce(e.published_at, now())
FROM public.exams e
JOIN public.exam_subjects s ON s.exam_id = e.id
WHERE e.status = 'published'
ON CONFLICT (exam_id, class_level) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rms_class_published(p_exam_id uuid, p_class_level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exam_class_publications
    WHERE exam_id = p_exam_id AND class_level = p_class_level
  );
$$;

-- ─── Locks: per class instead of per exam ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.exam_lock_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  subj record;
BEGIN
  IF TG_TABLE_NAME = 'exam_subjects' THEN
    -- Adding, changing or removing a subject of a published class is blocked
    -- (checked for both the old and the new class when a subject moves).
    IF TG_OP IN ('UPDATE', 'DELETE') AND public.rms_class_published(OLD.exam_id, OLD.class_level) THEN
      RAISE EXCEPTION '% is published for this exam. Unpublish that class before changing its subjects.', OLD.class_level;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') AND public.rms_class_published(NEW.exam_id, NEW.class_level) THEN
      RAISE EXCEPTION '% is published for this exam. Unpublish that class before changing its subjects.', NEW.class_level;
    END IF;
  ELSE
    -- A mark removed because its student was deleted is allowed through.
    IF TG_OP = 'DELETE' THEN
      IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = OLD.student_id) THEN
        RETURN OLD;
      END IF;
    END IF;

    SELECT exam_id, class_level INTO subj
    FROM public.exam_subjects
    WHERE id = coalesce(NEW.exam_subject_id, OLD.exam_subject_id);

    IF subj.exam_id IS NOT NULL AND public.rms_class_published(subj.exam_id, subj.class_level) THEN
      RAISE EXCEPTION '% is published for this exam. Unpublish that class before changing marks.', subj.class_level;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Exam details: names and dates can change any time; how results are shown (grades,
-- rank) cannot change while any class is live, and a live exam cannot be deleted.
CREATE OR REPLACE FUNCTION public.exams_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  any_live boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'draft';
    NEW.published_at := NULL;
    RETURN NEW;
  END IF;

  any_live := EXISTS (SELECT 1 FROM public.exam_class_publications WHERE exam_id = OLD.id);

  IF TG_OP = 'DELETE' THEN
    IF any_live THEN
      RAISE EXCEPTION 'Unpublish every class of this exam before deleting it.';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.published_at IS DISTINCT FROM OLD.published_at)
     AND coalesce(current_setting('rms.exam_status_change', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Use Publish / Unpublish to change the exam status.';
  END IF;

  IF any_live AND (
       NEW.grading_enabled IS DISTINCT FROM OLD.grading_enabled
       OR NEW.grade_scale IS DISTINCT FROM OLD.grade_scale
       OR NEW.show_rank IS DISTINCT FROM OLD.show_rank) THEN
    RAISE EXCEPTION 'Grades and rank settings cannot change while results are published. Unpublish every class first.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─── Publishing ─────────────────────────────────────────────────────────────

-- Keeps exams.status / published_at in step with the live classes.
CREATE OR REPLACE FUNCTION public.rms_refresh_exam_status(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest timestamptz;
BEGIN
  SELECT max(published_at) INTO latest FROM public.exam_class_publications WHERE exam_id = p_exam_id;
  PERFORM set_config('rms.exam_status_change', 'on', true);
  UPDATE public.exams
  SET status = CASE WHEN latest IS NULL THEN 'draft' ELSE 'published' END,
      published_at = latest
  WHERE id = p_exam_id;
  PERFORM set_config('rms.exam_status_change', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rms_refresh_exam_status(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_exam_class(p_exam_id uuid, p_class_level text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ex public.exams%ROWTYPE;
BEGIN
  IF NOT public.rms_is_admin() THEN
    RAISE EXCEPTION 'Only admins can publish results';
  END IF;

  SELECT * INTO ex FROM public.exams WHERE id = p_exam_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;
  IF public.rms_class_published(p_exam_id, p_class_level) THEN
    RAISE EXCEPTION '% is already published', p_class_level;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exam_marks m
    JOIN public.exam_subjects s ON s.id = m.exam_subject_id
    WHERE s.exam_id = p_exam_id AND s.class_level = p_class_level
  ) THEN
    RAISE EXCEPTION 'Enter marks for % before publishing', p_class_level;
  END IF;

  INSERT INTO public.exam_class_publications (exam_id, class_level) VALUES (p_exam_id, p_class_level);
  PERFORM public.rms_refresh_exam_status(p_exam_id);

  -- Mirror this class's marks into scores so leaderboard points and parent averages update.
  DELETE FROM public.scores
  WHERE exam_id = p_exam_id
    AND student_id IN (
      SELECT m.student_id FROM public.exam_marks m
      JOIN public.exam_subjects s ON s.id = m.exam_subject_id
      WHERE s.exam_id = p_exam_id AND s.class_level = p_class_level
    );

  INSERT INTO public.scores (student_id, exam_title, subject, marks_obtained, total_marks, exam_id)
  SELECT m.student_id, ex.name, s.subject_name, m.marks_obtained, s.max_marks, p_exam_id
  FROM public.exam_marks m
  JOIN public.exam_subjects s ON s.id = m.exam_subject_id
  WHERE s.exam_id = p_exam_id AND s.class_level = p_class_level
    AND NOT m.is_absent AND m.marks_obtained IS NOT NULL;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'date'
  ) THEN
    EXECUTE 'UPDATE public.scores SET date = $1 WHERE exam_id = $2 AND date IS DISTINCT FROM $1'
    USING coalesce(ex.exam_date, (now() AT TIME ZONE 'Asia/Kolkata')::date), p_exam_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_exam_class(p_exam_id uuid, p_class_level text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.rms_is_admin() THEN
    RAISE EXCEPTION 'Only admins can unpublish results';
  END IF;

  DELETE FROM public.exam_class_publications WHERE exam_id = p_exam_id AND class_level = p_class_level;
  PERFORM public.rms_refresh_exam_status(p_exam_id);

  DELETE FROM public.scores
  WHERE exam_id = p_exam_id
    AND student_id IN (
      SELECT m.student_id FROM public.exam_marks m
      JOIN public.exam_subjects s ON s.id = m.exam_subject_id
      WHERE s.exam_id = p_exam_id AND s.class_level = p_class_level
    );
END;
$$;

-- Whole-exam versions: publish every class that has marks and isn't live yet / take all down.
CREATE OR REPLACE FUNCTION public.publish_exam(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cls text;
  published_any boolean := false;
BEGIN
  IF NOT public.rms_is_admin() THEN
    RAISE EXCEPTION 'Only admins can publish results';
  END IF;
  FOR cls IN
    SELECT DISTINCT s.class_level
    FROM public.exam_subjects s
    JOIN public.exam_marks m ON m.exam_subject_id = s.id
    WHERE s.exam_id = p_exam_id
      AND NOT public.rms_class_published(p_exam_id, s.class_level)
  LOOP
    PERFORM public.publish_exam_class(p_exam_id, cls);
    published_any := true;
  END LOOP;
  IF NOT published_any THEN
    RAISE EXCEPTION 'No class with marks is waiting to be published';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_exam(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.rms_is_admin() THEN
    RAISE EXCEPTION 'Only admins can unpublish results';
  END IF;
  DELETE FROM public.exam_class_publications WHERE exam_id = p_exam_id;
  PERFORM public.rms_refresh_exam_status(p_exam_id);
  DELETE FROM public.scores WHERE exam_id = p_exam_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_exam_class(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unpublish_exam_class(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_exam(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unpublish_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_exam_class(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_exam_class(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_exam(uuid) TO authenticated;

-- ─── Looking up results ─────────────────────────────────────────────────────

-- The exam of a student's most recently published result (their class published for it).
CREATE OR REPLACE FUNCTION public.rms_latest_published_exam_for(p_student_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.exam_id
  FROM public.exam_marks m
  JOIN public.exam_subjects s ON s.id = m.exam_subject_id
  JOIN public.exam_class_publications p ON p.exam_id = s.exam_id AND p.class_level = s.class_level
  WHERE m.student_id = p_student_id
  ORDER BY p.published_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.rms_latest_published_exam_for(uuid) FROM PUBLIC, anon, authenticated;

-- A student's most recent published result, dated when their class was published.
CREATE OR REPLACE FUNCTION public.rms_published_result_for(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eid uuid := public.rms_latest_published_exam_for(p_student_id);
  result jsonb;
  class_published_at timestamptz;
BEGIN
  IF eid IS NULL THEN
    RETURN NULL;
  END IF;
  result := public.build_exam_result(eid, p_student_id);
  IF result IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT published_at INTO class_published_at
  FROM public.exam_class_publications
  WHERE exam_id = eid AND class_level = result -> 'student' ->> 'class_level';
  RETURN jsonb_set(result, '{exam,published_at}', to_jsonb(class_published_at));
END;
$$;

REVOKE ALL ON FUNCTION public.rms_published_result_for(uuid) FROM PUBLIC, anon, authenticated;

-- Returns NULL unless the registration number AND date of birth both match.
-- With both correct but no published result yet, returns {"pending": true}.
CREATE OR REPLACE FUNCTION public.get_public_result(p_registration_no text, p_date_of_birth date)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg text := lower(btrim(coalesce(p_registration_no, '')));
  sid uuid;
  recent_failures integer;
BEGIN
  IF reg = '' OR p_date_of_birth IS NULL THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.result_lookup_attempts WHERE attempted_at < now() - interval '1 day';

  -- At most 5 wrong tries per 15 minutes and 20 per day for one registration number.
  SELECT count(*) INTO recent_failures
  FROM public.result_lookup_attempts
  WHERE registration_no = reg AND attempted_at > now() - interval '15 minutes';
  IF recent_failures >= 5 THEN
    RAISE EXCEPTION 'Too many attempts. Please try again in 15 minutes.';
  END IF;

  SELECT count(*) INTO recent_failures
  FROM public.result_lookup_attempts
  WHERE registration_no = reg;
  IF recent_failures >= 20 THEN
    RAISE EXCEPTION 'Too many attempts for this registration number today. Please contact the madrasa office.';
  END IF;

  SELECT st.id INTO sid
  FROM public.students st
  JOIN public.student_private_details d ON d.student_id = st.id
  WHERE lower(st.registration_no) = reg AND d.date_of_birth = p_date_of_birth;

  IF sid IS NULL THEN
    INSERT INTO public.result_lookup_attempts (registration_no) VALUES (reg);
    RETURN NULL;
  END IF;

  RETURN coalesce(public.rms_published_result_for(sid), jsonb_build_object('pending', true));
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_result(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_result(text, date) TO anon, authenticated;

-- Each child's (or the signed-in student's own) most recent published result.
CREATE OR REPLACE FUNCTION public.get_my_children_results()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(r ORDER BY r -> 'exam' ->> 'published_at' DESC)
    FROM (
      SELECT public.rms_published_result_for(st.id) AS r
      FROM public.students st
      WHERE st.user_id = auth.uid() OR st.student_user_id = auth.uid()
    ) x
    WHERE r IS NOT NULL
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_children_results() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_children_results() TO authenticated;

COMMIT;
