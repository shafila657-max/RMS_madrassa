-- Exam Results Publishing
-- Run this script in your Supabase Dashboard -> SQL Editor before using the Results tab.
-- It is safe to run more than once.
--
-- What it adds:
--   1. Registration numbers on students (auto-generated from an admin-defined format, editable).
--   2. Date of birth in a separate admin-only table. The students table is readable by the
--      public landing page (leaderboard), so DOB must NOT live there.
--   3. exams / exam_subjects / exam_marks tables (admin only).
--   4. publish_exam / unpublish_exam, which also copy marks into `scores` so the leaderboard
--      and parent dashboard pick them up.
--   5. Public lookup functions: the public never reads the tables directly, only one result
--      at a time, when both the registration number and date of birth match.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rms_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;

-- ─── 1. Registration number format (single settings row) ────────────────────

CREATE TABLE IF NOT EXISTS public.registration_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  prefix text NOT NULL DEFAULT 'RMS',
  separator text NOT NULL DEFAULT '-',
  include_year boolean NOT NULL DEFAULT true,
  digits smallint NOT NULL DEFAULT 4 CHECK (digits BETWEEN 1 AND 10),
  next_number integer NOT NULL DEFAULT 1 CHECK (next_number >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.registration_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.registration_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage registration settings" ON public.registration_settings;
CREATE POLICY "Admins manage registration settings"
ON public.registration_settings FOR ALL
TO authenticated
USING (public.rms_is_admin())
WITH CHECK (public.rms_is_admin());

-- Formats registration number `n` using the saved settings, e.g. RMS-2026-0001.
CREATE OR REPLACE FUNCTION public.format_registration_no(cfg public.registration_settings, n integer)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT concat_ws(
    cfg.separator,
    NULLIF(btrim(cfg.prefix), ''),
    CASE WHEN cfg.include_year THEN to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY') END,
    lpad(n::text, cfg.digits, '0')
  );
$$;

-- Returns the next free registration number and advances the counter.
-- Only called from the students trigger, never directly by clients.
CREATE OR REPLACE FUNCTION public.next_registration_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.registration_settings%ROWTYPE;
  candidate text;
  n integer;
BEGIN
  SELECT * INTO cfg FROM public.registration_settings WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.registration_settings (id) VALUES (1) RETURNING * INTO cfg;
  END IF;

  n := cfg.next_number;
  LOOP
    candidate := public.format_registration_no(cfg, n);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.students WHERE lower(registration_no) = lower(candidate)
    );
    n := n + 1;
  END LOOP;

  UPDATE public.registration_settings SET next_number = n + 1, updated_at = now() WHERE id = 1;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.next_registration_no() FROM PUBLIC, anon, authenticated;

-- Preview of the next number without using it up (for the admin settings screen).
CREATE OR REPLACE FUNCTION public.preview_registration_no()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.registration_settings%ROWTYPE;
BEGIN
  IF NOT public.rms_is_admin() THEN
    RAISE EXCEPTION 'Only admins can view registration settings';
  END IF;
  SELECT * INTO cfg FROM public.registration_settings WHERE id = 1;
  RETURN public.format_registration_no(cfg, cfg.next_number);
END;
$$;

REVOKE ALL ON FUNCTION public.preview_registration_no() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_registration_no() TO authenticated;

-- ─── 2. Registration number on students ─────────────────────────────────────

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS registration_no text;

-- Fill a registration number automatically when none is given, and tidy spacing.
CREATE OR REPLACE FUNCTION public.students_set_registration_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.registration_no := NULLIF(btrim(NEW.registration_no), '');
  IF NEW.registration_no IS NULL THEN
    NEW.registration_no := public.next_registration_no();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_registration_no_trigger ON public.students;
CREATE TRIGGER students_registration_no_trigger
  BEFORE INSERT OR UPDATE OF registration_no ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.students_set_registration_no();

