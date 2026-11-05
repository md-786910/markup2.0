import React, { useEffect, useMemo, useState } from 'react';
import { getOrgActivityApi } from '../../services/authService';
import { Avatar, Banner, Button, EmptyState, FilterPills, Input, PillMenu, Section } from '../kc';
import SettingsLayout, { Muted } from './SettingsLayout';

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
    <li className="flex items-start gap-3 px-5 py-3">
      <Avatar name={actorName(activity)} toneKey={activity.actor?._id || actorName(activity)} />
      <div className="flex-1 min-w-0">
        <p className="m-0 text-ui text-gray-700 [&_strong]:font-medium [&_strong]:text-gray-900">
          <span className="font-semibold text-gray-900">{actorName(activity)}</span>{' '}
          {renderMessage(activity)}
        </p>
        <p className="m-0 mt-0.5 text-caption text-gray-500" title={new Date(activity.createdAt).toLocaleString()}>{timeAgo(activity.createdAt)}</p>
      </div>
    </li>
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
const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
];
const DAY = 864e5;
function inDateRange(date, preset) {
  if (!preset) return true;
  const t = new Date(date).getTime();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (preset === 'today') return t >= startOfToday;
  if (preset === '7d') return t >= Date.now() - 7 * DAY;
  if (preset === '30d') return t >= Date.now() - 30 * DAY;
  if (preset === 'month') return t >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
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

// Settings → Activity log (org owners and admins)
export default function ActivityTab() {
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState(null);
  const [person, setPerson] = useState(null);
  const [datePreset, setDatePreset] = useState(null);
  const [search, setSearch] = useState('');

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
        setError(err.response?.data?.message || 'Could not load activity.');
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
      setError(err.response?.data?.message || 'Could not load more activity.');
    } finally {
      setLoadingMore(false);
    }
  };

  const people = useMemo(() => {
    const seen = new Map();
    activities.forEach((a) => { const n = actorName(a); if (!seen.has(n)) seen.set(n, { value: n, label: n }); });
    return [...seen.values()].sort((x, y) => x.label.localeCompare(y.label));
  }, [activities]);

  const q = search.trim().toLowerCase();
  const typeMatch = TYPE_OPTIONS.find((t) => t.value === type)?.match;
  const shown = activities.filter((a) => (!typeMatch || typeMatch(a.action))
    && (!person || actorName(a) === person)
    && inDateRange(a.createdAt, datePreset)
    && (!q || `${actorName(a)} ${plainText(renderMessage(a))}`.toLowerCase().includes(q)));
  const filterCount = (type ? 1 : 0) + (person ? 1 : 0) + (datePreset ? 1 : 0) + (q ? 1 : 0);
  const clearAll = () => { setType(null); setPerson(null); setDatePreset(null); setSearch(''); };

  const groups = [];
  shown.forEach((a) => {
    const label = dayLabel(a.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(a); else groups.push({ label, items: [a] });
  });

  return (
    <SettingsLayout title="Activity log" subtitle="What happens across your organization.">
      {error && <Banner tone="danger">{error}</Banner>}
      <Section
        flush
        title="Activity"
        description="Projects, feedback, people, sharing, plan changes and integrations."
      >
        <div className="px-5 pt-4">
          <FilterPills
            label="Filter activity"
            end={<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search activity" aria-label="Search activity" style={{ width: 200 }} />}
          >
            <PillMenu label="Type" icon="filter" allLabel="All types" options={TYPE_OPTIONS} value={type} onChange={setType} />
            <PillMenu label="Person" icon="user" allLabel="Everyone" options={people} value={person} onChange={setPerson} />
            <PillMenu label="Date" icon="calendar" allLabel="Any time" options={DATE_OPTIONS} value={datePreset} onChange={setDatePreset} />
            {filterCount > 0 && <Button size="sm" variant="ghost" onClick={clearAll}>Clear filters</Button>}
          </FilterPills>
        </div>
        {loading ? (
          <div className="px-5 pb-5"><Muted>Loading activity…</Muted></div>
        ) : shown.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon="activity"
              title={filterCount ? 'Nothing matches these filters' : 'No activity yet'}
              action={filterCount ? <Button size="sm" onClick={clearAll}>Clear filters</Button> : null}
            >
              {filterCount ? (page < pages ? 'Try other filters, or load older activity.' : 'Try other filters.') : 'What people do in your organization shows up here.'}
            </EmptyState>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <p className="m-0 px-5 pt-3 pb-1 text-ui-label text-gray-500" style={{ borderTop: '1px solid var(--border)' }}>{g.label}</p>
              <ul className="m-0 p-0 list-none divide-y divide-gray-100">
                {g.items.map((a) => <ActivityRow key={a._id} activity={a} />)}
              </ul>
            </div>
          ))
        )}
        {!loading && page < pages && (
          <div className="flex justify-center px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Button loading={loadingMore} onClick={handleLoadMore}>Load older activity</Button>
          </div>
        )}
      </Section>
    </SettingsLayout>
  );
}
