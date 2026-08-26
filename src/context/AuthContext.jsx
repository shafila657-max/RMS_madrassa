import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { clearCachedProfile, setCachedProfile } from '@/utils/auth';

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async (nextSession) => {
      if (!nextSession?.user) {
        if (isMounted) {
          setSession(null);
          setProfile(null);
          setLoading(false);
          clearCachedProfile();
        }
        return;
      }

      if (isMounted) setSession(nextSession);

      const { data: nextProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nextSession.user.id)
        .single();

      if (!isMounted) return;

      if (error || !nextProfile) {
        // Never authorize from a cached role or approval status. The session can
        // remain valid, but authorization must come from the current database row.
        setProfile(null);
        clearCachedProfile();
        setLoading(false);
        if (error) console.error('Auth profile restore error:', error);
        return;
      }

      setCachedProfile(nextProfile);
      setProfile(nextProfile);
      setLoading(false);
    };

    // Use onAuthStateChange exclusively for session management.
    // This fires INITIAL_SESSION on app load (restoring persisted sessions),
    // SIGNED_IN after login, TOKEN_REFRESHED when access token auto-renews,
    // and SIGNED_OUT on logout — all without needing a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (
        event === 'SIGNED_OUT' ||
        event === 'USER_DELETED' ||
        !nextSession?.user
      ) {
        setSession(null);
        setProfile(null);
        clearCachedProfile();
        setLoading(false);
        return;
      }

      // INITIAL_SESSION  — app opened with a persisted/refreshed session
      // SIGNED_IN        — fresh login
      // TOKEN_REFRESHED  — access token silently renewed (keeps user logged in)
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED'
      ) {
        setSession(nextSession);
        setLoading(true);
        // Defer profile query outside Supabase's auth callback microtask
        setTimeout(() => restoreSession(nextSession), 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearCachedProfile();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export default AuthProvider;
