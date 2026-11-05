import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { updateProjectEmailNotificationsApi } from '../../services/projectService';
import { uploadUrl } from '../../utils/uploadUrl';
import { toastError } from '../../utils/toast';
import { openSupport } from '../../utils/supportPanel';
import { IconButton, Icon, cx } from '../kc';

// Design system: every avatar is brand blue with white initials
const AVATAR_COLORS = [
  { bg: 'bg-blue-600', text: 'text-white' },
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
  mention: { className: 'bg-blue-600', icon: <span className="text-caption font-semibold">@</span> },
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

// rail: the design-system rail button (bottom of the dark rail); the panel
// opens to the right of the rail, aligned to the bottom.
export default function NotificationBell({ className = '', variant, projectId, onSelectPin, align = 'right', dark = false, rail = false }) {
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
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKey);
    };
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
      <IconButton
        icon="bell"
        size={rail ? 'lg' : undefined}
        onDark={rail || dark}
        tip={rail && !isOpen ? 'Notifications' : undefined}
        label={scopedUnreadCount ? `Notifications, ${scopedUnreadCount} unread` : 'Notifications'}
        active={isOpen}
        badge={scopedUnreadCount > 0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      />

      {isOpen && (
        <div role="dialog" aria-label="Notifications" className={`kc-menu kc-notif ${rail ? 'kc-rail-notif' : `absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2`}`} style={{ zIndex: 'var(--z-menu)' }}>
          {/* Header */}
          <div className="nh">
            <span>Notifications</span>
            {scopedUnreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="kc-link"
                style={{ fontSize: 12, border: 0, background: 'none', padding: 0, cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', padding: '6px 14px', fontSize: 12 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  background: 'none',
                  border: 0,
                  padding: '4px 0',
                  fontWeight: filter === tab.id ? 600 : 500,
                  color: filter === tab.id ? 'var(--brand-600)' : 'var(--slate-500)',
                  borderBottom: filter === tab.id ? '2px solid var(--brand-600)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span style={{ fontSize: 11, padding: '1px 5px', borderRadius: 'var(--radius-pill)', background: filter === tab.id ? 'var(--brand-50)' : 'var(--slate-100)', color: filter === tab.id ? 'var(--brand-600)' : 'var(--slate-600)' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="list">
            {loading && scopedNotifications.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--slate-400)', fontSize: 12 }}>
                Loading notifications…
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--slate-500)' }}>
                <b style={{ display: 'block', color: 'var(--slate-800)', marginBottom: 4, fontSize: 13 }}>You're all caught up</b>
                <small style={{ color: 'var(--slate-500)', fontSize: 11.5 }}>
                  {filter === 'unread'
                    ? 'No unread notifications.'
                    : filter === 'mention'
                    ? 'Nobody has mentioned you yet.'
                    : 'Comments, mentions and resolved pins will show up here.'}
                </small>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isGuest = !notif.actor && Boolean(notif.actorGuest?.name);
                const actorName = notif.actor?.name || notif.actorGuest?.name
                  || (notif.type === 'support_reply' ? `${notif.metadata?.adminName || 'Support'} (Kommently)` : 'Someone');
                const projName = notif.project?.name || notif.metadata?.projectName;
                const pinNum = notif.pin?.pinNumber || notif.metadata?.pinNumber;
                const isResolved = notif.type === 'pin_resolved' || notif.metadata?.status === 'resolved';
                const preview = cleanText(notif.message);

                return (
                  <div
                    key={notif._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenNotification(notif)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenNotification(notif); }}
                    className="nr"
                    style={{
                      cursor: 'pointer',
                      background: notif.read ? undefined : 'var(--brand-50)',
                      position: 'relative',
                    }}
                  >
                    <span className={cx('pin', isResolved && 'ok')}>
                      {isResolved ? <Icon name="check" size={12} stroke={3} /> : (pinNum ? String(pinNum) : '#')}
                    </span>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                      <b>{actorName}</b>{isGuest ? ' (guest)' : ''} {actionText(notif, actorName)}
                      {preview && (
                        <p style={{ margin: '3px 0 0', color: 'var(--slate-600)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {preview}
                        </p>
                      )}
                      <small>
                        {formatTimeAgo(notif.createdAt)}
                        {projName && !scopeProjectId ? ` · ${projName}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'none',
                        border: 0,
                        color: 'var(--slate-400)',
                        cursor: 'pointer',
                        padding: 2,
                        borderRadius: 4,
                        display: 'flex',
                      }}
                      title="Dismiss"
                      aria-label="Dismiss notification"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Email for this project (inside a project) */}
          {scopeProjectId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--slate-50)', fontSize: 12 }}>
              <span style={{ fontWeight: 500, color: 'var(--slate-700)' }}>Email me about this project</span>
              <button
                type="button"
                role="switch"
                aria-checked={isProjectEmailEnabled}
                onClick={handleToggleProjectEmails}
                disabled={emailToggling}
                className="kc-toggle"
                style={emailToggling ? { opacity: 0.5 } : undefined}
                aria-label="Email notifications for this project"
              >
                <span className="track" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
