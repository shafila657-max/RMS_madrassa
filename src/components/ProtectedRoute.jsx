import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Route protection wrapper component
 * Verifies active session, user profile, status, and role.
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { session, profile, loading, signOut } = useAuth();

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

  if (!session?.user) {
    return <Navigate to="/login" state={{ loginIntent: true }} replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-center">
        <p className="text-sm font-semibold text-stone-600">We’re having trouble loading your account. Please try again.</p>
      </div>
    );
  }

  const isApproved = profile.status === 'approved';
  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(profile.role);

  // Not approved yet (or rejected): explain instead of redirecting, which would loop.
  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-lg font-bold text-stone-900">
            {profile.status === 'rejected' ? 'Account not approved' : 'Awaiting admin approval'}
          </p>
          <p className="text-sm text-stone-600">
            {profile.status === 'rejected'
              ? 'Your account was not approved. Please contact the madrasa office.'
              : 'Your account has been created. You can sign in once the admin approves it.'}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!roleAllowed) {
    // Send each role to its own area
    if (profile.role === 'admin' || profile.role === 'teacher') {
      return <Navigate to="/admin" replace />;
    }
    if (profile.role === 'parent') {
      return <Navigate to="/parent" replace />;
    }
    if (profile.role === 'student') {
      return <Navigate to="/student" replace />;
    }
    return <Navigate to="/login" state={{ loginIntent: true }} replace />;
  }

  return children;
};

export default ProtectedRoute;
