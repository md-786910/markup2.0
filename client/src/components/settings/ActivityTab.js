import React, { useEffect, useState } from 'react';
import { getOrgActivityApi } from '../../services/authService';

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

function actorName(activity) {
  if (activity.actor?.name) return activity.actor.name;
  if (activity.actorGuest?.name) return activity.actorGuest.name;
  if (activity.metadata?.actorRole === 'superadmin') return 'Admin';
  return 'Someone';
}

function actorInitial(activity) {
  return actorName(activity).charAt(0).toUpperCase();
}

// Stable color per actor so the same person always gets the same avatar tint.
const ACTOR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-fuchsia-500',
];
function actorColor(activity) {
  const key = activity.actor?._id || activity.actorGuest?.email || activity.metadata?.actorRole || 'system';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return ACTOR_COLORS[Math.abs(hash) % ACTOR_COLORS.length];
}

// Per-action icon + color theme + message renderer.
const ACTION_RENDERERS = {
  // ── Project lifecycle ──
  'project.created': (a) => (
    <>created project <strong>{a.project?.name || a.metadata?.projectName || 'a project'}</strong></>
  ),
  'project.updated': (a) => (
    <>updated project <strong>{a.project?.name || 'a project'}</strong></>
  ),
  'project.status_changed': (a) => (
    <>
      changed <strong>{a.project?.name || 'a project'}</strong> status
      {a.metadata?.oldStatus ? <> from <strong>{a.metadata.oldStatus}</strong></> : null}
      {' '}to <strong>{a.metadata?.newStatus || a.metadata?.status || 'unknown'}</strong>
    </>
  ),
  'project.archived': (a) => (
    <>archived project <strong>{a.project?.name || a.metadata?.projectName || 'a project'}</strong></>
  ),
  'project.unarchived': (a) => (
    <>unarchived project <strong>{a.project?.name || a.metadata?.projectName || 'a project'}</strong></>
  ),

  // ── Project members ──
  'member.invited': (a) => (
    <>invited <strong>{a.metadata?.memberEmail || a.metadata?.email || 'someone'}</strong>{a.project?.name ? <> to <strong>{a.project.name}</strong></> : null}</>
  ),
  'member.joined': (a) => (
    <>
      {a.metadata?.memberName ? <><strong>{a.metadata.memberName}</strong> joined</> : <>joined</>}{' '}
      <strong>{a.project?.name || 'the workspace'}</strong>
    </>
  ),
  'member.removed': (a) => (
    <>removed <strong>{a.metadata?.memberName || a.metadata?.memberEmail || a.metadata?.email || 'a member'}</strong>{a.project?.name ? <> from <strong>{a.project.name}</strong></> : null}</>
  ),
  'member.role_changed': (a) => (
    <>changed <strong>{a.metadata?.memberName || 'a member'}</strong>'s role to <strong>{a.metadata?.newRole || a.metadata?.role || 'unknown'}</strong></>
  ),

  // ── Sharing ──
  'share.enabled': (a) => (
    <>enabled guest sharing for <strong>{a.project?.name || 'a project'}</strong></>
  ),
  'share.disabled': (a) => (
    <>disabled guest sharing for <strong>{a.project?.name || 'a project'}</strong></>
  ),

  // ── Org settings ──
  'org.name_updated': (a) => (
    <>renamed the workspace to <strong>{a.metadata?.name || 'a new name'}</strong></>
  ),
  'org.logo_updated': () => <>updated the workspace logo</>,

  // ── Plan changes ──
  'org.plan_upgraded': (a) => (
    <>upgraded the plan to <strong>{a.metadata?.toName || a.metadata?.to || 'a higher tier'}</strong></>
  ),
  'org.plan_downgraded': (a) => (
    <>downgraded the plan to <strong>{a.metadata?.toName || a.metadata?.to || 'a lower tier'}</strong></>
  ),

  // ── Org admin actions ──
  'org.locked': (a) => (
    <>locked the workspace{a.metadata?.reason ? <> — <em>{a.metadata.reason}</em></> : null}</>
  ),
  'org.unlocked': () => <>unlocked the workspace</>,

  // ── Integrations ──
  'integration.connected': (a) => (
    <>connected the <strong>{a.metadata?.type || 'integration'}</strong> integration</>
  ),
  'integration.disconnected': (a) => (
    <>disconnected the <strong>{a.metadata?.type || 'integration'}</strong> integration</>
  ),

  // ── Billing ──
  'billing.payment_succeeded': (a) => {
    // invoice.amount is stored in minor units (paise / cents); convert for display.
    const amountMinor = a.metadata?.amount;
    const currency = a.metadata?.currency || '';
    const planName = a.metadata?.planName || a.metadata?.plan || 'plan';
    const major = typeof amountMinor === 'number' ? amountMinor / 100 : amountMinor;
    const formatted = typeof major === 'number'
      ? new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(major)
      : major;
    return (
      <>paid <strong>{formatted} {currency}</strong> for the <strong>{planName}</strong> plan</>
    );
  },
};

function renderMessage(activity) {
  const renderer = ACTION_RENDERERS[activity.action];
  if (renderer) return renderer(activity);
  return <em>{activity.action}</em>;
}

function ActivityRow({ activity }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold ${actorColor(activity)}`}>
        {actorInitial(activity)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">
          <span className="font-semibold text-gray-900">{actorName(activity)}</span>{' '}
          {renderMessage(activity)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(activity.createdAt)}</p>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3.5 animate-pulse">
      <div className="shrink-0 w-9 h-9 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-2.5 bg-gray-100 rounded w-16" />
      </div>
    </div>
  );
}

export default function ActivityTab() {
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getOrgActivityApi(1, 30)
      .then((res) => {
        if (!alive) return;
        setActivities(res.data?.activities || []);
        setPages(res.data?.pagination?.pages || 1);
        setPage(1);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.message || 'Failed to load activity.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleLoadMore = async () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const res = await getOrgActivityApi(page + 1, 30);
      setActivities((prev) => [...prev, ...(res.data?.activities || [])]);
      setPages(res.data?.pagination?.pages || pages);
      setPage(page + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load more activity.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mb-10">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900">Workspace Activity</h3>
        <p className="text-xs text-gray-500 mt-1">
          Everyone in your workspace can see what's happening here — invitations, plan changes,
          project edits, integrations, and more.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No activity yet</p>
          <p className="text-xs text-gray-500 mt-1">Actions taken in this workspace will appear here.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl px-4">
            {activities.map((a) => (
              <ActivityRow key={a._id} activity={a} />
            ))}
          </div>

          {page < pages && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
