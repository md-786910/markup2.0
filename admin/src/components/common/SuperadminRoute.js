import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

// Pages only superadmins use (billing, plans, payments, admin team, action log);
// support agents land on the overview instead (the API refuses them too)
export default function SuperadminRoute() {
  const { user } = useAuth();
  return user?.role === 'support' ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
