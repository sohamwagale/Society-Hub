import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { DashboardSkeleton } from '../../components/skeleton';

interface GuestRouteProps {
  children: React.ReactNode;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'resident' && !user.is_fully_approved) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
