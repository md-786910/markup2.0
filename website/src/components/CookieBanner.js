import React from 'react';
import { Link } from 'react-router-dom';

// Compact consent bar: one sentence, policy link, three clear choices
export default function CookieBanner({
  visible,
  onAccept,
  onReject,
  onOpenPreferences,
}) {
  if (!visible) return null;
  return (
    <aside
      aria-live="polite"
      aria-label="Cookie consent"
      className="kc fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl sm:inset-x-4 sm:bottom-4"
    >
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-menu)',
          padding: '14px 20px',
        }}
      >
        <p className="km-note flex-1" style={{ margin: 0, color: 'var(--text-secondary)' }}>
          We use essential cookies to run the site, and optional ones for analytics only if you allow them.{' '}
          <Link to="/cookie-policy" className="kc-link" style={{ color: 'var(--brand-600)' }}>
            Cookie policy
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onOpenPreferences} className="kc-btn ghost">
            Customize
          </button>
          <button type="button" onClick={onReject} className="kc-btn sec">
            Reject
          </button>
          <button type="button" onClick={onAccept} className="kc-btn pri">
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}
