-- SQL Script: Ensure Full RLS & CRUD Permissions for alumni_profiles
-- Run this in your Supabase Dashboard -> SQL Editor if delete/update queries fail due to RLS policies.

-- Enable Row Level Security (RLS)
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

-- 1. DROP EXISTING POLICIES (to prevent duplication errors)
DROP POLICY IF EXISTS "Allow public insert to alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow public read approved alumni" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow admins full read on alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow admins update alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow admins delete alumni_profiles" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Allow authenticated full access to alumni_profiles" ON public.alumni_profiles;

-- 2. CREATE POLICIES

-- Allow anyone (public/guests) to submit an alumni registration form
CREATE POLICY "Allow public insert to alumni_profiles"
ON public.alumni_profiles FOR INSERT
WITH CHECK (true);

-- Allow public to view approved alumni (for landing page showcase)
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

-- Allow authenticated admins to UPDATE alumni profiles (Approve, Reject, Toggle Mentor)
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
