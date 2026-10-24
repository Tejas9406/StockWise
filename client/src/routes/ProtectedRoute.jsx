import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Authenticating StockWise session..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to correct dashboard matching role
    if (user.role === 'DISTRIBUTION_MANAGER') return <Navigate to="/manager" replace />;
    if (user.role === 'WAREHOUSE') return <Navigate to="/warehouse" replace />;
    if (user.role === 'STORE_MANAGER') return <Navigate to="/store" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