-- Backfill existing students, oldest first.
DO $$
DECLARE
  r record;
  order_by text := 'full_name';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'created_at'
  ) THEN
    order_by := 'created_at NULLS LAST, full_name';
  END IF;

  FOR r IN EXECUTE format(
    'SELECT id FROM public.students
     WHERE registration_no IS NULL OR btrim(registration_no) = %L
     ORDER BY %s', '', order_by)
  LOOP
    UPDATE public.students SET registration_no = public.next_registration_no() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.students ALTER COLUMN registration_no SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS students_registration_no_unique
  ON public.students (lower(registration_no));

-- ─── 3. Date of birth (admin only, never on the public students table) ─────

CREATE TABLE IF NOT EXISTS public.student_private_details (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  date_of_birth date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_private_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage student private details" ON public.student_private_details;
CREATE POLICY "Admins manage student private details"
ON public.student_private_details FOR ALL
TO authenticated
USING (public.rms_is_admin())
WITH CHECK (public.rms_is_admin());

-- ─── 4. Exams ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  academic_year text,
  exam_date date,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  grading_enabled boolean NOT NULL DEFAULT false,
  -- Ordered highest first: [{"min": 90, "grade": "A+"}, ...]
  grade_scale jsonb NOT NULL DEFAULT '[
    {"min": 90, "grade": "A+"},
    {"min": 80, "grade": "A"},
    {"min": 70, "grade": "B+"},
    {"min": 60, "grade": "B"},
    {"min": 50, "grade": "C"},
    {"min": 40, "grade": "D"},
    {"min": 0,  "grade": "E"}
  ]'::jsonb,
  show_rank boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  class_level text NOT NULL,
  subject_name text NOT NULL CHECK (btrim(subject_name) <> ''),
  max_marks numeric(6,2) NOT NULL CHECK (max_marks > 0),
  pass_marks numeric(6,2) NOT NULL DEFAULT 0 CHECK (pass_marks >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_subjects_pass_le_max CHECK (pass_marks <= max_marks),
  CONSTRAINT exam_subjects_unique UNIQUE (exam_id, class_level, subject_name)
);

CREATE INDEX IF NOT EXISTS exam_subjects_exam_class_idx ON public.exam_subjects (exam_id, class_level);

CREATE TABLE IF NOT EXISTS public.exam_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_subject_id uuid NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained numeric(6,2) CHECK (marks_obtained IS NULL OR marks_obtained >= 0),
  is_absent boolean NOT NULL DEFAULT false,
  remarks text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_marks_unique UNIQUE (exam_subject_id, student_id),
  CONSTRAINT exam_marks_value_or_absent CHECK (is_absent OR marks_obtained IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS exam_marks_student_idx ON public.exam_marks (student_id);

-- Marks may not exceed the subject maximum.
CREATE OR REPLACE FUNCTION public.exam_marks_check_max()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  subject_max numeric;
BEGIN
  IF NEW.is_absent THEN
    NEW.marks_obtained := NULL;
    RETURN NEW;
  END IF;
  SELECT max_marks INTO subject_max FROM public.exam_subjects WHERE id = NEW.exam_subject_id;
  IF NEW.marks_obtained > subject_max THEN
    RAISE EXCEPTION 'Marks % exceed the maximum of % for this subject', NEW.marks_obtained, subject_max;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exam_marks_check_max_trigger ON public.exam_marks;
CREATE TRIGGER exam_marks_check_max_trigger
  BEFORE INSERT OR UPDATE ON public.exam_marks
  FOR EACH ROW
  EXECUTE FUNCTION public.exam_marks_check_max();

-- Lowering a subject's maximum below marks already entered is not allowed.
CREATE OR REPLACE FUNCTION public.exam_subjects_check_max()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.exam_marks
    WHERE exam_subject_id = NEW.id AND marks_obtained > NEW.max_marks
  ) THEN
    RAISE EXCEPTION '%: some students already have more than % marks. Correct those marks first.',
      NEW.subject_name, NEW.max_marks;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exam_subjects_check_max_trigger ON public.exam_subjects;
CREATE TRIGGER exam_subjects_check_max_trigger
  BEFORE UPDATE OF max_marks ON public.exam_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.exam_subjects_check_max();

-- Published exams are locked: unpublish first to change subjects or marks.
-- Deletes that cascade from a deleted student or a deleted draft exam are still allowed.
CREATE OR REPLACE FUNCTION public.exam_lock_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_exam uuid;
  exam_status text;
BEGIN
  IF TG_TABLE_NAME = 'exam_subjects' THEN
    target_exam := coalesce(NEW.exam_id, OLD.exam_id);
  ELSE
    SELECT exam_id INTO target_exam
    FROM public.exam_subjects
    WHERE id = coalesce(NEW.exam_subject_id, OLD.exam_subject_id);
  END IF;

  SELECT status INTO exam_status FROM public.exams WHERE id = target_exam;

  -- A mark removed because its student was deleted is allowed through.
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'exam_marks' THEN
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = OLD.student_id) THEN
      RETURN OLD;
    END IF;
  END IF;

  IF exam_status = 'published' THEN
    RAISE EXCEPTION 'This exam is published. Unpublish it before changing subjects or marks.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exam_subjects_lock_trigger ON public.exam_subjects;
