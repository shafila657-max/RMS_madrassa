-- Users: admins create logins and manage accounts from the app
-- Run this script in your Supabase Dashboard -> SQL Editor. It is safe to run more than once.
-- If the editor warns about "destructive operations", choose "Run without RLS":
-- nothing is dropped except older versions of the functions below.
-- Needs supabase_security_fixes.sql (it uses rms_is_admin).
--
-- Adds the functions behind the admin "Users" page (profile menu -> Users):
--   admin_list_users()                 every account with its role, status and last sign-in
--   admin_create_user(...)             a ready-to-use admin or teacher login (no confirmation
--                                      email needed; they can sign in straight away)
--   admin_update_user(...)             change someone's name, phone, role or access
--   admin_set_user_password(...)       set a new password for someone who forgot theirs
-- Only approved admins can use them.
--
-- Safety rule, enforced for every change however it is made: there is always at least one
-- approved admin, so nobody can lock everyone out of the admin dashboard.

BEGIN;

-- ─── Always keep one approved admin ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.profiles_keep_one_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin' AND OLD.status = 'approved'
     AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM 'admin' OR NEW.status IS DISTINCT FROM 'approved')
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE role = 'admin' AND status = 'approved' AND id <> OLD.id
     ) THEN
    RAISE EXCEPTION 'This is the only admin account. Make someone else an admin first.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS profiles_keep_one_admin_trigger ON public.profiles;
CREATE TRIGGER profiles_keep_one_admin_trigger
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_keep_one_admin();

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rms_require_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.rms_is_admin() THEN
    RAISE EXCEPTION 'Only an admin can manage user accounts.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rms_require_admin() FROM PUBLIC, anon, authenticated;

-- Sets profiles.<column> only when that column exists (not every copy of the app has phone).
CREATE OR REPLACE FUNCTION public.rms_set_profile_text(p_user uuid, p_column text, p_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = p_column
  ) THEN
    EXECUTE format('UPDATE public.profiles SET %I = $1 WHERE id = $2', p_column)
    USING p_value, p_user;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rms_set_profile_text(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- ─── List every account ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rms_require_admin();
  RETURN QUERY
    SELECT to_jsonb(p)
      || jsonb_build_object(
           'email', coalesce(nullif(to_jsonb(p) ->> 'email', ''), u.email),
           'last_sign_in_at', u.last_sign_in_at,
           'has_login', u.id IS NOT NULL
         )
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ─── Create a login (admin or teacher) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_name text := btrim(coalesce(p_full_name, ''));
  v_id uuid := gen_random_uuid();
BEGIN
  PERFORM public.rms_require_admin();

  IF p_role NOT IN ('admin', 'teacher') THEN
    RAISE EXCEPTION 'New users can be an admin or a teacher.';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Enter the person''s name.';
  END IF;
  IF length(coalesce(p_password, '')) < 8 THEN
    RAISE EXCEPTION 'The password must be at least 8 characters.';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'An account with this email already exists. Find it in the list and change its role instead.';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_name, 'phone', nullif(btrim(coalesce(p_phone, '')), ''), 'email_verified', true),
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- The sign-up trigger normally creates the profile (as a pending parent); make sure it exists.
  INSERT INTO public.profiles (id, full_name) VALUES (v_id, v_name)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles SET full_name = v_name, role = p_role, status = 'approved' WHERE id = v_id;
  PERFORM public.rms_set_profile_text(v_id, 'email', v_email);
  PERFORM public.rms_set_profile_text(v_id, 'phone', nullif(btrim(coalesce(p_phone, '')), ''));

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text) TO authenticated;

-- ─── Change name, phone, role or access ─────────────────────────────────────
-- Pass NULL for anything that should stay as it is.

CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rms_require_admin();

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'That account no longer exists.';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('admin', 'teacher', 'parent', 'student') THEN
    RAISE EXCEPTION 'Unknown role: %', p_role;
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('approved', 'pending', 'rejected') THEN
    RAISE EXCEPTION 'Unknown status: %', p_status;
  END IF;
  IF p_user = auth.uid()
     AND ((p_role IS NOT NULL AND p_role <> 'admin') OR (p_status IS NOT NULL AND p_status <> 'approved')) THEN
    RAISE EXCEPTION 'You cannot remove your own admin access. Ask another admin to do it.';
  END IF;

  UPDATE public.profiles SET
    full_name = coalesce(nullif(btrim(p_full_name), ''), full_name),
    role = coalesce(p_role, role),
    status = coalesce(p_status, status)
  WHERE id = p_user;

  IF p_phone IS NOT NULL THEN
    PERFORM public.rms_set_profile_text(p_user, 'phone', nullif(btrim(p_phone), ''));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text, text, text) TO authenticated;

-- ─── Set a new password for someone ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_set_user_password(p_user uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  PERFORM public.rms_require_admin();
  IF length(coalesce(p_password, '')) < 8 THEN
    RAISE EXCEPTION 'The password must be at least 8 characters.';
  END IF;
  UPDATE auth.users
  SET encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = p_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This account has no login to set a password for.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ─── Report: the admin accounts after this script ───────────────────────────
SELECT p.full_name AS admin, u.email, p.status
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin'
ORDER BY 1;
