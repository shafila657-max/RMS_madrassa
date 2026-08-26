-- SQL Script: Ensure Full RLS, Table Columns & Storage Permissions for alumni_profiles
-- Run this script in your Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard)

-- 1. ENSURE COLUMN EXISTS
ALTER TABLE public.alumni_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING TABLE POLICIES (to prevent duplication errors)
DROP POLICY IF EXISTS "Allow public insert to alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow public read approved alumni" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow admins full read on alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow admins update alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow admins delete alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow authenticated full access to alumni_profiles" ON public.alumni_profiles;

-- 4. CREATE TABLE POLICIES

-- Allow anyone (public/guests) to submit an alumni registration form
CREATE POLICY "Allow public insert to alumni_profiles"
ON public.alumni_profiles FOR INSERT
WITH CHECK (true);

-- Allow public to view approved alumni (for landing page showcase & directory)
CREATE POLICY "Allow public read approved alumni"
ON public.alumni_profiles FOR SELECT
USING (status = 'approved');

-- Allow authenticated users with 'admin' role to read ALL alumni profiles (pending, approved, rejected)
CREATE POLICY "Allow admins full read on alumni_profiles"
ON public.alumni_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow authenticated admins to UPDATE alumni profiles (Edit details, Approve, Reject, Toggle Mentor)
CREATE POLICY "Allow admins update alumni_profiles"
ON public.alumni_profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow authenticated admins to DELETE alumni profiles permanently
CREATE POLICY "Allow admins delete alumni_profiles"
ON public.alumni_profiles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 5. CREATE & CONFIGURE PUBLIC STORAGE BUCKET FOR ALUMNI PHOTOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('alumni-photos', 'alumni-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for alumni-photos bucket
DROP POLICY IF EXISTS "Public Read Alumni Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Alumni Photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Modify Alumni Photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Alumni Photos" ON storage.objects;

CREATE POLICY "Public Read Alumni Photos" ON storage.objects
FOR SELECT USING (bucket_id = 'alumni-photos');

CREATE POLICY "Public Upload Alumni Photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'alumni-photos');

CREATE POLICY "Admin Modify Alumni Photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'alumni-photos');

CREATE POLICY "Admin Delete Alumni Photos" ON storage.objects
FOR DELETE USING (bucket_id = 'alumni-photos');

