import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { updateProjectEmailNotificationsApi } from '../../services/projectService';
import { uploadUrl } from '../../utils/uploadUrl';
import { toastError } from '../../utils/toast';
import { openSupport } from '../../utils/supportPanel';

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-gray-100', text: 'text-gray-700' },
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

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 45) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

// Today / Yesterday / Earlier, by the viewer's calendar day
function dayGroup(dateStr) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t = new Date(dateStr).getTime();
  if (t >= startOfToday.getTime()) return 'Today';
  if (t >= startOfToday.getTime() - 86400000) return 'Yesterday';
  return 'Earlier';
}

const isMention = (n) => n.type === 'mention' || Boolean(n.metadata?.isMention);

const BADGES = {
  mention: { className: 'bg-blue-600', icon: <span className="text-[9px] font-bold leading-none">@</span> },
  comment: { className: 'bg-blue-600', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  pin_created: { className: 'bg-blue-600', path: 'M12 4v16m8-8H4' },
  pin_resolved: { className: 'bg-emerald-500', path: 'M5 13l4 4L19 7' },
  pin_reopened: { className: 'bg-amber-500', path: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  pin_deleted: { className: 'bg-gray-500', path: 'M6 18L18 6M6 6l12 12' },
  member_invited: { className: 'bg-blue-600', path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
  support_reply: { className: 'bg-blue-600', path: 'M8 10h8M8 14h5m-9 6l2.6-2.6A2 2 0 018 17h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z' },
  member_removed: { className: 'bg-red-500', path: 'M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6' },
};

function ActionBadge({ type }) {
  const badge = BADGES[type] || BADGES.pin_created;
  return (
    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-white ${badge.className}`}>
      {badge.icon || (
        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d={badge.path} />
        </svg>
      )}
    </span>
  );
}

// "commented on Pin #3": what the person did, without their name
function actionText(notif, actorName) {
  const pinNum = notif.pin?.pinNumber || notif.metadata?.pinNumber;
  const pin = pinNum ? <span className="font-medium text-gray-900">Pin #{pinNum}</span> : null;
  const fromTitle = () => {
    const title = notif.title || '';
    return title.startsWith(actorName) ? title.slice(actorName.length).trim() : title;
  };
  switch (notif.type) {
    case 'mention': return <>mentioned you{pin && <> on {pin}</>}</>;
    case 'comment': return <>commented{pin && <> on {pin}</>}</>;
    case 'pin_created': return <>added {pin || 'a pin'}</>;
    case 'pin_resolved': return <>resolved {pin || 'a pin'}</>;
    case 'pin_reopened': return <>reopened {pin || 'a pin'}</>;
    case 'pin_deleted': return <>deleted {pin || 'a pin'}</>;
    case 'member_invited': return fromTitle() || 'invited a member';
    case 'member_removed': return fromTitle() || 'removed a member';
    case 'support_reply': return <>replied to your request <span className="font-medium text-gray-900">#{notif.metadata?.number}</span></>;
    default: return fromTitle() || 'made a change';
  }
}

export default function NotificationBell({ className = '', variant, projectId, onSelectPin, align = 'right', dark = false }) {
  const navigate = useNavigate();

  // Inside a project the bell shows only that project's notifications
  const scopeProjectId = variant === 'detailed' ? projectId : null;

  const {
    notifications,
    unreadCount,
    loading,
    hasNewNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const { user, updateUser } = useAuth();
  const [emailToggling, setEmailToggling] = useState(false);
  const isProjectEmailEnabled = Boolean(
    scopeProjectId && !user?.mutedProjectEmails?.includes(String(scopeProjectId))
  );

  const handleToggleProjectEmails = async (e) => {
    e.stopPropagation();
    if (!scopeProjectId || emailToggling) return;
    setEmailToggling(true);
    try {
      const res = await updateProjectEmailNotificationsApi(scopeProjectId, !isProjectEmailEnabled);
      if (res.data?.mutedProjectEmails && updateUser) {
        updateUser({ mutedProjectEmails: res.data.mutedProjectEmails });
      }
    } catch (err) {
      toastError(err, 'Could not update email notifications for this project.');
    } finally {
      setEmailToggling(false);
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all | unread | mention
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const scopedNotifications = useMemo(() => {
    if (!scopeProjectId) return notifications;
    return notifications.filter((n) => {
      const pId = n.project?._id || n.project || n.metadata?.projectId;
      return pId && String(pId) === String(scopeProjectId);
    });
  }, [notifications, scopeProjectId]);

  const scopedUnreadCount = useMemo(
    () => (scopeProjectId ? scopedNotifications.filter((n) => !n.read).length : unreadCount),
    [scopedNotifications, unreadCount, scopeProjectId]
  );

  const mentionsCount = scopedNotifications.filter(isMention).length;

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return scopedNotifications.filter((n) => !n.read);
    if (filter === 'mention') return scopedNotifications.filter(isMention);
    return scopedNotifications;
  }, [scopedNotifications, filter]);

  // Consecutive Today / Yesterday / Earlier sections (the list is newest first)
  const sections = useMemo(() => {
    const out = [];
    for (const notif of filteredNotifications) {
      const label = dayGroup(notif.createdAt);
      if (!out.length || out[out.length - 1].label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(notif);
    }
    return out;
  }, [filteredNotifications]);

  const handleOpenNotification = (notif) => {
    if (!notif.read) markAsRead(notif._id);
    setIsOpen(false);

    // Support replies open the conversation in the Help & support panel
    if (notif.type === 'support_reply') {
      openSupport({ ticketId: notif.metadata?.ticketId });
      return;
    }

    const targetProjectId = notif.project?._id || notif.project;
    const pinId = notif.pin?._id || notif.pin;
    const isCurrentProject = scopeProjectId && (!targetProjectId || String(targetProjectId) === String(scopeProjectId));

    if (onSelectPin && pinId && isCurrentProject) {
      onSelectPin(typeof notif.pin === 'object' && notif.pin !== null ? notif.pin : { _id: pinId });
    }
    if (targetProjectId) {
      navigate(pinId ? `/project/${targetProjectId}?pin=${pinId}` : `/project/${targetProjectId}`);
    }
  };

  const handleMarkAllRead = () => {
    if (scopeProjectId) {
      scopedNotifications.filter((n) => !n.read).forEach((n) => markAsRead(n._id));
    } else {
      markAllAsRead();
    }
  };

  const tabs = [
    { id: 'all', label: 'All', count: scopedNotifications.length },
    { id: 'unread', label: 'Unread', count: scopedUnreadCount },
    { id: 'mention', label: 'Mentions', count: mentionsCount },
  ];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-lg transition-colors focus:outline-none ${
          dark
            ? `text-gray-400 hover:text-white hover:bg-gray-800 ${isOpen ? 'bg-gray-800 text-white' : ''}`
            : `text-gray-500 hover:text-gray-700 hover:bg-gray-100 ${isOpen ? 'bg-gray-100 text-gray-800' : ''}`
        }`}
        title="Notifications"
        aria-label={scopedUnreadCount ? `Notifications, ${scopedUnreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
      >
        <svg
          className={`w-5 h-5 ${hasNewNotification ? 'animate-bounce text-blue-600' : ''}`}
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
        {scopedUnreadCount > 0 && (
          <span className={`absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ${dark ? 'ring-gray-900' : 'ring-white'}`}>
            {scopedUnreadCount > 99 ? '99+' : scopedUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-[calc(100vw-2rem)] max-w-[400px] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-scale-in`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <h3 className="text-[15px] font-semibold text-gray-900">Notifications</h3>
            {scopedUnreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-4 border-b border-gray-100 px-4 text-[13px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`-mb-px border-b-2 pb-2 pt-1 font-medium transition-colors ${
                  filter === tab.id ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-px text-[11px] ${filter === tab.id ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            {loading && scopedNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading notifications…</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-800">You're all caught up</p>
                <p className="text-xs text-gray-500 mt-1">
                  {filter === 'unread'
                    ? 'No unread notifications.'
                    : filter === 'mention'
                    ? 'Nobody has mentioned you yet.'
                    : 'Comments, mentions and resolved pins will show up here.'}
                </p>
              </div>
            ) : (
              sections.map((section) => (
                <div key={section.label}>
                  <p className="sticky top-0 z-10 bg-white/95 px-4 pb-1 pt-3 text-xs font-medium text-gray-400 backdrop-blur">
                    {section.label}
                  </p>
                  {section.items.map((notif) => {
                    const isGuest = !notif.actor && Boolean(notif.actorGuest?.name);
                    const actorName = notif.actor?.name || notif.actorGuest?.name
                      || (notif.type === 'support_reply' ? `${notif.metadata?.adminName || 'Support'} (Kommently)` : 'Someone');
                    const actorColor = getAvatarColor(notif.actor?._id || notif.actorGuest?.email);
                    const projName = notif.project?.name || notif.metadata?.projectName;
                    const preview = cleanText(notif.message);

                    return (
                      <div
                        key={notif._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenNotification(notif)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleOpenNotification(notif); }}
                        className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors focus:outline-none focus-visible:bg-gray-50 ${
                          notif.read ? 'hover:bg-gray-50' : 'bg-blue-50/50 hover:bg-blue-50'
                        }`}
                      >
                        {/* Avatar with action badge */}
                        <div className="relative shrink-0">
                          {notif.actor?.avatar ? (
                            <img src={uploadUrl(notif.actor.avatar)} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className={`w-9 h-9 rounded-full ${actorColor.bg} ${actorColor.text} flex items-center justify-center text-xs font-semibold`}>
                              {getInitials(actorName)}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <ActionBadge type={notif.type} />
                          </span>
                        </div>

                        {/* Who did what, where and when */}
                        <div className="min-w-0 flex-1 pr-5">
                          <p className="text-[13px] leading-5 text-gray-600">
                            <span className="font-semibold text-gray-900">{actorName}</span>
                            {isGuest && <span className="ml-1 rounded bg-gray-100 px-1 py-px text-[10px] font-medium text-gray-500">Guest</span>}{' '}
                            {actionText(notif, actorName)}
                          </p>
                          {preview && (
                            <p className="mt-1 line-clamp-2 border-l-2 border-gray-200 pl-2 text-[13px] leading-5 text-gray-500">
                              {preview}
                            </p>
                          )}
                          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-gray-400">
                            {projName && !scopeProjectId && (
                              <>
                                <span className="truncate">{projName}</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <time dateTime={notif.createdAt} title={formatFullDate(notif.createdAt)} className="shrink-0">
                              {formatTimeAgo(notif.createdAt)}
                            </time>
                          </p>
                        </div>

                        {/* Unread dot, dismiss on hover */}
                        {!notif.read && (
                          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-blue-600 group-hover:hidden" aria-label="Unread" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                          className="absolute right-2.5 top-2.5 hidden rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 group-hover:block"
                          title="Dismiss"
                          aria-label="Dismiss notification"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Email for this project (inside a project) */}
          {scopeProjectId && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs">
              <span className="font-medium text-gray-700">Email me about this project</span>
              <button
                type="button"
                role="switch"
                aria-checked={isProjectEmailEnabled}
                onClick={handleToggleProjectEmails}
                disabled={emailToggling}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                  isProjectEmailEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label="Email notifications for this project"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    isProjectEmailEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
