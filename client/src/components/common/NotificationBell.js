import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

function getActionBadge(type) {
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
    case 'member_invited':
      return (
        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </span>
      );
    case 'member_removed':
      return (
        <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
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
}

export default function NotificationBell({ className = '', variant, projectId, onSelectPin }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract project ID from props or URL pathname (/project/:id)
  const pathProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/project\/([^/?#]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const currentProjectId = projectId || pathProjectId;
  const isDetailed =
    variant === 'detailed' || (!variant && Boolean(currentProjectId));

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

  // Scope notifications to current project if inside project view
  const scopedNotifications = useMemo(() => {
    if (isDetailed && currentProjectId) {
      return notifications.filter((n) => {
        const pId = n.project?._id || n.project || n.metadata?.projectId;
        return pId && String(pId) === String(currentProjectId);
      });
    }
    return notifications;
  }, [notifications, isDetailed, currentProjectId]);

  // Project-scoped unread count
  const scopedUnreadCount = useMemo(() => {
    if (isDetailed && currentProjectId) {
      return scopedNotifications.filter((n) => !n.read).length;
    }
    return unreadCount;
  }, [scopedNotifications, unreadCount, isDetailed, currentProjectId]);

  // Mention notifications count
  const mentionsCount = useMemo(() => {
    return scopedNotifications.filter(
      (n) => n.type === 'mention' || Boolean(n.metadata?.isMention)
    ).length;
  }, [scopedNotifications]);

  // Detailed notifications filtered list
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return scopedNotifications.filter((n) => !n.read);
    }
    if (filter === 'mention' || filter === 'mentions') {
      return scopedNotifications.filter(
        (n) => n.type === 'mention' || Boolean(n.metadata?.isMention)
      );
    }
    return scopedNotifications;
  }, [scopedNotifications, filter]);

  // Summary groups by project
  const allGroups = useMemo(() => {
    const groupsMap = new Map();

    for (const notif of notifications) {
      const projId = notif.project?._id || notif.project || 'general';
      const projName =
        notif.project?.name ||
        notif.metadata?.projectName ||
        (projId === 'general' ? 'General' : 'Project');

      if (!groupsMap.has(projId)) {
        groupsMap.set(projId, {
          key: projId,
          projectId: projId !== 'general' ? projId : null,
          projectName: projName,
          notifications: [],
          unreadCount: 0,
          totalCount: 0,
          hasUnread: false,
        });
      }

      const group = groupsMap.get(projId);
      group.notifications.push(notif);
      group.totalCount += 1;
      if (!notif.read) {
        group.unreadCount += 1;
        group.hasUnread = true;
      }
    }

    return Array.from(groupsMap.values());
  }, [notifications]);

  const unreadGroups = useMemo(() => {
    return allGroups.filter((g) => g.hasUnread);
  }, [allGroups]);

  const displayedGroups = filter === 'unread' ? unreadGroups : allGroups;

  // Handle click for summary group (Dashboard)
  const handleGroupClick = (group) => {
    setIsOpen(false);

    if (group.projectId) {
      navigate(`/project/${group.projectId}`);
    }
  };

  const handleDeleteGroup = (e, group) => {
    e.stopPropagation();
    group.notifications.forEach((n) => {
      deleteNotification(n._id);
    });
  };

  // Handle click for detailed individual notification (Inside Project)
  const handleIndividualClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif._id);
    }
    setIsOpen(false);

    const targetProjectId = notif.project?._id || notif.project || currentProjectId;
    const pinId = notif.pin?._id || notif.pin;
    const isCurrentProject = !targetProjectId || String(targetProjectId) === String(currentProjectId);

    if (onSelectPin && pinId && isCurrentProject) {
      const pinObj = typeof notif.pin === 'object' && notif.pin !== null ? notif.pin : { _id: pinId };
      onSelectPin(pinObj);
    }

    if (targetProjectId) {
      if (pinId) {
        navigate(`/project/${targetProjectId}?pin=${pinId}`);
      } else {
        navigate(`/project/${targetProjectId}`);
      }
    }
  };

  const handleMarkAllRead = () => {
    if (isDetailed && currentProjectId) {
      const unread = scopedNotifications.filter((n) => !n.read);
      unread.forEach((n) => markAsRead(n._id));
    } else {
      markAllAsRead();
    }
  };

  const allCount = isDetailed ? scopedNotifications.length : allGroups.length;
  const unreadTabCount = isDetailed ? scopedUnreadCount : unreadGroups.length;

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
        {scopedUnreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {scopedUnreadCount > 99 ? '99+' : scopedUnreadCount}
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
              {scopedUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                  {scopedUnreadCount} new
                </span>
              )}
            </div>

            {scopedUnreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
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
              All ({allCount})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Unread ({unreadTabCount})
            </button>
            {isDetailed && (
              <button
                onClick={() => setFilter('mention')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  filter === 'mention' || filter === 'mentions'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tagged ({mentionsCount})
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 scrollbar-thin">
            {loading && scopedNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : (isDetailed ? filteredNotifications.length === 0 : displayedGroups.length === 0) ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-800">All caught up!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filter === 'unread'
                    ? 'No unread notifications right now.'
                    : filter === 'mention' || filter === 'mentions'
                    ? 'No mentions in this project.'
                    : 'No notifications to display.'}
                </p>
              </div>
            ) : isDetailed ? (
              /* Detailed view for inside project view */
              filteredNotifications.map((notif) => {
                const actorName = notif.actor?.name || notif.actorGuest?.name || 'Someone';
                const actorColor = getAvatarColor(notif.actor?._id || notif.actorGuest?.email);
                const pinNum = notif.pin?.pinNumber || notif.metadata?.pinNumber;
                const projName = notif.project?.name || notif.metadata?.projectName;

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleIndividualClick(notif)}
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
                        {notif.type === 'member_invited' && (
                          <span>
                            {notif.title ? (
                              <span>{notif.title.startsWith(actorName) ? notif.title.slice(actorName.length).trim() : notif.title}</span>
                            ) : (
                              <span>invited a member to <span className="font-medium text-blue-600">{projName}</span></span>
                            )}
                          </span>
                        )}
                        {notif.type === 'member_removed' && (
                          <span>
                            {notif.title ? (
                              <span>{notif.title.startsWith(actorName) ? notif.title.slice(actorName.length).trim() : notif.title}</span>
                            ) : (
                              <span>removed a member from <span className="font-medium text-rose-600">{projName}</span></span>
                            )}
                          </span>
                        )}
                        {projName && !['member_invited', 'member_removed'].includes(notif.type) && (
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
            ) : (
              /* Summary view for Dashboard */
              displayedGroups.map((group) => {
                const count = group.unreadCount > 0 ? group.unreadCount : group.totalCount;

                return (
                  <div
                    key={group.key}
                    onClick={() => handleGroupClick(group)}
                    className={`group relative px-4 py-3.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      group.hasUnread
                        ? 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'bg-white hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Content: Project name — X new comments */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-800 leading-snug truncate">
                        <span className="font-semibold text-gray-900">{group.projectName}</span>
                        <span className="text-gray-400 mx-1.5">—</span>
                        <span className={group.hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}>
                          {count} new {count === 1 ? 'comment' : 'comments'}
                        </span>
                      </p>
                    </div>

                    {/* Unread indicator / Delete button */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {group.hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteGroup(e, group)}
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
