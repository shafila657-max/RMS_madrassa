-- Security fixes: account roles and data privacy
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
-- If the editor warns about "destructive operations", choose "Run without RLS":
-- the only things dropped are the over-permissive policies listed below.
--
-- What it fixes:
--   1. Sign-up could create admin or teacher accounts (the role came from the sign-up form).
--      New accounts are now always parent or student, and always start as "pending".
--   2. Only an approved admin can change anyone's role or approval status.
--   3. Admin / teacher checks now require an approved account.
--   4. Any signed-in account (even pending or rejected) could read every student, fee,
--      attendance, homework and profile row, and anyone could read discipline records.
--      Now: approved staff see everything, parents see only their own children.
--   5. Any signed-in account could edit or delete Programs. Now admin only.
--   6. The leaderboard is served by get_leaderboard(), which returns only names, classes,
--      photos and points. Visitors who are not signed in see the top 3 (the landing page podium).
--
-- To create another admin later: have them register normally, then in the SQL Editor run
--   update public.profiles set role = 'admin', status = 'approved' where email = '...';

BEGIN;

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
    WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
  );
$$;

-- Approved admin or teacher.
CREATE OR REPLACE FUNCTION public.rms_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'teacher') AND status = 'approved'
  );
$$;

-- True for the SQL Editor, the service role and other trusted server-side callers;
-- false for requests from the website (anon / authenticated).
CREATE OR REPLACE FUNCTION public.rms_is_trusted_caller()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.role(), '') NOT IN ('anon', 'authenticated');
$$;

GRANT EXECUTE ON FUNCTION public.rms_is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rms_is_trusted_caller() TO anon, authenticated;

-- The existing is_admin() is used by several policies; make it require approval too.
-- Only replaced when the zero-argument version exists, so no other overload is touched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.pronargs = 0
  ) THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
        );
      $body$;
    $f$;
  END IF;
END $$;

-- ─── 1. New accounts: parent or student only, always pending ────────────────
-- Runs for every new profile, however it is created (sign-up trigger or direct insert).

CREATE OR REPLACE FUNCTION public.profiles_sanitize_new()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NULL OR NEW.role NOT IN ('parent', 'student') THEN
    NEW.role := 'parent';
  END IF;
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sanitize_new_trigger ON public.profiles;
CREATE TRIGGER profiles_sanitize_new_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_sanitize_new();

-- ─── 2. Only approved admins change role / approval status ──────────────────

CREATE OR REPLACE FUNCTION public.profiles_guard_role_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.id IS DISTINCT FROM OLD.id)
     AND NOT (public.rms_is_admin() OR public.rms_is_trusted_caller()) THEN
    RAISE EXCEPTION 'Only an admin can change account roles or approval status.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_status_trigger ON public.profiles;
CREATE TRIGGER profiles_guard_role_status_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_status();

-- ─── 3. Profiles: own profile, or staff ─────────────────────────────────────

DROP POLICY IF EXISTS "anyone_authenticated_read_profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;
CREATE POLICY "Staff read all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.rms_is_staff());

-- Lets members update their own profile (e.g. the alumni flag). Role and status
-- are still protected by the trigger above.
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ─── 4. Student data: staff see all, parents see their own children ─────────

-- students (parents already have "Parents can view their linked student")
DROP POLICY IF EXISTS "Anyone authenticated can view students" ON public.students;
DROP POLICY IF EXISTS "Staff read students" ON public.students;
CREATE POLICY "Staff read students" ON public.students
FOR SELECT TO authenticated
USING (public.rms_is_staff());

-- fees (admins already have full access; parents have "Parents can view fees for their student")
DROP POLICY IF EXISTS "Anyone authenticated view fees" ON public.fees;

-- attendance (staff and parents already have their own policies)
DROP POLICY IF EXISTS "Parents view attendance" ON public.attendance;

