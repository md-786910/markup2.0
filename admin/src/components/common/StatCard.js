import React from 'react';
import { Link } from 'react-router-dom';

// One number with a label; `to` makes the card a link to the list behind it
export default function StatCard({ label, value, hint, tone = 'default', to }) {
  const hintTone = { default: 'text-gray-500', good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-red-600' }[tone];
  const body = (
    <>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-gray-900">{value}</p>
      {hint && <p className={`mt-1 text-xs ${hintTone}`}>{hint}</p>}
    </>
  );
  const className = 'block rounded-xl border border-gray-200 bg-white p-5';
  return to ? (
    <Link to={to} className={`${className} transition-colors hover:border-gray-300`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
