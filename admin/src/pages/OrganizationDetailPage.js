import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  getOrganizationDetailApi,
  lockOrganizationApi,
  unlockOrganizationApi,
  setOrganizationPlanApi,
  extendTrialApi,
  setOrganizationLimitsApi,
  refundInvoiceApi,
  addOrganizationNoteApi,
  updateOrganizationNoteApi,
  deleteOrganizationNoteApi,
} from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatCard from '../components/common/StatCard';
import { Avatar, Button, Card, DefinitionList, Field, PageHeader, Tabs, UsageBar, inputClass } from '../components/common/ui';
import { InvoiceStatusBadge, PlanBadge, Pill, RoleBadge, StatusBadge } from '../components/common/StatusBadge';
import { formatDate, formatDateTime, formatLocation, formatMoney, formatUsd, relativeDays, timeAgo } from '../utils/formatters';
import { PLAN_LABELS } from '../config/plans';
import { actorName, describeAction } from '../utils/actions';
import { toast, toastError } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';
import { getSupportTicketsApi } from '../services/adminService';
import { PriorityPill, TicketStatusPill } from '../components/support/supportBadges';

const LIMIT_FIELDS = [
  ['maxProjects', 'Projects'],
  ['maxWorkspaces', 'Workspaces'],
  ['maxMembers', 'Members'],
  ['maxGuests', 'Guests'],
  ['maxStorageMB', 'Storage (MB)'],
];
const FEATURE_FIELDS = [
  ['hasIntegrations', 'Integrations'],
  ['hasActivityLogs', 'Activity log'],
  ['hasVersionHistory', 'Version history'],
];
const PRIORITY_LABELS = { normal: 'Normal', high: 'High', urgent: 'Urgent' };

// "In-app + chat · high priority · 24 h" for a support rule set
function describeSupport(s) {
  if (!s) return '—';
  const channels = s.tickets ? (s.chat ? 'In-app + chat' : 'In-app requests') : 'Email only';
  return [channels, `${(PRIORITY_LABELS[s.priority] || s.priority).toLowerCase()} priority`, s.replyHours ? `${s.replyHours} h` : null].filter(Boolean).join(' · ');
}

// ── Dialogs ──────────────────────────────────────────────────────

