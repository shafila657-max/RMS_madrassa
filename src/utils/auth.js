import { supabase } from '@/lib/supabase';

// ─── Auth Actions ─────────────────────────────────────────────────────────────

export const MIN_PASSWORD_LENGTH = 8;

export const register = async ({ email, password, full_name, phone, role }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The database only accepts parent or student here; anything else becomes parent.
      data: { full_name, phone, role: role === 'student' ? 'student' : 'parent' },
    },
  });
  if (error) {
    console.error('Supabase signup error:', error);
    if (error.message?.includes('Password should be')) {
      throw new Error(`Password is too weak: ${error.message}`);
    }
    if (error.message?.toLowerCase().includes('already registered')) {
      throw new Error('An account with this email already exists. Please log in, or use "Forgot password".');
    }
    throw new Error(error.message || 'Registration failed. Please try again.');
  }

  // Supabase answers a sign-up for an existing email with a fake success whose
  // user has no identities, so the address can't be probed. Tell the person plainly.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Please log in, or use "Forgot password".');
  }

  // New accounts wait for admin approval, so don't leave them signed in.
  if (data?.session) {
    await supabase.auth.signOut();
  }

  return { needsEmailConfirmation: !data?.session };
};

export const login = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Provide clear messages for common Supabase auth errors
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }
    if (error.message?.includes('Email not confirmed')) {
      throw new Error('Please confirm your email first. Check your inbox (and spam folder) for the confirmation link.');
    }
    throw new Error(error.message || 'Login failed. Please try again.');
  }

  // Fetch the profile to check approval status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    await supabase.auth.signOut();
    console.error('Profile load error:', profileError);
    throw new Error('We could not load your account. Please try again, or contact the madrasa office.');
  }

  if (profile.status === 'pending') {
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