import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStatsApi } from '../services/adminService';
import StatCard from '../components/common/StatCard';
import { Avatar, Card, PageHeader } from '../components/common/ui';
import { PlanBadge } from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatMoney, formatUsd, relativeDays, timeAgo } from '../utils/formatters';
import { PLAN_LABELS } from '../config/plans';
import { describeAction } from '../utils/actions';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The last six calendar months, filled with zero where nobody signed up
function lastSixMonths(rows) {
  const byMonth = Object.fromEntries((rows || []).map((r) => [r._id, r.count]));
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: MONTHS[d.getMonth()], count: byMonth[key] || 0 };
  });
}

function SignupChart({ rows }) {
  const months = lastSixMonths(rows);
  const max = Math.max(1, ...months.map((m) => m.count));
  return (
    <div className="flex h-40 items-end gap-3">
      {months.map((m) => (
        <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-gray-700">{m.count}</span>
          <div className="flex h-24 w-full items-end">
            <div
              className="w-full rounded-md bg-blue-600/85 transition-all"
              style={{ height: `${Math.max(4, (m.count / max) * 100)}%`, opacity: m.count ? 1 : 0.25 }}
              title={`${m.count} signups`}
            />
          </div>
          <span className="text-xs text-gray-500">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

const PLAN_ORDER = ['trial', 'free', 'starter', 'pro', 'enterprise'];
const PLAN_BAR = { free: 'bg-gray-300', trial: 'bg-amber-400', starter: 'bg-blue-300', pro: 'bg-blue-600', enterprise: 'bg-gray-900' };

function PlanMix({ breakdown, total }) {
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
        {PLAN_ORDER.map((p) => breakdown[p] ? (
          <div key={p} className={PLAN_BAR[p]} style={{ width: `${(breakdown[p] / Math.max(total, 1)) * 100}%` }} />
        ) : null)}
      </div>
      <ul className="mt-4 space-y-2.5">
        {PLAN_ORDER.map((p) => (
          <li key={p} className="flex items-center justify-between text-sm">
            <Link to={`/organizations?plan=${p}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <span className={`h-2 w-2 rounded-full ${PLAN_BAR[p]}`} />
              {PLAN_LABELS[p]}
            </Link>
            <span className="font-medium tabular-nums text-gray-900">{breakdown[p] || 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttentionRow({ to, title, detail, badge }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-gray-900">{title}</span>
        <span className="block truncate text-xs text-gray-500">{detail}</span>
      </span>
      {badge}
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStatsApi()
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!data) return <p className="py-10 text-center text-gray-500">Could not load the overview.</p>;

  const { kpis, attention } = data;
  const unpaid = kpis.unpaidInvoices || [];
  const unpaidCount = unpaid.reduce((n, u) => n + u.count, 0);
  const attentionCount = attention.trialsEnding.length + attention.overdueInvoices.length + attention.lockedOrgs.length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Overview"
        description={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Monthly revenue" value={formatUsd(kpis.mrr)} hint={`${kpis.payingOrgs} paying ${kpis.payingOrgs === 1 ? 'organization' : 'organizations'}`} to="/organizations?status=paying" />
        <StatCard
          label="Active trials"
          value={kpis.activeTrials}
          hint={kpis.trialsEnding7d ? `${kpis.trialsEnding7d} ending in 7 days` : 'None ending this week'}
          tone={kpis.trialsEnding7d ? 'warn' : 'default'}
          to="/organizations?status=trial"
        />
        <StatCard
          label="Active organizations"
          value={kpis.activeOrgs7d}
          hint={`of ${kpis.totalOrgs} · used the app in the last 7 days`}
          to="/organizations"
        />
        <StatCard
          label="Unpaid invoices"
          value={unpaidCount}
          hint={unpaidCount ? unpaid.map((u) => formatMoney(u.amount, u.currency)).join(' + ') : 'All invoices are paid'}
          tone={unpaidCount ? 'bad' : 'good'}
          to="/organizations?status=unpaid"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New organizations" value={kpis.newOrgs30d} hint="Last 30 days" />
        <StatCard label="People" value={kpis.totalUsers} hint={`${kpis.activeUsers} active in the last 7 days`} to="/users" />
        <StatCard label="Projects" value={kpis.totalProjects} to="/projects" />
        <StatCard label="Locked organizations" value={kpis.lockedOrgs} tone={kpis.lockedOrgs ? 'warn' : 'default'} to="/organizations?status=locked" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Signups" description="New people per month" className="lg:col-span-2">
          <SignupChart rows={data.monthlySignups} />
        </Card>
        <Card title="Plan mix" description={`${kpis.totalOrgs} organizations`}>
          <PlanMix breakdown={data.planBreakdown} total={kpis.totalOrgs} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Needs attention"
          description={attentionCount ? 'Trials ending soon, overdue invoices and locked accounts' : undefined}
          padded={false}
        >
          {attentionCount === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">Nothing needs attention right now.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {attention.overdueInvoices.map((inv) => (
                <AttentionRow
                  key={inv._id}
                  to={`/organizations/${inv.organization?._id}?tab=billing`}
                  title={inv.organization?.name || 'Organization'}
                  detail={`Invoice ${formatMoney(inv.amount, inv.currency)} was due ${relativeDays(inv.dueAt)}`}
                  badge={<span className="shrink-0 text-xs font-medium text-red-600">Overdue</span>}
                />
              ))}
              {attention.trialsEnding.map((org) => (
                <AttentionRow
                  key={org._id}
                  to={`/organizations/${org._id}`}
                  title={org.name}
                  detail={`Trial ends ${relativeDays(org.trialEndsAt)} · last active ${timeAgo(org.lastActiveAt)}`}
                  badge={<span className="shrink-0 text-xs font-medium text-amber-600">Trial ending</span>}
                />
              ))}
              {attention.lockedOrgs.map((org) => (
                <AttentionRow
                  key={org._id}
                  to={`/organizations/${org._id}`}
                  title={org.name}
                  detail={org.lockedReason || 'Locked'}
                  badge={<span className="shrink-0 text-xs font-medium text-red-600">Locked</span>}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent signups" padded={false} actions={<Link to="/users" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all</Link>}>
          {data.recentSignups.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No signups yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentSignups.map((u) => (
                <Link key={u._id} to={`/users/${u._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                  <Avatar name={u.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{u.name}</span>
                    <span className="block truncate text-xs text-gray-500">{u.organization?.name || u.email}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {u.organization?.plan && <PlanBadge plan={u.organization.plan} />}
                    <span className="text-xs text-gray-400">{timeAgo(u.createdAt)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Admin actions" padded={false} actions={<Link to="/audit" className="text-sm font-medium text-blue-600 hover:text-blue-700">View log</Link>}>
          {data.recentAdminActions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">Plan changes, trial extensions, locks and refunds show up here.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentAdminActions.map((a) => (
                <div key={a._id} className="px-5 py-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{a.actor?.name || 'Admin'}</span> {describeAction(a)}
                    {a.organization && (
                      <> · <Link to={`/organizations/${a.organization._id}`} className="font-medium text-gray-900 hover:text-blue-700">{a.organization.name}</Link></>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{timeAgo(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
