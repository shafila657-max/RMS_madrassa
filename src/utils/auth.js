import { supabase } from '@/lib/supabase';

// ─── Auth Actions ─────────────────────────────────────────────────────────────

export const register = async ({ email, password, full_name, phone, role }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone, role: role || 'parent' },
    },
  });
  if (error) {
    console.error('Supabase signup error:', error);
    if (error.message?.includes('Password should be')) {
      throw new Error(`Password is too weak: ${error.message}`);
    }
    if (error.status === 422) {
      throw new Error(`Registration failed (422): ${error.message}. Check Supabase auth settings.`);
    }
    throw error;
  }
  return data;
};

export const login = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Provide clear messages for common Supabase auth errors
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }
    if (error.message?.includes('Email not confirmed')) {
      throw new Error('Please confirm your email first, or ask admin to disable email confirmation in Supabase dashboard.');
    }
    throw error;
  }

  // Fetch the profile to check approval status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    await supabase.auth.signOut();
    if (profileError.code === 'PGRST116') {
      throw new Error('Profile not found. Please run the SQL schema in your Supabase dashboard first.');
    }
    if (profileError.message?.includes('relation "profiles" does not exist')) {
      throw new Error('Database not set up yet. Please run supabase_schema.sql in your Supabase SQL Editor.');
    }
    throw new Error(`Profile error: ${profileError.message}`);
  }

  if (profile.status === 'pending' && profile.role !== 'teacher') {
    await supabase.auth.signOut();
    throw new Error('Your account is pending admin approval.');
  }
  if (profile.status === 'rejected') {
    await supabase.auth.signOut();
    throw new Error('Your account has been rejected. Please contact the admin.');
  }

  return { session: data.session, user: data.user, profile };
};

export const logout = async () => {
  await supabase.auth.signOut();
};

// ─── Session Helpers ──────────────────────────────────────────────────────────

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const getUser = () => {
  // Reads from localStorage cache set by Supabase internally
  const raw = localStorage.getItem('sb-user');
  if (raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
};

export const getCachedProfile = () => {
  const raw = localStorage.getItem('madrasa-profile');
  if (raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
};

export const setCachedProfile = (profile) => {
  localStorage.setItem('madrasa-profile', JSON.stringify(profile));
};

export const clearCachedProfile = () => {
  localStorage.removeItem('madrasa-profile');
};

export const isAuthenticated = async () => {
  const session = await getSession();
  return !!session;
};

// ─── Role Helpers (sync, uses cached profile) ────────────────────────────────

export const isAdmin = () => {
  const profile = getCachedProfile();
  return profile?.role === 'admin';
};

export const isParent = () => {
  const profile = getCachedProfile();
  return profile?.role === 'parent';
};