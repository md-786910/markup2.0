import React from 'react';
import { PLAN_LABELS } from '../../config/plans';
import { relativeDays } from '../../utils/formatters';

const TONES = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  solid: 'bg-blue-600 text-white ring-blue-600',
  dark: 'bg-gray-900 text-white ring-gray-900',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
};

export function Pill({ tone = 'gray', dot = false, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const PLAN_TONES = { free: 'gray', trial: 'amber', starter: 'blue', pro: 'solid', enterprise: 'dark' };

export function PlanBadge({ plan }) {
  return <Pill tone={PLAN_TONES[plan] || 'gray'}>{PLAN_LABELS[plan] || plan}</Pill>;
}

// Lifecycle status computed by the API (lifecycleStatus in admin.controller.js)
const STATUS = {
  paying: ['green', 'Paying'],
  trial: ['blue', 'In trial'],
  trial_ending: ['amber', 'Trial ending'],
  free: ['gray', 'Free'],
  cancelling: ['amber', 'Cancelling'],
  locked: ['red', 'Locked'],
  deleting: ['red', 'Deletion scheduled'],
};

// Trials show the time left instead of repeating the plan name
export function StatusBadge({ status, trialEndsAt }) {
  const [tone, label] = STATUS[status] || ['gray', status];
  const trialing = (status === 'trial' || status === 'trial_ending') && trialEndsAt;
  return <Pill tone={tone} dot>{trialing ? `Ends ${relativeDays(trialEndsAt)}` : label}</Pill>;
}

export const STATUS_OPTIONS = Object.entries(STATUS).map(([value, [, label]]) => ({ value, label }));

const ROLE_TONES = { owner: 'dark', admin: 'blue', member: 'gray', guest: 'amber', superadmin: 'red' };

export function RoleBadge({ role }) {
  return <Pill tone={ROLE_TONES[role] || 'gray'}>{role ? role[0].toUpperCase() + role.slice(1) : '—'}</Pill>;
}

const INVOICE_TONES = { paid: 'green', pending: 'amber', failed: 'red', refunded: 'gray', void: 'gray' };

export function InvoiceStatusBadge({ status }) {
  return <Pill tone={INVOICE_TONES[status] || 'gray'}>{status ? status[0].toUpperCase() + status.slice(1) : '—'}</Pill>;
}

const HEALTH_TONES = { healthy: 'green', watch: 'amber', at_risk: 'red' };
const HEALTH_LABELS = { healthy: 'Healthy', watch: 'Watch', at_risk: 'At risk' };

export function HealthBadge({ health }) {
  if (!health) return <span className="text-gray-400">—</span>;
  const score = health.score != null ? health.score : 50;
  const band = health.band || 'watch';
  const tooltip = (health.reasons && health.reasons.length > 0)
    ? `${score}/100 · ${health.reasons.join(', ')}`
    : `${score}/100`;

  return (
    <span title={tooltip} className="cursor-help inline-block">
      <Pill tone={HEALTH_TONES[band] || 'gray'} dot>
        {score} · {HEALTH_LABELS[band] || band}
      </Pill>
    </span>
  );
}

export const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy (75+)' },
  { value: 'watch', label: 'Watch (40–74)' },
  { value: 'at_risk', label: 'At risk (<40)' },
];
