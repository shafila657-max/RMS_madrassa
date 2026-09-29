-- Teachers: only their own classes
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
-- If the editor warns about "destructive operations", choose "Run without RLS":
-- the only things dropped are the teacher rules this file replaces.
-- Needs supabase_security_fixes.sql (it uses rms_is_admin).
--
-- Before: any teacher could read every student and change attendance, homework,
-- discipline and leave requests for any class; only the screen hid other classes.
-- After: a teacher reads and changes these only for students in the classes assigned to
-- them in the admin Teachers tab. Admins are unchanged (everything). Parents and students
-- are unchanged (their own records).
--
-- A teacher's classes use the same rule as the app: the class_teachers rows whose
-- teacher_name matches their entry in the Teachers list (found by login email), or
-- failing that their login name. Assignments are read live, so changing a teacher's
-- classes in the Teachers tab takes effect immediately; nothing needs re-running.
--
-- The last statement lists every approved teacher and the classes they now have.
-- A teacher showing "(no classes)" can no longer see any students: assign their
-- classes in the Teachers tab (and check the email there matches their login).

BEGIN;

-- ─── Which classes belong to the signed-in teacher ──────────────────────────

CREATE OR REPLACE FUNCTION public.rms_teacher_classes_for(p_user uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      lower(nullif(btrim(to_jsonb(p) ->> 'email'), '')) AS email,
      p.full_name
    FROM public.profiles p
    WHERE p.id = p_user AND p.role = 'teacher' AND p.status = 'approved'
  ), my_name AS (
    -- The Teachers-list entry with my email; otherwise my login name.
    SELECT coalesce(
      (SELECT tc.full_name
       FROM public.teacher_contacts tc, me
       WHERE me.email IS NOT NULL AND lower(btrim(tc.email)) = me.email
       LIMIT 1),
      (SELECT full_name FROM me)
    ) AS teacher_name
  )
  SELECT DISTINCT ct.class_level
  FROM public.class_teachers ct, my_name
  WHERE my_name.teacher_name IS NOT NULL AND ct.teacher_name = my_name.teacher_name;
$$;

REVOKE ALL ON FUNCTION public.rms_teacher_classes_for(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rms_my_teacher_classes()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.rms_teacher_classes_for(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.rms_my_teacher_classes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rms_my_teacher_classes() TO authenticated;

-- True when the signed-in approved teacher teaches this student's current class.
CREATE OR REPLACE FUNCTION public.rms_teaches_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND s.class_level IN (SELECT public.rms_my_teacher_classes())
  );
$$;

REVOKE ALL ON FUNCTION public.rms_teaches_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rms_teaches_student(uuid) TO authenticated;

-- ─── Students: admins all, teachers their classes ───────────────────────────

DROP POLICY IF EXISTS "Staff read students" ON public.students;
CREATE POLICY "Staff read students" ON public.students
FOR SELECT TO authenticated
USING (public.rms_is_admin() OR class_level IN (SELECT public.rms_my_teacher_classes()));

-- ─── Attendance, homework, discipline, leave: admins all, teachers their classes ─

DROP POLICY IF EXISTS "Teachers and Admins manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff manage attendance" ON public.attendance;
CREATE POLICY "Staff manage attendance" ON public.attendance
FOR ALL TO authenticated
USING (public.rms_is_admin() OR public.rms_teaches_student(student_id))
WITH CHECK (public.rms_is_admin() OR public.rms_teaches_student(student_id));

DROP POLICY IF EXISTS "Teachers and Admins manage student tasks" ON public.student_tasks;
DROP POLICY IF EXISTS "Admins full access to student tasks" ON public.student_tasks;
DROP POLICY IF EXISTS "Staff manage student tasks" ON public.student_tasks;
CREATE POLICY "Staff manage student tasks" ON public.student_tasks
FOR ALL TO authenticated
USING (public.rms_is_admin() OR public.rms_teaches_student(student_id))
WITH CHECK (public.rms_is_admin() OR public.rms_teaches_student(student_id));

DROP POLICY IF EXISTS "Admins and teachers manage discipline_records" ON public.discipline_records;
DROP POLICY IF EXISTS "Staff manage discipline records" ON public.discipline_records;
CREATE POLICY "Staff manage discipline records" ON public.discipline_records
FOR ALL TO authenticated
USING (public.rms_is_admin() OR public.rms_teaches_student(student_id))
WITH CHECK (public.rms_is_admin() OR public.rms_teaches_student(student_id));

DROP POLICY IF EXISTS "Teachers and Admins manage leaves" ON public.leave_applications;
DROP POLICY IF EXISTS "Staff manage leaves" ON public.leave_applications;
CREATE POLICY "Staff manage leaves" ON public.leave_applications
FOR ALL TO authenticated
USING (public.rms_is_admin() OR public.rms_teaches_student(student_id))
WITH CHECK (public.rms_is_admin() OR public.rms_teaches_student(student_id));

-- ─── Announcements: teachers post to their own classes, delete only their own ─

DROP POLICY IF EXISTS "Admins and teachers can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff post announcements" ON public.announcements;
CREATE POLICY "Staff post announcements" ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (
  public.rms_is_admin()
  OR target_class IN (SELECT public.rms_my_teacher_classes())
);

DROP POLICY IF EXISTS "Admins and teachers can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Staff delete announcements" ON public.announcements;
CREATE POLICY "Staff delete announcements" ON public.announcements
FOR DELETE TO authenticated
USING (
  public.rms_is_admin()
  OR (created_by = auth.uid() AND target_class IN (SELECT public.rms_my_teacher_classes()))
);

COMMIT;

-- ─── Report: each approved teacher and the classes they can now reach ───────
SELECT
  p.full_name AS teacher,
  coalesce(
    (SELECT string_agg(c, ', ' ORDER BY c) FROM public.rms_teacher_classes_for(p.id) AS c),
    '(no classes)'
  ) AS classes
FROM public.profiles p
WHERE p.role = 'teacher' AND p.status = 'approved'
ORDER BY 1;
