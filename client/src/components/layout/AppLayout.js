import React, { useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import OrgLockedBanner from '../common/OrgLockedBanner';
import PendingPaymentBanner from '../common/PendingPaymentBanner';
import NotificationBell from '../common/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import BrandMark from '../common/BrandMark';
import { WorkspaceTile } from './WorkspaceSwitcher';

const SITE_URL = process.env.REACT_APP_SITE_URL || 'https://kommently.app';

// Where the user is: the workspace for project lists, else the section name
function useBreadcrumb() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { current } = useWorkspaces();
  if (pathname === '/dashboard') {
    const tab = searchParams.get('tab');
    if (tab === 'members') return { section: 'Team' };
    return { workspace: current, section: tab === 'archived' ? 'Archive' : 'Projects' };
  }
  if (pathname === '/settings') return { section: 'Settings' };
  if (pathname === '/integrations') return { section: 'Integrations' };
  if (pathname === '/profile') return { section: 'Profile' };
  if (/^\/project\/[^/]+\/members/.test(pathname)) return { section: 'Project members' };
  return {};
}

export default function AppLayout() {
  // On phones the sidebar is a drawer: closed until the menu button opens it
  const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 1024;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isSmallScreen);
  const { orgLocked, user } = useAuth();
  const pendingInvoice = user?.orgPendingInvoice;
  const { workspace, section } = useBreadcrumb();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={() => { if (isSmallScreen()) setSidebarCollapsed(true); }}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar: menu + logo on small screens, breadcrumb on desktop; help and notifications on the right */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <BrandMark className="w-6 h-6" />
              <span className="text-base font-display font-bold tracking-[-0.03em] text-gray-900">Kommently</span>
            </div>
            <nav aria-label="Breadcrumb" className="hidden lg:flex min-w-0 items-center gap-2 text-sm">
              <span className="truncate text-gray-500">{user?.orgName}</span>
              {workspace && (
                <>
                  <span className="text-gray-300">/</span>
                  <span className="flex min-w-0 items-center gap-2 text-gray-700">
                    <WorkspaceTile name={workspace.name} className="h-5 w-5 text-[10px]" />
                    <span className="truncate font-medium">{workspace.name}</span>
                  </span>
                </>
              )}
              {section && (
                <>
                  <span className="text-gray-300">/</span>
                  <span className="truncate font-medium text-gray-900">{section}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`${SITE_URL}/support`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Help center"
              aria-label="Help center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </a>
            <NotificationBell />
          </div>
        </header>

        {/* Locked takes precedence; otherwise show pending-payment notice */}
        {orgLocked ? <OrgLockedBanner /> : pendingInvoice ? <PendingPaymentBanner /> : null}

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
