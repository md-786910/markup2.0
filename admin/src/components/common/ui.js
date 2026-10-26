import React from 'react';
import { Link } from 'react-router-dom';

// Small building blocks shared by every admin page

export function PageHeader({ title, description, actions, back, children }) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          {children}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, description, actions, children, className = '', padded = true }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  'danger-soft': 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
};

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }) {
  const sizes = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm';
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizes} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 px-1 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${
            active === tab.id ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          {tab.label}
          {tab.count != null && (
            <span className={`rounded-full px-1.5 py-px text-[11px] ${active === tab.id ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const AVATAR_TONES = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-gray-200 text-gray-700'];

export function Avatar({ name, size = 'md', square = false }) {
  const initials = (name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  let hash = 0;
  for (const ch of name || '') hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-base' };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center font-semibold ${square ? 'rounded-lg' : 'rounded-full'} ${sizes[size]} ${AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length]}`}>
      {initials}
    </span>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Label / value pairs, e.g. on a customer's overview
export function DefinitionList({ items }) {
  return (
    <dl className="divide-y divide-gray-100">
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
          <dt className="text-gray-500">{label}</dt>
          <dd className="min-w-0 text-right font-medium text-gray-900">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

// Usage against a limit; limit >= 999 means unlimited
export function UsageBar({ label, used, limit, unit = '' }) {
  const unlimited = limit == null || limit >= 999;
  const pct = unlimited ? Math.min(100, used ? 8 : 0) : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const tone = !unlimited && pct >= 100 ? 'bg-red-500' : !unlimited && pct >= 80 ? 'bg-amber-500' : 'bg-blue-600';
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium tabular-nums text-gray-900">
          {used}{unit}
          <span className="font-normal text-gray-400"> / {unlimited ? 'Unlimited' : `${limit}${unit}`}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
