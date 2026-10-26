import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import TrialBadge from '../common/TrialBadge';
import NotificationBell from '../common/NotificationBell';
import BrandMark from '../common/BrandMark';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { uploadUrl } from '../../utils/uploadUrl';

const navItems = [
  {
    id: 'active',
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'archived',
    label: 'Archive',
    path: '/dashboard?tab=archived',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    id: 'members',
    label: 'Team',
    path: '/dashboard?tab=members',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'integrations',
    label: 'Integrations',
    path: '/integrations',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function getActiveNavId(pathname, searchParams) {
  if (pathname === '/settings') return 'settings';
  if (pathname === '/integrations') return 'integrations';
  if (pathname === '/dashboard') return searchParams.get('tab') || 'active';
  return null;
}

export default function AppSidebar({ collapsed, onToggle, onNavigate }) {
  const { user, logout, canManage } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const activeNavId = getActiveNavId(location.pathname, searchParams);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const handleNavClick = (item) => {
    navigate(item.path);
    onNavigate?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col w-64 bg-gray-900 text-white
          transition-transform duration-200 ease-in-out
          ${collapsed ? '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden' : 'translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 shrink-0">
          <BrandMark className="w-8 h-8" />
          <span className="text-base font-semibold tracking-tight">Kommently</span>
          <NotificationBell align="left" dark className="ml-auto hidden lg:block" />
        </div>

        {/* Workspace switcher */}
        <WorkspaceSwitcher onNavigate={onNavigate} />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.filter(item => item.id !== 'integrations' || canManage).map((item) => {
            const isActive = activeNavId === item.id;
            const locked = item.id === 'integrations' && !user?.orgLimits?.hasIntegrations;
            const showBilling = item.id === 'settings' && !!user?.orgPendingInvoice;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
                {locked && (
                  <svg className="ml-auto h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-label="Upgrade required">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                )}
                {showBilling && (
                  <span
                    title="You have an unpaid invoice"
                    className="ml-auto w-2 h-2 rounded-full bg-red-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Trial status badge */}
        <TrialBadge />

        {/* Bottom user section with dropdown */}
        <div className="border-t border-gray-800 px-3 py-3 relative" ref={userMenuRef}>
          {/* Dropdown menu — pops upward */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1.5 animate-scale-in">
              <button
                onClick={() => { setUserMenuOpen(false); navigate('/profile'); onNavigate?.(); }}
                className="w-full text-left px-3.5 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/60 flex items-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="w-full text-left px-3.5 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700/60 flex items-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log out
              </button>
            </div>
          )}

          {/* Clickable user area */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-gray-800/60 transition-colors"
          >
            {user?.avatar ? (
              <img
                src={uploadUrl(user.avatar)}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {(user?.name || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[13px] font-medium text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
