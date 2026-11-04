import React, { useEffect, useMemo, useState } from 'react';
import { getOrgActivityApi } from '../../services/authService';
import { DateFilterDropdown } from '../dashboard/FilterBar';
import { Avatar, Button, Card, ClearFilters, EmptyState, FilterMenu, Notice, SearchField, Toolbar } from '../ui';

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

  // ── Workspaces ──
  'workspace.created': (a) => (
    <>created the workspace <strong>{a.metadata?.name || 'a workspace'}</strong></>
  ),
  'workspace.renamed': (a) => (
    <>renamed the workspace <strong>{a.metadata?.from || 'a workspace'}</strong> to <strong>{a.metadata?.name || 'a new name'}</strong></>
  ),
  'workspace.deleted': (a) => (
    <>deleted the workspace <strong>{a.metadata?.name || 'a workspace'}</strong></>
  ),
  'workspace.members_updated': (a) => (
    <>updated the members of <strong>{a.metadata?.name || 'a workspace'}</strong></>
  ),
  'workspace.share_enabled': (a) => (
    <>turned on the review link for <strong>{a.metadata?.name || 'a workspace'}</strong></>
  ),
  'workspace.share_disabled': (a) => (
    <>turned off the review link for <strong>{a.metadata?.name || 'a workspace'}</strong></>
  ),

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
    <li className="flex items-start gap-3 px-6 py-3.5">
      <Avatar name={actorName(activity)} />
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-gray-700 [&_strong]:font-medium [&_strong]:text-gray-900">
          <span className="font-semibold text-gray-900">{actorName(activity)}</span>{' '}
          {renderMessage(activity)}
        </p>
        <p className="text-caption text-gray-500 mt-0.5" title={new Date(activity.createdAt).toLocaleString()}>{timeAgo(activity.createdAt)}</p>
      </div>
    </li>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-6 py-3.5 animate-pulse">
      <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-2.5 bg-gray-50 rounded w-16" />
      </div>
    </div>
  );
}

// Filter groups by action prefix
const TYPE_OPTIONS = [
  { value: 'project', label: 'Projects', match: (a) => /^(project|version)\./.test(a) },
  { value: 'feedback', label: 'Pins and comments', match: (a) => /^(pin|comment|guest)\./.test(a) },
  { value: 'review', label: 'Review deadlines', match: (a) => /^review\./.test(a) },
  { value: 'people', label: 'People and access', match: (a) => /^member\./.test(a) || a === 'workspace.members_updated' },
  { value: 'sharing', label: 'Review links', match: (a) => /^(share|workspace\.share)/.test(a) },
  { value: 'workspace', label: 'Workspaces', match: (a) => /^workspace\.(created|renamed|deleted)$/.test(a) },
  { value: 'billing', label: 'Plan and billing', match: (a) => /^(billing|org\.(plan|subscription|invoice|trial|limits|locked|unlocked))/.test(a) },
  { value: 'integration', label: 'Integrations', match: (a) => /^integration\./.test(a) },
];
const DAY = 864e5;
function inDateRange(date, range) {
  if (!range?.preset) return true;
  const t = new Date(date).getTime();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (range.preset === 'today') return t >= startOfToday;
  if (range.preset === '7d') return t >= Date.now() - 7 * DAY;
  if (range.preset === '30d') return t >= Date.now() - 30 * DAY;
  if (range.preset === 'month') return t >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (range.preset === 'custom') {
    if (range.start && t < new Date(range.start).getTime()) return false;
    if (range.end && t > new Date(range.end).getTime() + DAY - 1) return false;
  }
  return true;
}
function dayLabel(date) {
  const d = new Date(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today - that) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: today.getFullYear() === d.getFullYear() ? undefined : 'numeric' });
}
const plainText = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(plainText).join(' ');
  return plainText(node.props?.children);
};

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

  const [type, setType] = useState(null);
  const [person, setPerson] = useState(null);
  const [dateRange, setDateRange] = useState({ preset: null, start: '', end: '' });
  const [dateOpen, setDateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const people = useMemo(() => {
    const seen = new Map();
    activities.forEach((a) => { const n = actorName(a); if (!seen.has(n)) seen.set(n, { value: n, label: n }); });
    return [...seen.values()].sort((x, y) => x.label.localeCompare(y.label));
  }, [activities]);

  const q = search.trim().toLowerCase();
  const typeMatch = TYPE_OPTIONS.find((t) => t.value === type)?.match;
  const shown = activities.filter((a) => (!typeMatch || typeMatch(a.action))
    && (!person || actorName(a) === person)
    && inDateRange(a.createdAt, dateRange)
    && (!q || `${actorName(a)} ${plainText(renderMessage(a))}`.toLowerCase().includes(q)));
  const filterCount = (type ? 1 : 0) + (person ? 1 : 0) + (dateRange.preset ? 1 : 0) + (q ? 1 : 0);
  const clearAll = () => { setType(null); setPerson(null); setDateRange({ preset: null, start: '', end: '' }); setSearch(''); };

  const groups = [];
  shown.forEach((a) => {
    const label = dayLabel(a.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(a); else groups.push({ label, items: [a] });
  });

  return (
    <div>
      <Toolbar search={<SearchField value={search} onChange={setSearch} placeholder="Search activity..." label="Search activity" />}>
        <FilterMenu
          label="Type"
          icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>}
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
        />
        <FilterMenu
          label="Person"
          icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
          options={people}
          value={person}
          onChange={setPerson}
        />
        <DateFilterDropdown value={dateRange} onChange={setDateRange} isOpen={dateOpen} onToggle={() => setDateOpen((o) => !o)} onClose={() => setDateOpen(false)} />
        <ClearFilters count={filterCount} onClear={clearAll} />
      </Toolbar>

      {error && <div className="mb-4"><Notice tone="red">{error}</Notice></div>}

      <Card flush title="Activity" description="What happens across your organization: projects, feedback, people, sharing, plan changes and integrations.">
        {loading ? (
          <div className="divide-y divide-gray-100">{[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title={filterCount ? 'Nothing matches these filters' : 'No activity yet'}
            description={filterCount ? (page < pages ? 'Try other filters, or load older activity.' : 'Try other filters.') : 'What people do in your organization shows up here.'}
            action={filterCount ? <Button size="sm" variant="secondary" onClick={clearAll}>Clear filters</Button> : null}
          />
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <p className="px-6 pt-4 pb-1 text-caption font-medium text-gray-500">{g.label}</p>
              <ul className="divide-y divide-gray-100">
                {g.items.map((a) => <ActivityRow key={a._id} activity={a} />)}
              </ul>
            </div>
          ))
        )}
        {!loading && page < pages && (
          <div className="flex justify-center px-6 py-4 border-t border-gray-100">
            <Button variant="secondary" loading={loadingMore} onClick={handleLoadMore}>Load older activity</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
