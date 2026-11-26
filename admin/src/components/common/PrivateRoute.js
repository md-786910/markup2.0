import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function PrivateRoute() {
  const { isAuthenticated, loading, connectionError, retry } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && connectionError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <div>
          <p className="text-body font-semibold text-gray-900">Can't reach the server</p>
          <p className="mt-1 text-body-sm text-gray-500">You're still signed in. Check your connection, or wait a moment if the server is restarting.</p>
        </div>
        <button type="button" onClick={retry} className="h-9 rounded-lg bg-blue-600 px-3.5 text-label text-white hover:bg-blue-700">Try again</button>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