function ChangePlanDialog({ org, onClose, onDone }) {
  const [plan, setPlan] = useState(org.plan);
  const [periodEnd, setPeriodEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const priced = plan === 'starter' || plan === 'pro';

  const save = async () => {
    setSaving(true);
    try {
      await setOrganizationPlanApi(org._id, { plan, periodEnd: priced && periodEnd ? periodEnd : undefined });
      toast.success(`Plan set to ${PLAN_LABELS[plan]}.`);
      onDone();
    } catch (err) {
      toastError(err, 'Could not change the plan.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Change plan" size="sm">
      <p className="mb-4 text-sm text-gray-500">Sets the plan without taking a payment, for deals, comps and corrections. Starter and Pro are invoiced as usual from the end date on.</p>
      <div className="space-y-4">
        <Field label="Plan">
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass}>
            {Object.entries(PLAN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {priced && (
          <Field label="Paid until" hint="Leave empty for one month from today.">
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
          </Field>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || (plan === org.plan && !priced)}>{saving ? 'Saving…' : 'Change plan'}</Button>
      </div>
    </Modal>
  );
}

function ExtendTrialDialog({ org, onClose, onDone }) {
  const [days, setDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const from = org.trialEndsAt && new Date(org.trialEndsAt) > new Date() ? new Date(org.trialEndsAt) : new Date();
  const until = new Date(from.getTime() + (Number(days) || 0) * 86400000);

  const save = async () => {
    setSaving(true);
    try {
      await extendTrialApi(org._id, Number(days));
      toast.success(`Trial extended by ${days} days.`);
      onDone();
    } catch (err) {
      toastError(err, 'Could not extend the trial.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Extend trial" size="sm">
      <Field label="Extra days" hint={`The trial will end on ${formatDate(until)}. Reminder emails are sent again before the new date.`}>
        <input type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} className={inputClass} />
      </Field>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || !(days >= 1 && days <= 365)}>{saving ? 'Saving…' : 'Extend trial'}</Button>
      </div>
    </Modal>
  );
}

function LimitsDialog({ org, limits, planSupport, onClose, onDone }) {
  const o = org.limitOverrides || {};
  const yesNo = (v) => (v == null ? '' : String(v));
  const [form, setForm] = useState(() => Object.fromEntries([
    ...LIMIT_FIELDS.map(([k]) => [k, o[k] ?? '']),
    ...FEATURE_FIELDS.map(([k]) => [k, yesNo(o[k])]),
    ['supportTickets', yesNo(o.supportTickets)],
    ['supportChat', yesNo(o.supportChat)],
    ['supportPriority', o.supportPriority || ''],
    ['supportReplyHours', o.supportReplyHours ?? ''],
  ]));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const toNum = (v) => (v === '' || v == null ? null : Number(v));
    const body = Object.fromEntries(LIMIT_FIELDS.map(([k]) => [k, toNum(form[k])]));
    for (const k of [...FEATURE_FIELDS.map(([key]) => key), 'supportTickets', 'supportChat']) if (form[k] !== '') body[k] = form[k] === 'true';
    if (form.supportPriority) body.supportPriority = form.supportPriority;
    body.supportReplyHours = toNum(form.supportReplyHours);
    try {
      await setOrganizationLimitsApi(org._id, body);
      toast.success('Custom limits saved.');
      onDone();
    } catch (err) {
      toastError(err, 'Could not save the limits.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Custom limits" size="lg">
      <p className="mb-4 text-sm text-gray-500">Overrides on top of the {PLAN_LABELS[org.plan]} plan. Leave a field empty to use the plan's value.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {LIMIT_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              type="number"
              min="0"
              value={form[key]}
              placeholder={limits?.[key] >= 999 ? 'Unlimited' : String(limits?.[key] ?? '')}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className={inputClass}
            />
          </Field>
        ))}
        {FEATURE_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass}>
              <option value="">Plan default</option>
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </Field>
        ))}
      </div>
      <h3 className="mb-1 mt-6 text-sm font-semibold text-gray-900">Support</h3>
      <p className="mb-4 text-sm text-gray-500">The plan gives: {describeSupport(planSupport)}.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[['supportTickets', 'In-app requests'], ['supportChat', 'Live chat']].map(([key, label]) => (
          <Field key={key} label={label}>
            <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass}>
              <option value="">Plan default</option>
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </Field>
        ))}
        <Field label="Priority">
          <select value={form.supportPriority} onChange={(e) => setForm({ ...form, supportPriority: e.target.value })} className={inputClass}>
            <option value="">Plan default</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Reply target (hours)">
          <input
            type="number"
            min="1"
            max="720"
            value={form.supportReplyHours}
            placeholder={planSupport?.replyHours ? String(planSupport.replyHours) : 'None'}
            onChange={(e) => setForm({ ...form, supportReplyHours: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save limits'}</Button>
      </div>
    </Modal>
  );
}

function LockDialog({ org, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await lockOrganizationApi(org._id, reason.trim());
      toast.success(`${org.name} is locked.`);
      onDone();
    } catch (err) {
      toastError(err, 'Could not lock the organization.');
      setSaving(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Lock ${org.name}?`} size="sm">
      <p className="mb-4 text-sm text-gray-500">Members can still sign in and read, but can't create or change anything until you unlock it.</p>
      <Field label="Reason" hint="Shown to the organization's members.">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} className={`${inputClass} h-auto py-2`} placeholder="e.g. Suspected abuse, contact support" />
      </Field>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={save} disabled={saving}>{saving ? 'Locking…' : 'Lock organization'}</Button>
      </div>
    </Modal>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────

function OverviewTab({ data, onOpenNotes }) {
  const { organization: org, usage, limits, engagement, pinStats, notes } = data;
  const overrides = org.limitOverrides || {};
  const sub = org.subscription || {};
  const pinned = notes.filter((n) => n.pinned);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="Usage" description={`Against the ${PLAN_LABELS[org.plan]} plan${Object.keys(overrides).length ? ' with custom limits' : ''}`}>
          <div className="grid gap-5 sm:grid-cols-2">
            <UsageBar label="Projects" used={usage.projects} limit={limits.maxProjects} />
            <UsageBar label="Workspaces" used={usage.workspaces} limit={limits.maxWorkspaces} />
            <UsageBar label="Members" used={usage.members} limit={limits.maxMembers} />
            <UsageBar label="Guests" used={usage.guests} limit={limits.maxGuests} />
            <UsageBar label="Storage" used={usage.storageMB} limit={limits.maxStorageMB} unit=" MB" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {FEATURE_FIELDS.map(([key, label]) => (
              <Pill key={key} tone={limits[key] ? 'green' : 'gray'}>
                {limits[key] ? '✓' : '✕'} {label}{overrides[key] != null ? ' (custom)' : ''}
              </Pill>
            ))}
          </div>
        </Card>

        <Card title="Engagement" description="From sign-ins and activity in the app">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {[
              ['Last active', timeAgo(engagement.lastActiveAt)],
              ['Active members', `${engagement.activeMembers7d} in 7 days · ${engagement.activeMembers30d} in 30`],
              ['Pins, last 30 days', engagement.pins30d],
              ['Comments, last 30 days', engagement.comments30d],
              ['Client reviewers', engagement.guestReviewers],
              ['Review links on', engagement.shareLinks],
              ['Pins resolved', pinStats.total ? `${pinStats.resolved} of ${pinStats.total} (${Math.round((pinStats.resolved / pinStats.total) * 100)}%)` : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Account">
          <DefinitionList
            items={[
              ['Plan', <PlanBadge plan={org.plan} />],
              ['Status', <StatusBadge status={data.status} trialEndsAt={org.trialEndsAt} />],
              org.plan === 'trial' && ['Trial ends', `${formatDate(org.trialEndsAt)} (${relativeDays(org.trialEndsAt)})`],
              sub.currentPeriodEnd && [sub.cancelAtPeriodEnd ? 'Ends on' : 'Renews on', formatDate(sub.currentPeriodEnd)],
              sub.provider && ['Paid with', sub.provider === 'razorpay' ? 'Razorpay' : sub.provider === 'paypal' ? 'PayPal' : sub.provider],
              ['Monthly revenue', data.mrr ? formatUsd(data.mrr) : '—'],
              ['Support', `${describeSupport(data.support)}${['supportTickets', 'supportChat', 'supportPriority', 'supportReplyHours'].some((k) => org.limitOverrides?.[k] != null) ? ' (custom)' : ''}`],
              org.billingDetails?.legalName && ['Billed to', org.billingDetails.legalName],
              org.billingDetails?.taxId && ['GSTIN / VAT', org.billingDetails.taxId],
              org.billingDetails?.country && ['Country', [org.billingDetails.state, org.billingDetails.country].filter(Boolean).join(', ')],
              ['Created', formatDate(org.createdAt)],
              org.isLocked && ['Locked', org.lockedReason || 'Yes'],
              org.deletionScheduledAt && ['Deletion on', formatDate(org.deletionScheduledAt)],
            ]}
          />
        </Card>

        <Card title="Pinned notes" actions={<button type="button" onClick={onOpenNotes} className="text-sm font-medium text-blue-600 hover:text-blue-700">All notes</button>}>
          {pinned.length === 0 ? (
            <p className="text-sm text-gray-500">Pin a note to keep it here, e.g. a deal, a promise or who to talk to.</p>
          ) : (
            <ul className="space-y-3">
              {pinned.map((n) => (
                <li key={n._id} className="whitespace-pre-wrap rounded-lg bg-amber-50/60 px-3 py-2 text-sm text-gray-800">{n.body}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function PeopleTab({ data }) {
  const columns = [
    {
      key: 'name',
      label: 'Person',
      render: (row) => (
        <Link to={`/users/${row._id}`} className="flex min-w-[200px] items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <Avatar name={row.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-gray-900 hover:text-blue-700">{row.name}</span>
            <span className="block truncate text-xs text-gray-500">{row.email}</span>
          </span>
        </Link>
      ),
    },
    { key: 'role', label: 'Role', render: (row) => <RoleBadge role={row.role} /> },
    { key: 'lastSeen', label: 'Last active', render: (row) => timeAgo(row.lastSeen) },
    { key: 'location', label: 'Location', render: (row) => formatLocation(row.lastLoginLocation) },
    { key: 'createdAt', label: 'Joined', render: (row) => formatDate(row.createdAt) },
  ];
  return (
    <div className="space-y-6">
      <Card title="Members" padded={false}>
        <DataTable columns={columns} data={data.members} emptyMessage="No members" />
      </Card>
      {data.invitations.length > 0 && (
        <Card title="Pending invitations" padded={false}>
          <div className="divide-y divide-gray-100">
            {data.invitations.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="truncate text-gray-900">{inv.email}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
                  <RoleBadge role={inv.role} />
                  Expires {relativeDays(inv.expiresAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ProjectsTab({ data }) {
  const wsName = Object.fromEntries(data.workspaces.map((w) => [String(w._id), w.name]));
  const defaultWs = data.workspaces.find((w) => w.isDefault);
  const columns = [
    {
      key: 'name',
      label: 'Project',
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="max-w-[260px] truncate text-xs text-gray-500">
            {row.projectType === 'website' ? row.websiteUrl?.replace(/^https?:\/\//, '') : `${row.documents?.length || 0} files`}
          </p>
        </div>
      ),
    },
    { key: 'workspace', label: 'Workspace', render: (row) => wsName[String(row.workspace || defaultWs?._id)] || '—' },
    { key: 'type', label: 'Type', render: (row) => (row.projectType === 'website' ? 'Website' : 'Document') },
    { key: 'status', label: 'Status', render: (row) => <Pill tone={row.status === 'active' ? 'green' : 'gray'}>{row.status === 'active' ? 'Active' : 'Archived'}</Pill> },
    { key: 'share', label: 'Review link', render: (row) => (row.shareSettings?.enabled ? 'On' : <span className="text-gray-400">Off</span>) },
    { key: 'updatedAt', label: 'Updated', render: (row) => timeAgo(row.updatedAt) },
  ];
  return (
    <div className="space-y-6">
      <Card title="Workspaces" padded={false}>
        <div className="divide-y divide-gray-100">
          {data.workspaces.map((w) => (
            <div key={w._id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={w.name} size="sm" square />
                <span className="truncate font-medium text-gray-900">{w.name}</span>
                {w.isDefault && <span className="text-xs text-gray-400">Default</span>}
              </span>
              <span className="flex shrink-0 items-center gap-4 text-xs text-gray-500">
                <span>{w.projectCount} {w.projectCount === 1 ? 'project' : 'projects'}</span>
                <span>{w.memberCount} {w.memberCount === 1 ? 'member' : 'members'}</span>
                {w.shared && <Pill tone="green">Link on</Pill>}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Projects" padded={false}>
        <DataTable columns={columns} data={data.projects} emptyMessage="No projects yet" />
      </Card>
    </div>
  );
}

function BillingTab({ data, onRefund, busy }) {
  const org = data.organization;
  const sub = org.subscription || {};
  const columns = [
    { key: 'createdAt', label: 'Date', render: (row) => <span className="whitespace-nowrap">{formatDate(row.createdAt)}</span> },
    { key: 'invoiceNumber', label: 'Invoice', render: (row) => row.invoiceNumber ? <span className="font-mono text-xs">{row.invoiceNumber}</span> : <span className="text-gray-400">—</span> },
    { key: 'plan', label: 'Plan', render: (row) => <PlanBadge plan={row.plan} /> },
    {
      key: 'period',
      label: 'Period',
      render: (row) => row.billingMonth
        ? <span className="font-mono text-xs">{row.billingMonth}</span>
        : row.periodStart && row.periodEnd
          ? <span className="whitespace-nowrap text-xs text-gray-600">{formatDate(row.periodStart)} – {formatDate(row.periodEnd)}</span>
          : <span className="text-gray-400">—</span>,
    },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => <span className="font-medium text-gray-900">{formatMoney(row.amount, row.currency)}</span> },
    { key: 'status', label: 'Status', render: (row) => <InvoiceStatusBadge status={row.status} /> },
    { key: 'dueAt', label: 'Due', render: (row) => row.status === 'pending' && row.dueAt ? <span className={new Date(row.dueAt) < new Date() ? 'font-medium text-red-600' : ''}>{relativeDays(row.dueAt)}</span> : <span className="text-gray-400">—</span> },
    { key: 'provider', label: 'Provider', render: (row) => row.provider || '—' },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => row.status === 'paid' ? (
        <Button size="sm" variant="danger-soft" disabled={busy} onClick={(e) => { e.stopPropagation(); onRefund(row); }}>Refund</Button>
      ) : null,
    },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Subscription" value={sub.status && sub.status !== 'none' ? sub.status[0].toUpperCase() + sub.status.slice(1) : 'None'} hint={sub.cancelAtPeriodEnd ? 'Cancels at the end of the period' : sub.currentPeriodEnd ? `Renews ${formatDate(sub.currentPeriodEnd)}` : undefined} tone={sub.cancelAtPeriodEnd ? 'warn' : 'default'} />
        <StatCard label="Monthly revenue" value={data.mrr ? formatUsd(data.mrr) : '—'} hint="At the plan's list price" />
        <StatCard
          label="Paid to date"
          value={Object.entries(data.invoices.filter((i) => i.status === 'paid').reduce((acc, i) => ({ ...acc, [i.currency]: (acc[i.currency] || 0) + i.amount }), {}))
            .map(([cur, amt]) => formatMoney(amt, cur)).join(' + ') || '—'}
          hint={`${data.invoices.filter((i) => i.status === 'paid').length} paid invoices`}
        />
      </div>
      <Card title="Invoices" padded={false}>
        <DataTable columns={columns} data={data.invoices} emptyMessage="No invoices yet" />
      </Card>
    </div>
  );
}

// Support requests from this organization
function SupportTab({ orgId }) {
  const [tickets, setTickets] = useState(null);
  useEffect(() => {
    getSupportTicketsApi({ orgId, view: 'all', limit: 50 })
      .then(({ data }) => setTickets(data.tickets))
      .catch(() => setTickets([]));
  }, [orgId]);
  if (!tickets) return <Card><p className="py-6 text-center text-sm text-gray-400">Loading…</p></Card>;
  if (!tickets.length) return <Card><p className="py-6 text-center text-sm text-gray-500">No support requests from this organization.</p></Card>;
  return (
    <Card padded={false}>
      <ul className="divide-y divide-gray-100">
        {tickets.map((t) => (
          <li key={t._id}>
            <Link to={`/support/${t._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{t.subject}</span>
                <span className="block text-xs text-gray-500">#{t.number} · {t.requester?.name || '—'} · {timeAgo(t.createdAt)}</span>
              </span>
              <PriorityPill priority={t.priority} />
              <TicketStatusPill status={t.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ActivityTab({ data }) {
  if (!data.activity.length) return <Card><p className="py-6 text-center text-sm text-gray-500">No activity yet.</p></Card>;
  return (
    <Card padded={false}>
      <ol className="divide-y divide-gray-100">
        {data.activity.map((a) => {
          const byAdmin = a.metadata?.actorRole === 'superadmin';
          return (
            <li key={a._id} className="flex items-start gap-3 px-5 py-3">
              <Avatar name={actorName(a, '?')} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium text-gray-900">{actorName(a)}</span>
                  {byAdmin && <span className="ml-1.5"><Pill tone="red">Admin</Pill></span>}
                  {a.actorGuest?.name && !a.actor && !a.adminActor && <span className="ml-1.5"><Pill>Guest</Pill></span>}{' '}
                  {describeAction(a)}
                  {a.project?.name && <span className="text-gray-500"> in {a.project.name}</span>}
                </p>
                <p className="mt-0.5 text-xs text-gray-400" title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function NotesTab({ data, onChange }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const orgId = data.organization._id;

  const add = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await addOrganizationNoteApi(orgId, body.trim());
      setBody('');
      onChange();
    } catch (err) {
      toastError(err, 'Could not save the note.');
    }
    setSaving(false);
  };

  const togglePin = async (note) => {
    try {
      await updateOrganizationNoteApi(orgId, note._id, { pinned: !note.pinned });
      onChange();
    } catch (err) {
      toastError(err, 'Could not update the note.');
    }
  };

  const remove = async (note) => {
    if (!(await confirmDialog({ title: 'Delete this note?', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await deleteOrganizationNoteApi(orgId, note._id);
      onChange();
    } catch (err) {
      toastError(err, 'Could not delete the note.');
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Add a note" description="Only admins see notes. Customers never do.">
        <form onSubmit={add}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="e.g. Agreed 20% off Pro for the first year; contact is Daniel, CTO."
            className={`${inputClass} h-auto py-2`}
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" variant="primary" disabled={saving || !body.trim()}>{saving ? 'Saving…' : 'Add note'}</Button>
          </div>
        </form>
      </Card>
      {data.notes.length > 0 && (
        <Card padded={false}>
          <ul className="divide-y divide-gray-100">
            {data.notes.map((n) => (
              <li key={n._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{n.body}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => togglePin(n)}>{n.pinned ? 'Unpin' : 'Pin'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(n)}>Delete</Button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  {n.pinned && <span className="mr-1.5 font-medium text-amber-600">Pinned ·</span>}
                  {n.author?.name || 'Admin'} · <span title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // plan | trial | limits | lock
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getOrganizationDetailApi(id);
      setData(res.data);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setTab = (next) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true });
  const closeAndReload = () => { setDialog(null); fetchData(); };

  const handleUnlock = async () => {
    if (!(await confirmDialog({ title: `Unlock ${data.organization.name}?`, message: 'Members can create and change content again.', confirmLabel: 'Unlock' }))) return;
    setBusy(true);
    try {
      await unlockOrganizationApi(id);
      toast.success('Organization unlocked.');
      await fetchData();
    } catch (err) {
      toastError(err, 'Could not unlock the organization.');
    }
    setBusy(false);
  };

  const handleRefund = async (invoice) => {
    const ok = await confirmDialog({
      title: `Refund ${formatMoney(invoice.amount, invoice.currency)}?`,
      message: 'The full amount goes back to the customer through the payment provider. Refunding the current period also ends the paid plan.',
      confirmLabel: 'Refund',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await refundInvoiceApi(invoice._id);
      toast.success(res.data.downgraded ? 'Refunded. The organization moved to Free.' : 'Refund issued.');
      await fetchData();
    } catch (err) {
      toastError(err, 'The refund failed.');
    }
    setBusy(false);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!data) return <p className="py-10 text-center text-gray-500">Organization not found.</p>;

  const { organization: org, engagement } = data;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'people', label: 'People', count: data.members.length },
    { id: 'projects', label: 'Projects', count: data.projects.length },
    { id: 'billing', label: 'Billing', count: data.invoices.length },
    { id: 'support', label: 'Support' },
    { id: 'activity', label: 'Activity' },
    { id: 'notes', label: 'Notes', count: data.notes.length || null },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        back={{ to: '/organizations', label: 'Organizations' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={org.name} size="lg" square />
            <span>{org.name}</span>
            <PlanBadge plan={org.plan} />
            <StatusBadge status={data.status} trialEndsAt={org.trialEndsAt} />
          </span>
        }
        actions={
          <>
            <Button onClick={() => setDialog('plan')}>Change plan</Button>
            {org.plan === 'trial' && <Button onClick={() => setDialog('trial')}>Extend trial</Button>}
            <Button onClick={() => setDialog('limits')}>Custom limits</Button>
            {org.isLocked
              ? <Button variant="secondary" onClick={handleUnlock} disabled={busy}>Unlock</Button>
              : <Button variant="danger-soft" onClick={() => setDialog('lock')}>Lock</Button>}
          </>
        }
      >
        <p className="mt-2 text-sm text-gray-500">
          {org.owner ? <>Owner <Link to={`/users/${org.owner._id}`} className="font-medium text-gray-700 hover:text-blue-700">{org.owner.name}</Link> · {org.owner.email}</> : 'No owner'}
          {' · '}Customer since {formatDate(org.createdAt)}
        </p>
      </PageHeader>

      {org.isLocked && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">Locked.</span> {org.lockedReason || 'No reason given.'}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Monthly revenue" value={data.mrr ? formatUsd(data.mrr) : '—'} hint={org.plan === 'trial' ? `Trial ends ${relativeDays(org.trialEndsAt)}` : undefined} tone={data.status === 'trial_ending' ? 'warn' : 'default'} />
        <StatCard label="Last active" value={timeAgo(engagement.lastActiveAt)} hint={`${engagement.activeMembers7d} of ${data.members.length} members active this week`} />
        <StatCard label="Pins, last 30 days" value={engagement.pins30d} hint={`${engagement.comments30d} comments`} />
        <StatCard label="Projects" value={data.usage.projects} hint={`${data.usage.workspaces} ${data.usage.workspaces === 1 ? 'workspace' : 'workspaces'}`} />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab data={data} onOpenNotes={() => setTab('notes')} />}
      {tab === 'people' && <PeopleTab data={data} />}
      {tab === 'projects' && <ProjectsTab data={data} />}
      {tab === 'billing' && <BillingTab data={data} onRefund={handleRefund} busy={busy} />}
      {tab === 'activity' && <ActivityTab data={data} />}
      {tab === 'support' && <SupportTab orgId={org._id} />}
      {tab === 'notes' && <NotesTab data={data} onChange={fetchData} />}

      {dialog === 'plan' && <ChangePlanDialog org={org} onClose={() => setDialog(null)} onDone={closeAndReload} />}
      {dialog === 'trial' && <ExtendTrialDialog org={org} onClose={() => setDialog(null)} onDone={closeAndReload} />}
      {dialog === 'limits' && <LimitsDialog org={org} limits={data.limits} planSupport={data.planSupport} onClose={() => setDialog(null)} onDone={closeAndReload} />}
      {dialog === 'lock' && <LockDialog org={org} onClose={() => setDialog(null)} onDone={closeAndReload} />}
    </div>
  );
}
