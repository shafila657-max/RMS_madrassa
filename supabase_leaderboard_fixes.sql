-- Leaderboard fixes
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
-- Needs supabase_security_fixes.sql (this replaces its get_leaderboard function).
--
-- Change: graduated and dropped-out students no longer appear in the rankings or on the podium.
-- Their attendance, marks and discipline records are kept.
-- Points (unchanged): 1 per present day + 1 per 10 exam marks + 5 per completed homework
-- + weekly discipline score, counting records since the last leaderboard reset.

BEGIN;

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
    -- Graduated and dropped-out students keep their records but leave the rankings.
    WHERE coalesce(st.status, 'active') = 'active'
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
