import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id) {
  let hash = 0;
  const str = id || '';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 45) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationBell({ className = '' }) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    hasNewNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif._id);
    }
    setIsOpen(false);

    const projectId = notif.project?._id || notif.project;
    const pinId = notif.pin?._id || notif.pin;

    if (projectId) {
      if (pinId) {
        navigate(`/project/${projectId}?pin=${pinId}`);
      } else {
        navigate(`/project/${projectId}`);
      }
    }
  };

  const getActionBadge = (type) => {
    switch (type) {
      case 'mention':
        return (
          <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
            @
          </span>
        );
      case 'comment':
        return (
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </span>
        );
      case 'pin_resolved':
        return (
          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        );
      case 'pin_reopened':
        return (
          <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-sm">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </span>
        );
      case 'pin_created':
      default:
        return (
          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </span>
        );
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none ${
          isOpen ? 'bg-gray-100 text-gray-800' : ''
        }`}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          className={`w-5 h-5 transition-transform ${
            hasNewNotification ? 'animate-bounce text-blue-600' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2 bg-gray-50/70 border-b border-gray-100 flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-800">All caught up!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filter === 'unread'
                    ? 'No unread notifications right now.'
                    : 'No notifications to display.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const actorName = notif.actor?.name || notif.actorGuest?.name || 'Someone';
                const actorColor = getAvatarColor(notif.actor?._id || notif.actorGuest?.email);
                const pinNum = notif.pin?.pinNumber || notif.metadata?.pinNumber;
                const projName = notif.project?.name || notif.metadata?.projectName;

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative px-4 py-3 cursor-pointer transition-colors flex items-start gap-3 ${
                      !notif.read
                        ? 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'bg-white hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Avatar with action badge */}
                    <div className="relative shrink-0 mt-0.5">
                      {notif.actor?.avatar ? (
                        <img
                          src={`/uploads/${notif.actor.avatar}`}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div
                          className={`w-9 h-9 rounded-full ${actorColor.bg} ${actorColor.text} flex items-center justify-center text-xs font-bold border border-white/60 shadow-sm`}
                        >
                          {getInitials(actorName)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1">
                        {getActionBadge(notif.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs text-gray-800 leading-snug">
                        <span className="font-semibold text-gray-900">{actorName}</span>{' '}
                        {notif.type === 'mention' && (
                          <span>
                            mentioned you{pinNum ? <> on <span className="font-medium text-blue-600">Pin #{pinNum}</span></> : ''}
                          </span>
                        )}
                        {notif.type === 'comment' && (
                          <span>
                            commented{pinNum ? <> on <span className="font-medium text-blue-600">Pin #{pinNum}</span></> : ''}
                          </span>
                        )}
                        {notif.type === 'pin_created' && (
                          <span>
                            added <span className="font-medium text-blue-600">Pin #{pinNum}</span>
                          </span>
                        )}
                        {notif.type === 'pin_resolved' && (
                          <span>
                            resolved <span className="font-medium text-emerald-600">Pin #{pinNum}</span>
                          </span>
                        )}
                        {notif.type === 'pin_reopened' && (
                          <span>
                            reopened <span className="font-medium text-amber-600">Pin #{pinNum}</span>
                          </span>
                        )}
                        {notif.type === 'pin_deleted' && (
                          <span>
                            deleted <span className="font-medium text-gray-600">Pin #{pinNum}</span>
                          </span>
                        )}
                        {projName && (
                          <span className="text-gray-400 font-normal"> in {projName}</span>
                        )}
                      </p>

                      {/* Message preview */}
                      {notif.message && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 italic bg-gray-50/80 px-2 py-1 rounded border border-gray-100">
                          &ldquo;{notif.message}&rdquo;
                        </p>
                      )}

                      <p className="text-[10px] text-gray-400 mt-1 font-medium">
                        {formatTimeAgo(notif.createdAt)}
                      </p>
                    </div>

                    {/* Unread indicator / Delete button */}
                    <div className="shrink-0 flex items-center gap-1 self-center">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity rounded"
                        title="Dismiss"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
