import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import AdminLayout from './components/layout/AdminLayout';
import './index.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage'));
const OrganizationDetailPage = lazy(() => import('./pages/OrganizationDetailPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 animate-fade-in">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
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
            <Route element={<PrivateRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
