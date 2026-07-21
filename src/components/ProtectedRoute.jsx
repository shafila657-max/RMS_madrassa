import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { setCachedProfile, clearCachedProfile } from '@/utils/auth';

/**
 * Route protection wrapper component
 * Verifies active session, user profile, status, and role.
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (isMounted) {
            clearCachedProfile();
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        // Fetch user profile from Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          if (isMounted) {
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        // Cache valid profile
        setCachedProfile(profile);

        // Check status approval (teachers and approved users pass)
        const isApproved = profile.status === 'approved' || profile.role === 'teacher';
        const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(profile.role);

        if (isMounted) {
          setUserRole(profile.role);
          setAuthorized(isApproved && roleAllowed);
          setLoading(false);
        }
      } catch (err) {
        console.error('ProtectedRoute check error:', err);
        if (isMounted) {
          setAuthorized(false);
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-stone-500">Verifying session permissions...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    // Redirect based on role if logged in, otherwise send to login
    if (userRole === 'admin' || userRole === 'teacher') {
      return <Navigate to="/admin" replace />;
    }
    if (userRole === 'parent') {
      return <Navigate to="/parent" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;