-- homework
DROP POLICY IF EXISTS "Authenticated users view student tasks" ON public.student_tasks;
DROP POLICY IF EXISTS "Parents view their children's tasks" ON public.student_tasks;
CREATE POLICY "Parents view their children's tasks" ON public.student_tasks
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- discipline
DROP POLICY IF EXISTS "Anyone view discipline_records" ON public.discipline_records;
DROP POLICY IF EXISTS "Parents view their children's discipline" ON public.discipline_records;
CREATE POLICY "Parents view their children's discipline" ON public.discipline_records
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- ─── 5. Programs: admin only ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admin Full Access Programs" ON public.madrasa_programs;
DROP POLICY IF EXISTS "Admins manage programs" ON public.madrasa_programs;
CREATE POLICY "Admins manage programs" ON public.madrasa_programs
FOR ALL TO authenticated
USING (public.rms_is_admin())
WITH CHECK (public.rms_is_admin());

-- ─── 6. Leaderboard ─────────────────────────────────────────────────────────
-- Same points as src/utils/leaderboard.js (keep the two in sync):
--   1 per present day + 1 per 10 exam marks + 5 per completed task + discipline score,
--   counting only records since the last leaderboard reset.
-- Optional columns are read through to_jsonb() so the function works whichever
-- date columns each table has.

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_at timestamptz;
  full_list boolean;
  result jsonb;
BEGIN
  SELECT (to_jsonb(ls) ->> 'last_reset_at')::timestamptz INTO reset_at
  FROM public.leaderboard_settings ls
  LIMIT 1;

  -- Approved members see the full list; everyone else sees the podium.
  full_list := EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved'
  );

  WITH att AS (
    SELECT a.student_id, count(*) AS n
    FROM public.attendance a
    WHERE a.status = 'present'
      AND (reset_at IS NULL OR coalesce(
            (to_jsonb(a) ->> 'date')::timestamptz,
            (to_jsonb(a) ->> 'created_at')::timestamptz) >= reset_at)
    GROUP BY a.student_id
  ), ex AS (
    SELECT s.student_id, sum(coalesce(s.marks_obtained, 0)) AS marks
    FROM public.scores s
    WHERE reset_at IS NULL OR coalesce(
            (to_jsonb(s) ->> 'date')::timestamptz,
            (to_jsonb(s) ->> 'created_at')::timestamptz) >= reset_at
    GROUP BY s.student_id
  ), tk AS (
    SELECT t.student_id, count(*) AS n
    FROM public.student_tasks t
    WHERE t.status = 'completed'
      AND (reset_at IS NULL OR coalesce(
            (to_jsonb(t) ->> 'due_date')::timestamptz,
            (to_jsonb(t) ->> 'created_at')::timestamptz) >= reset_at)
    GROUP BY t.student_id
  ), dc AS (
    SELECT d.student_id, sum(coalesce(d.score, 0)) AS pts
    FROM public.discipline_records d
    WHERE reset_at IS NULL OR coalesce(
            (to_jsonb(d) ->> 'week_date')::timestamptz,
            (to_jsonb(d) ->> 'created_at')::timestamptz) >= reset_at
    GROUP BY d.student_id
  ), pts AS (
    SELECT
      st.id, st.full_name, st.class_level, st.photo_url, st.status,
      coalesce(att.n, 0) AS present_days,
      coalesce(ex.marks, 0) AS total_exam_marks,
      coalesce(tk.n, 0) AS completed_tasks,
      coalesce(dc.pts, 0) AS discipline_points
    FROM public.students st
    LEFT JOIN att ON att.student_id = st.id
    LEFT JOIN ex ON ex.student_id = st.id
    LEFT JOIN tk ON tk.student_id = st.id
    LEFT JOIN dc ON dc.student_id = st.id
  ), ranked AS (
    SELECT
      pts.*,
      present_days
        + floor(total_exam_marks / 10)
        + completed_tasks * 5
        + discipline_points AS total_points,
      row_number() OVER (
        ORDER BY present_days + floor(total_exam_marks / 10) + completed_tasks * 5 + discipline_points DESC,
                 full_name
      ) AS rank
    FROM pts
  )
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.rank), '[]'::jsonb)
  INTO result
  FROM ranked r
  WHERE full_list OR r.rank <= 3;

  RETURN jsonb_build_object('reset_at', reset_at, 'standings', result);
END;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon, authenticated;

COMMIT;
