import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import AdminSidebar from './AdminSidebar';
import GlobalSearch from './GlobalSearch';
import BrandMark from '../common/BrandMark';
import Toaster from '../common/Toaster';
import ConfirmHost from '../common/ConfirmHost';

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const remindTwoFactor = user && !user.twoFactorEnabled && pathname !== '/account';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <BrandMark className="h-6 w-6 shrink-0 lg:hidden" />
          <GlobalSearch />
        </header>
        {remindTwoFactor && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 lg:px-8">
            <span>Your admin account is protected by a password only.</span>
            <Link to="/account?setup=2fa" className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950">Turn on two-step sign-in</Link>
          </div>
        )}
        <main className="flex-1">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
      <ConfirmHost />
    </div>
  );
}
