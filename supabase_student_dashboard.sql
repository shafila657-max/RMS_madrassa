-- Student dashboard
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
--
-- Lets a student account see its own dashboard:
--   1. students.student_user_id links a student record to that student's login account.
--      Only admins can set it (students table writes are admin-only).
--   2. A linked student can read their own record, attendance, scores, homework, awards
--      and discipline. Nothing about other students, and no fees.
--   3. get_my_children_results() also returns the student's own published exam result.

BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- One login account belongs to at most one student.
CREATE UNIQUE INDEX IF NOT EXISTS students_student_user_id_unique
  ON public.students (student_user_id)
  WHERE student_user_id IS NOT NULL;

-- Student ids that belong to the signed-in student account.
CREATE OR REPLACE FUNCTION public.rms_my_student_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students WHERE student_user_id = auth.uid() AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.rms_my_student_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rms_my_student_ids() TO authenticated;

DROP POLICY IF EXISTS "Students view their own record" ON public.students;
CREATE POLICY "Students view their own record" ON public.students
FOR SELECT TO authenticated
USING (student_user_id = auth.uid());

DROP POLICY IF EXISTS "Students view their own attendance" ON public.attendance;
CREATE POLICY "Students view their own attendance" ON public.attendance
FOR SELECT TO authenticated
USING (student_id IN (SELECT public.rms_my_student_ids()));

DROP POLICY IF EXISTS "Students view their own scores" ON public.scores;
CREATE POLICY "Students view their own scores" ON public.scores
FOR SELECT TO authenticated
USING (student_id IN (SELECT public.rms_my_student_ids()));

DROP POLICY IF EXISTS "Students view their own tasks" ON public.student_tasks;
CREATE POLICY "Students view their own tasks" ON public.student_tasks
FOR SELECT TO authenticated
USING (student_id IN (SELECT public.rms_my_student_ids()));

DROP POLICY IF EXISTS "Students view their own achievements" ON public.achievements;
CREATE POLICY "Students view their own achievements" ON public.achievements
FOR SELECT TO authenticated
USING (student_id IN (SELECT public.rms_my_student_ids()));

DROP POLICY IF EXISTS "Students view their own discipline" ON public.discipline_records;
CREATE POLICY "Students view their own discipline" ON public.discipline_records
FOR SELECT TO authenticated
USING (student_id IN (SELECT public.rms_my_student_ids()));

-- Latest published result for the parent's children, or for the signed-in student.
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
      WHERE st.user_id = auth.uid() OR st.student_user_id = auth.uid()
      ORDER BY st.full_name
    ) x
    WHERE r IS NOT NULL
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_children_results() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_children_results() TO authenticated;

COMMIT;
