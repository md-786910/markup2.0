import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import OrgLockedBanner from '../common/OrgLockedBanner';
import PendingPaymentBanner from '../common/PendingPaymentBanner';
import NotificationBell from '../common/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import BrandMark from '../common/BrandMark';

export default function AppLayout() {
  // On phones the sidebar is a drawer: closed until the menu button opens it
  const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 1024;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isSmallScreen);
  const { orgLocked, user } = useAuth();
  const pendingInvoice = user?.orgPendingInvoice;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={() => { if (isSmallScreen()) setSidebarCollapsed(true); }}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <BrandMark className="w-6 h-6" />
              <span className="text-base font-display font-bold tracking-[-0.03em] text-gray-900">Kommently</span>
            </div>
          </div>
          <NotificationBell />
        </div>

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
