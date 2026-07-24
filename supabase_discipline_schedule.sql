-- Discipline scoring schedule
-- Run this migration in Supabase before using the new Leaderboard setting.

ALTER TABLE public.leaderboard_settings
  ADD COLUMN IF NOT EXISTS discipline_day_of_week smallint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leaderboard_settings_discipline_day_of_week_check'
  ) THEN
    ALTER TABLE public.leaderboard_settings
      ADD CONSTRAINT leaderboard_settings_discipline_day_of_week_check
      CHECK (discipline_day_of_week BETWEEN 0 AND 6);
  END IF;
END $$;

INSERT INTO public.leaderboard_settings (id, discipline_day_of_week)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_discipline_scoring_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
  permitted_day smallint;
BEGIN
  SELECT role INTO actor_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Admins may correct or enter scores at any time.
  IF actor_role = 'teacher' THEN
    SELECT discipline_day_of_week INTO permitted_day
    FROM public.leaderboard_settings
    WHERE id = 1;

    -- The application uses India time for the school's operating day.
    IF permitted_day IS NULL
       OR EXTRACT(DOW FROM (now() AT TIME ZONE 'Asia/Kolkata'))::smallint <> permitted_day THEN
      RAISE EXCEPTION 'Discipline scoring is available only on the configured scoring day';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discipline_records_scoring_day_trigger ON public.discipline_records;

CREATE TRIGGER discipline_records_scoring_day_trigger
  BEFORE INSERT OR UPDATE ON public.discipline_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_discipline_scoring_day();