CREATE TRIGGER exam_subjects_lock_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.exam_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.exam_lock_published();

DROP TRIGGER IF EXISTS exam_marks_lock_trigger ON public.exam_marks;
CREATE TRIGGER exam_marks_lock_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.exam_marks
  FOR EACH ROW
  EXECUTE FUNCTION public.exam_lock_published();

-- A published exam cannot be deleted, and status only changes through publish/unpublish.
CREATE OR REPLACE FUNCTION public.exams_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'published' THEN
      RAISE EXCEPTION 'Unpublish this exam before deleting it.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'draft';
    NEW.published_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND coalesce(current_setting('rms.exam_status_change', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Use Publish / Unpublish to change the exam status.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status = 'published' THEN
    RAISE EXCEPTION 'This exam is published. Unpublish it before editing.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exams_guard_trigger ON public.exams;
CREATE TRIGGER exams_guard_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.exams_guard();

-- Admin-only access to the exam tables. The public uses the functions below.
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage exams" ON public.exams;
CREATE POLICY "Admins manage exams" ON public.exams FOR ALL TO authenticated
USING (public.rms_is_admin()) WITH CHECK (public.rms_is_admin());

DROP POLICY IF EXISTS "Admins manage exam subjects" ON public.exam_subjects;
CREATE POLICY "Admins manage exam subjects" ON public.exam_subjects FOR ALL TO authenticated
USING (public.rms_is_admin()) WITH CHECK (public.rms_is_admin());

DROP POLICY IF EXISTS "Admins manage exam marks" ON public.exam_marks;
CREATE POLICY "Admins manage exam marks" ON public.exam_marks FOR ALL TO authenticated
USING (public.rms_is_admin()) WITH CHECK (public.rms_is_admin());

-- ─── 5. Link to the existing scores table (leaderboard + parent dashboard) ──

ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS scores_exam_id_idx ON public.scores (exam_id);

CREATE OR REPLACE FUNCTION public.publish_exam(p_exam_id uuid)
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
  IF ex.status = 'published' THEN
    RAISE EXCEPTION 'This exam is already published';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exam_marks m
    JOIN public.exam_subjects s ON s.id = m.exam_subject_id
    WHERE s.exam_id = p_exam_id
  ) THEN
    RAISE EXCEPTION 'Enter some marks before publishing';
  END IF;

  PERFORM set_config('rms.exam_status_change', 'on', true);
  UPDATE public.exams SET status = 'published', published_at = now() WHERE id = p_exam_id;
  PERFORM set_config('rms.exam_status_change', 'off', true);

  -- Mirror marks into scores so leaderboard points and parent averages update.
  DELETE FROM public.scores WHERE exam_id = p_exam_id;
  INSERT INTO public.scores (student_id, exam_title, subject, marks_obtained, total_marks, exam_id)
  SELECT m.student_id, ex.name, s.subject_name, m.marks_obtained, s.max_marks, p_exam_id
  FROM public.exam_marks m
  JOIN public.exam_subjects s ON s.id = m.exam_subject_id
  WHERE s.exam_id = p_exam_id AND NOT m.is_absent AND m.marks_obtained IS NOT NULL;

  -- Older installs keep an optional `date` column on scores; fill it when present.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'date'
  ) THEN
    EXECUTE 'UPDATE public.scores SET date = $1 WHERE exam_id = $2'
    USING coalesce(ex.exam_date, (now() AT TIME ZONE 'Asia/Kolkata')::date), p_exam_id;
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

  PERFORM set_config('rms.exam_status_change', 'on', true);
  UPDATE public.exams SET status = 'draft', published_at = NULL WHERE id = p_exam_id;
  PERFORM set_config('rms.exam_status_change', 'off', true);

  DELETE FROM public.scores WHERE exam_id = p_exam_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_exam(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unpublish_exam(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_exam(uuid) TO authenticated;

-- ─── 6. Building one student's result ───────────────────────────────────────

-- Internal: not callable by the public directly.
CREATE OR REPLACE FUNCTION public.build_exam_result(p_exam_id uuid, p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ex public.exams%ROWTYPE;
  st public.students%ROWTYPE;
  result_class text;
  subjects jsonb;
  total_obtained numeric;
  total_max numeric;
  subject_count integer;
  entered_count integer;
  failed_count integer;
  pct numeric;
  grade_label text;
  student_rank integer;
  class_size integer;
BEGIN
  SELECT * INTO ex FROM public.exams WHERE id = p_exam_id;
  SELECT * INTO st FROM public.students WHERE id = p_student_id;
  IF ex.id IS NULL OR st.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- The class the student sat this exam in (they may have moved up since).
  SELECT s.class_level INTO result_class
  FROM public.exam_marks m
  JOIN public.exam_subjects s ON s.id = m.exam_subject_id
  WHERE s.exam_id = p_exam_id AND m.student_id = p_student_id
  LIMIT 1;

  IF result_class IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    jsonb_agg(jsonb_build_object(
      'subject', s.subject_name,
      'max_marks', s.max_marks,
      'pass_marks', s.pass_marks,
      'marks_obtained', m.marks_obtained,
      'is_absent', coalesce(m.is_absent, false),
      'entered', m.id IS NOT NULL,
      'passed', m.id IS NOT NULL AND NOT m.is_absent AND m.marks_obtained >= s.pass_marks
    ) ORDER BY s.sort_order, s.subject_name),
    coalesce(sum(m.marks_obtained), 0),
    sum(s.max_marks),
    count(*),
    count(m.id),
    count(*) FILTER (WHERE m.id IS NULL OR m.is_absent OR m.marks_obtained < s.pass_marks)
  INTO subjects, total_obtained, total_max, subject_count, entered_count, failed_count
  FROM public.exam_subjects s
  LEFT JOIN public.exam_marks m ON m.exam_subject_id = s.id AND m.student_id = p_student_id
  WHERE s.exam_id = p_exam_id AND s.class_level = result_class;

  pct := CASE WHEN total_max > 0 THEN round(total_obtained * 100 / total_max, 2) ELSE 0 END;

  IF ex.grading_enabled THEN
    SELECT g->>'grade' INTO grade_label
    FROM jsonb_array_elements(ex.grade_scale) g
    WHERE pct >= (g->>'min')::numeric
    ORDER BY (g->>'min')::numeric DESC
    LIMIT 1;
  END IF;

  IF ex.show_rank THEN
    WITH totals AS (
      SELECT m.student_id, sum(coalesce(m.marks_obtained, 0)) AS total
      FROM public.exam_marks m
      JOIN public.exam_subjects s ON s.id = m.exam_subject_id
      WHERE s.exam_id = p_exam_id AND s.class_level = result_class
      GROUP BY m.student_id
    ), ranked AS (
      SELECT student_id, rank() OVER (ORDER BY total DESC) AS r FROM totals
    )
    SELECT r, (SELECT count(*) FROM totals) INTO student_rank, class_size
    FROM ranked WHERE student_id = p_student_id;
  END IF;

  RETURN jsonb_build_object(
    'exam', jsonb_build_object(
      'id', ex.id,
      'name', ex.name,
      'academic_year', ex.academic_year,
      'exam_date', ex.exam_date,
      'published_at', ex.published_at,
      'status', ex.status,
      'grading_enabled', ex.grading_enabled,
      'show_rank', ex.show_rank
    ),
    'student', jsonb_build_object(
      'id', st.id,
      'full_name', st.full_name,
      'registration_no', st.registration_no,
      'class_level', result_class,
      'photo_url', st.photo_url
    ),
    'subjects', subjects,
    'total_obtained', total_obtained,
    'total_max', total_max,
    'percentage', pct,
    'grade', grade_label,
    'all_passed', failed_count = 0,
    'failed_count', failed_count,
    'subject_count', subject_count,
    'entered_count', entered_count,
    'rank', student_rank,
    'class_size', class_size
  );
END;
$$;

REVOKE ALL ON FUNCTION public.build_exam_result(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ─── 7. Public functions ────────────────────────────────────────────────────

-- The latest published exam (or NULL). Drives the landing page section.
CREATE OR REPLACE FUNCTION public.get_latest_published_exam()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'academic_year', academic_year,
    'exam_date', exam_date,
    'published_at', published_at
  )
  FROM public.exams
  WHERE status = 'published'
  ORDER BY published_at DESC NULLS LAST
  LIMIT 1;
$$;

-- Failed lookups are logged so nobody can guess dates of birth by brute force.
CREATE TABLE IF NOT EXISTS public.result_lookup_attempts (
  id bigserial PRIMARY KEY,
  registration_no text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS result_lookup_attempts_reg_idx
  ON public.result_lookup_attempts (registration_no, attempted_at);
ALTER TABLE public.result_lookup_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: only the SECURITY DEFINER function below can touch it.

-- One student's result for the latest published exam.
-- Returns NULL unless the registration number AND date of birth both match.
CREATE OR REPLACE FUNCTION public.get_public_result(p_registration_no text, p_date_of_birth date)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg text := lower(btrim(coalesce(p_registration_no, '')));
  latest_exam uuid;
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

  SELECT id INTO latest_exam
  FROM public.exams
  WHERE status = 'published'
  ORDER BY published_at DESC NULLS LAST
  LIMIT 1;

  SELECT st.id INTO sid
  FROM public.students st
  JOIN public.student_private_details d ON d.student_id = st.id
  WHERE lower(st.registration_no) = reg AND d.date_of_birth = p_date_of_birth;

  IF latest_exam IS NULL OR sid IS NULL THEN
    INSERT INTO public.result_lookup_attempts (registration_no) VALUES (reg);
    RETURN NULL;
  END IF;

  RETURN public.build_exam_result(latest_exam, sid);
END;
$$;

REVOKE ALL ON FUNCTION public.get_latest_published_exam() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_result(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_latest_published_exam() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_result(text, date) TO anon, authenticated;

-- Latest published result for each child of the signed-in parent.
CREATE OR REPLACE FUNCTION public.get_my_children_results()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest_exam uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT id INTO latest_exam
  FROM public.exams
  WHERE status = 'published'
  ORDER BY published_at DESC NULLS LAST
  LIMIT 1;

  IF latest_exam IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(r)
    FROM (
      SELECT public.build_exam_result(latest_exam, st.id) AS r
      FROM public.students st
      WHERE st.user_id = auth.uid()
      ORDER BY st.full_name
    ) x
    WHERE r IS NOT NULL
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_children_results() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_children_results() TO authenticated;

-- Admin preview of any student's result, including drafts.
CREATE OR REPLACE FUNCTION public.admin_preview_result(p_exam_id uuid, p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.rms_is_admin() THEN
    RAISE EXCEPTION 'Only admins can preview results';
  END IF;
  RETURN public.build_exam_result(p_exam_id, p_student_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_preview_result(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_preview_result(uuid, uuid) TO authenticated;
