import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  {
    id: 'active',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'archived',
    label: 'Archive',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    id: 'members',
    label: 'Team',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    disabled: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function AppSidebar({ collapsed, onToggle }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentTab = location.pathname === '/dashboard'
    ? (searchParams.get('tab') || 'active')
    : null;

  const handleNavClick = (item) => {
    if (item.disabled) return;
    navigate(`/dashboard${item.id === 'active' ? '' : `?tab=${item.id}`}`);
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
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">MarkUp</span>
        </div>

        {/* Workspace selector */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 transition-colors cursor-default">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
              {(user?.name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-400 capitalize">{user?.role || 'Member'}</p>
            </div>
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-gray-800 text-white'
                    : item.disabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.disabled && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">Soon</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom user section */}
        <div className="border-t border-gray-800 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold shrink-0">
              {(user?.name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
