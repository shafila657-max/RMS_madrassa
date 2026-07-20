import { Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin, isParent } from '@/utils/auth';

export const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    if (isAdmin()) {
      return <Navigate to="/admin" replace />;
    } else if (isParent()) {
      return <Navigate to="/parent/dashboard" replace />;
    }
  }

  return children;
};