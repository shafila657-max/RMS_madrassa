-- Public pages: privacy and upload fixes
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
-- If the editor warns about "destructive operations", choose "Run without RLS":
-- the only things dropped are the over-permissive rules listed below.
-- Needs supabase_security_fixes.sql (it uses rms_is_admin / rms_is_staff).
--
-- What it fixes:
--   1. Alumni contact details (phone, WhatsApp, email) were readable by anyone. The full
--      directory is now for approved members only; the landing page gets names, fields,
--      years and photos through get_alumni_showcase().
--   2. Anyone could submit an alumni profile already marked "approved". Sign-ups are now
--      always "pending"; admins can still add approved alumni.
--   3. Event RSVPs (names, phones, emails) were readable by anyone. Now admin only.
--   4. Teacher phone numbers and emails were readable by anyone. Now approved members only.
--   5. A parent could file a leave request that was already "approved". Now always pending.
--   6. Storage: anyone could replace or delete alumni photos and upload program images.
--      Uploads are now: alumni photos by anyone (for sign-up), gallery by staff, program
--      images by admins; changing or deleting images is staff only. Images only, size-limited.
--   7. get_public_stats() gives the landing page real student and alumni counts.

BEGIN;

-- ─── Helper ─────────────────────────────────────────────────────────────────

-- An approved account, or an approved alumni profile linked to this login.
CREATE OR REPLACE FUNCTION public.rms_is_approved_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
    OR EXISTS (SELECT 1 FROM public.alumni_profiles WHERE user_id = auth.uid() AND status = 'approved')
  );
$$;

GRANT EXECUTE ON FUNCTION public.rms_is_approved_member() TO anon, authenticated;

-- ─── 1 & 2. Alumni profiles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Public view approved alumni" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow public read approved alumni" ON public.alumni_profiles;

DROP POLICY IF EXISTS "Members view approved alumni" ON public.alumni_profiles;
CREATE POLICY "Members view approved alumni" ON public.alumni_profiles
FOR SELECT TO authenticated
USING (status = 'approved' AND public.rms_is_approved_member());

-- So a pending alumnus can see the status of their own registration.
DROP POLICY IF EXISTS "Alumni view own profile" ON public.alumni_profiles;
CREATE POLICY "Alumni view own profile" ON public.alumni_profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can register alumni profile" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow public insert to alumni_profiles" ON public.alumni_profiles;
CREATE POLICY "Anyone can register alumni profile" ON public.alumni_profiles
FOR INSERT TO anon, authenticated
WITH CHECK (
  coalesce(status, 'pending') = 'pending'
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins add alumni" ON public.alumni_profiles;
CREATE POLICY "Admins add alumni" ON public.alumni_profiles
FOR INSERT TO authenticated
WITH CHECK (public.rms_is_admin());

-- Public-safe alumni cards for the landing page: no phone, WhatsApp, email or bio.
CREATE OR REPLACE FUNCTION public.get_alumni_showcase(p_limit integer DEFAULT 4)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT id, full_name, working_area, passout_year, location, photo_url, created_at
    FROM public.alumni_profiles
    WHERE status = 'approved'
    ORDER BY created_at DESC
    LIMIT least(greatest(coalesce(p_limit, 4), 1), 12)
  ) a;
$$;

REVOKE ALL ON FUNCTION public.get_alumni_showcase(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_alumni_showcase(integer) TO anon, authenticated;

-- ─── 3. Event RSVPs ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view RSVPs count" ON public.alumni_rsvps;
DROP POLICY IF EXISTS "Admins view RSVPs" ON public.alumni_rsvps;
CREATE POLICY "Admins view RSVPs" ON public.alumni_rsvps
FOR SELECT TO authenticated
USING (public.rms_is_admin());

-- ─── 4. Teacher contacts ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Public teachers read" ON public.teacher_contacts;
DROP POLICY IF EXISTS "Members read teacher contacts" ON public.teacher_contacts;
CREATE POLICY "Members read teacher contacts" ON public.teacher_contacts
FOR SELECT TO authenticated
USING (public.rms_is_approved_member());

-- ─── 5. Leave requests start as pending ─────────────────────────────────────

DROP POLICY IF EXISTS "Parent leave insert" ON public.leave_applications;
CREATE POLICY "Parent leave insert" ON public.leave_applications
FOR INSERT
WITH CHECK (
  coalesce(status, 'pending') = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = leave_applications.student_id AND students.user_id = auth.uid()
  )
);

-- ─── 6. Storage: site images ────────────────────────────────────────────────

-- Images only, with a size cap. Existing files are not affected.
UPDATE storage.buckets
SET file_size_limit = CASE WHEN id = 'gallery' THEN 10485760 ELSE 5242880 END,  -- 10 MB / 5 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
WHERE id IN ('alumni-photos', 'program-images', 'gallery');

-- Replace every existing rule for these three folders with the set below.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, ''))
          ~ '''(alumni-photos|program-images|gallery)'''
  LOOP
    RAISE NOTICE 'Replacing storage rule: %', pol.policyname;
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public read site images" ON storage.objects
FOR SELECT
USING (bucket_id IN ('alumni-photos', 'program-images', 'gallery'));

-- Guests upload a photo with their alumni registration.
CREATE POLICY "Anyone uploads alumni photos" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'alumni-photos');

CREATE POLICY "Staff upload gallery images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery' AND public.rms_is_staff());

CREATE POLICY "Admins upload program images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'program-images' AND public.rms_is_admin());

CREATE POLICY "Staff change site images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id IN ('alumni-photos', 'program-images', 'gallery') AND public.rms_is_staff())
WITH CHECK (bucket_id IN ('alumni-photos', 'program-images', 'gallery') AND public.rms_is_staff());

CREATE POLICY "Staff delete site images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id IN ('alumni-photos', 'program-images', 'gallery') AND public.rms_is_staff());

-- ─── 7. Landing page counters ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'students', (SELECT count(*) FROM public.students WHERE coalesce(status, 'active') = 'active'),
    'alumni', (SELECT count(*) FROM public.alumni_profiles WHERE status = 'approved')
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

COMMIT;
