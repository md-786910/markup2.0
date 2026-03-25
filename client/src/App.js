import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import AppLayout from './components/layout/AppLayout';
import './index.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route element={<PrivateRoute />}>
              {/* Routes WITH sidebar layout */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/project/:projectId/members" element={<MembersPage />} />
              </Route>
              {/* Routes WITHOUT sidebar (full-bleed for annotation tool) */}
              <Route path="/project/:projectId" element={<ProjectPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
