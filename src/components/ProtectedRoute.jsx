import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Route protection wrapper component
 * Verifies active session, user profile, status, and role.
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { session, profile, loading } = useAuth();

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

  const isApproved = profile.status === 'approved' || profile.role === 'teacher';
  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(profile.role);

  if (!isApproved || !roleAllowed) {
    // Redirect based on role if logged in, otherwise send to login
    if (profile.role === 'admin' || profile.role === 'teacher') {
      return <Navigate to="/admin" replace />;
    }
    if (profile.role === 'parent') {
      return <Navigate to="/parent" replace />;
    }
    return <Navigate to="/login" state={{ loginIntent: true }} replace />;
  }

  return children;
};

export default ProtectedRoute;
