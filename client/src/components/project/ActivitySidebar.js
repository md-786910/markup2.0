import { useState, useEffect, useCallback, useRef } from 'react';
import { getActivityApi } from '../../services/projectService';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const ACTION_CONFIG = {
  'project.created': { icon: 'plus', color: 'text-emerald-500', bg: 'bg-emerald-50', label: (m) => 'created this project' },
  'project.updated': { icon: 'pencil', color: 'text-blue-500', bg: 'bg-blue-50', label: (m) => 'updated the project' },
  'project.status_changed': { icon: 'arrow', color: 'text-purple-500', bg: 'bg-purple-50', label: (m) => `changed status to ${m?.newStatus?.replace('_', ' ') || 'unknown'}` },
  'pin.created': { icon: 'pin', color: 'text-blue-500', bg: 'bg-blue-50', label: (m) => `created Pin #${m?.pinNumber || '?'}` },
  'pin.resolved': { icon: 'check', color: 'text-emerald-500', bg: 'bg-emerald-50', label: (m) => `resolved Pin #${m?.pinNumber || '?'}` },
  'pin.reopened': { icon: 'reopen', color: 'text-amber-500', bg: 'bg-amber-50', label: (m) => `reopened Pin #${m?.pinNumber || '?'}` },
  'pin.deleted': { icon: 'trash', color: 'text-red-500', bg: 'bg-red-50', label: (m) => `deleted Pin #${m?.pinNumber || '?'}` },
  'comment.created': { icon: 'comment', color: 'text-blue-500', bg: 'bg-blue-50', label: (m) => `commented on Pin #${m?.pinNumber || '?'}` },
  'comment.deleted': { icon: 'trash', color: 'text-red-500', bg: 'bg-red-50', label: (m) => `deleted a comment on Pin #${m?.pinNumber || '?'}` },
  'member.invited': { icon: 'invite', color: 'text-indigo-500', bg: 'bg-indigo-50', label: (m) => `invited ${m?.memberEmail || 'someone'}` },
  'member.joined': { icon: 'plus', color: 'text-emerald-500', bg: 'bg-emerald-50', label: (m) => `added ${m?.memberName || 'a member'}` },
  'member.removed': { icon: 'minus', color: 'text-red-500', bg: 'bg-red-50', label: (m) => `removed ${m?.memberName || 'a member'}` },
  'member.role_changed': { icon: 'shield', color: 'text-purple-500', bg: 'bg-purple-50', label: (m) => `changed ${m?.memberName || 'a member'}'s role to ${m?.newRole || '?'}` },
  'share.enabled': { icon: 'link', color: 'text-blue-500', bg: 'bg-blue-50', label: () => 'enabled sharing' },
  'share.disabled': { icon: 'unlink', color: 'text-gray-500', bg: 'bg-gray-50', label: () => 'disabled sharing' },
  'guest.commented': { icon: 'comment', color: 'text-amber-500', bg: 'bg-amber-50', label: (m) => `commented on Pin #${m?.pinNumber || '?'}` },
  'guest.pin_created': { icon: 'pin', color: 'text-amber-500', bg: 'bg-amber-50', label: (m) => `created Pin #${m?.pinNumber || '?'}` },
};

function ActionIcon({ type, className }) {
  const iconMap = {
    plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
    pencil: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />,
    arrow: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />,
    pin: <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    reopen: <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />,
    comment: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />,
    invite: <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />,
    minus: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
    link: <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.874a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />,
    unlink: <path strokeLinecap="round" strokeLinejoin="round" d="M13.181 8.68a4.503 4.503 0 011.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 006.364 6.364l3.129-3.129m5.614-5.615L20.44 9.94a4.5 4.5 0 00-6.364-6.364l-3.129 3.129" />,
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      {iconMap[type] || iconMap.comment}
    </svg>
  );
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ActivitySidebar({ projectId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef(null);

  const fetchActivities = useCallback(async (pageNum, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await getActivityApi(projectId, pageNum);
      const { activities: newActivities, pagination } = res.data;

      setActivities((prev) => append ? [...prev, ...newActivities] : newActivities);
      setHasMore(pagination.page < pagination.pages);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [projectId]);

  useEffect(() => {
    setPage(1);
    fetchActivities(1);
  }, [fetchActivities]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-500" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex flex-col divide-y divide-gray-100 overflow-y-auto">
      {activities.map((activity) => {
        const config = ACTION_CONFIG[activity.action] || {
          icon: 'comment',
          color: 'text-gray-500',
          bg: 'bg-gray-50',
          label: () => activity.action,
        };
        const actorName = activity.actor?.name || activity.actorGuest?.name || 'Someone';
        const isGuest = !activity.actor && activity.actorGuest;

        return (
          <div key={activity._id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
              <ActionIcon type={config.icon} className={`w-4 h-4 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-snug">
                <span className="font-medium text-gray-900">{actorName}</span>
                {isGuest && <span className="text-xs text-amber-600 ml-1">(guest)</span>}
                {' '}
                {config.label(activity.metadata)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(activity.createdAt)}</p>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div className="px-4 py-3">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
