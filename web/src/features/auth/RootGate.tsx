import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { DashboardSkeleton, AuthSkeleton } from '../../components/skeleton';
import LandingPage from '../landing/LandingPage';
import Dashboard from '../dashboard/Dashboard';

export const RootGate: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    if (isAuthenticated || user) {
      return <DashboardSkeleton />;
    }
    if (location.pathname === '/') {
      return <LandingPage />;
    }
    return <AuthSkeleton />;
  }

  if (!isAuthenticated || !user) {
    if (location.pathname === '/') {
      return <LandingPage />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role === 'resident' && !user.is_fully_approved) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Dashboard />;
};

export default RootGate;
