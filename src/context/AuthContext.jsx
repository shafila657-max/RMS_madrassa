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

    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => restoreSession(initialSession))
      .catch((error) => {
        console.error('Auth session restore error:', error);
        if (isMounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession?.user) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Keep protected routes in a loading state while a newly signed-in or
      // refreshed session's profile is restored.
      setSession(nextSession);
      setLoading(true);

      // Defer the profile query so it does not run inside Supabase's auth callback.
      setTimeout(() => restoreSession(nextSession), 0);
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
