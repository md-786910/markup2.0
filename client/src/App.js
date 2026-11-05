import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import Toaster from './components/common/Toaster';
import SupportPanel from './components/support/SupportPanel';
import ConfirmHost from './components/common/ConfirmHost';
import SiteNoticeBanner from './components/common/SiteNoticeBanner';
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
const TeamPage = lazy(() => import('./pages/TeamPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const GuestProjectPage = lazy(() => import('./pages/GuestProjectPage'));
const GuestWorkspacePage = lazy(() => import('./pages/GuestWorkspacePage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[50vh]" role="status" aria-label="Loading">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
        <NotificationProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/review/w/:workspaceToken" element={<GuestWorkspacePage />} />
              <Route path="/review/:shareToken" element={<GuestProjectPage />} />
              <Route element={<PrivateRoute />}>
                {/* Routes in the Layout C shell (rail, context panel, header) */}
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/project/:projectId/members" element={<MembersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
                {/* Full-screen review (outside the shell) */}
                <Route path="/project/:projectId" element={<ProjectPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
          <Toaster />
          <ConfirmHost />
          <SiteNoticeBanner />
          <SupportPanel />
        </NotificationProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
