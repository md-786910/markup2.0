import React from 'react';
import { Logo } from '../kc';

// The design system's cover artwork (kommently-design-system/preview/Cover.html):
// four brand blocks (brand-600, slate-900, brand-100, brand-400, radius-2xl)
// carrying comment pins whose ring and dot swap colours per block.
export function CoverArt({ className }) {
  const pins = [
    // [cx, cy, ring, dot]
    [48, 46, 'var(--white)', 'var(--brand-600)'], [132, 28, 'var(--white)', 'var(--brand-600)'],
    [188, 94, 'var(--white)', 'var(--brand-600)'], [86, 118, 'var(--white)', 'var(--brand-600)'],
    [300, 36, 'var(--brand-400)', 'var(--slate-900)'], [370, 70, 'var(--brand-400)', 'var(--slate-900)'],
    [424, 28, 'var(--brand-400)', 'var(--slate-900)'],
    [292, 166, 'var(--brand-600)', 'var(--brand-100)'], [362, 206, 'var(--brand-600)', 'var(--brand-100)'],
    [422, 154, 'var(--brand-600)', 'var(--brand-100)'], [410, 226, 'var(--brand-600)', 'var(--brand-100)'],
    [44, 198, 'var(--slate-900)', 'var(--brand-400)'], [116, 226, 'var(--slate-900)', 'var(--brand-400)'],
    [198, 202, 'var(--slate-900)', 'var(--brand-400)'],
  ];
  return (
    <svg className={className} viewBox="0 0 456 252" role="img" aria-label="Kommently comment pins on brand blocks">
      <rect x="0" y="0" width="240" height="156" rx="16" fill="var(--brand-600)" />
      <rect x="256" y="0" width="200" height="108" rx="16" fill="var(--cover-ink, var(--slate-900))" />
      <rect x="256" y="124" width="200" height="128" rx="16" fill="var(--brand-100)" />
      <rect x="0" y="172" width="240" height="80" rx="16" fill="var(--brand-400)" />
      {pins.map(([cx, cy, ring, dot]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="13" fill={ring} />
          <circle cx={cx} cy={cy} r="5" fill={dot} />
        </g>
      ))}
    </svg>
  );
}

// Sign-in screens (outside the app shell). Left: the brand panel on app-bg
// (logo and wordmark at 28px, the cover artwork, the promise, copyright).
// Right: the form, centred in a 400px column on the surface. Below 960px the
// brand panel hides and the logo moves above the form.
// Headlines use the design system's display-xl (Plus Jakarta Sans 28/34 700).
export default function AuthLayout({ children }) {
  const year = new Date().getFullYear();
  return (
    <div className="kc kc-auth">
      <aside className="kc-auth-art">
        <a href="/" className="kc-auth-logo" aria-label="Kommently home"><Logo size={28} wordmark onDark /></a>
        <div className="kc-auth-art-in" aria-hidden="true">
          <CoverArt className="kc-auth-cover" />
          <p className="kc-auth-promise">Point at the page. Say what to change.</p>
          <p className="kc-auth-sub">Pins on live websites and PDFs, a thread on each one, and a clear status for every project.</p>
        </div>
        <p className="kc-auth-foot">&copy; {year} Kommently</p>
      </aside>
      <main className="kc-auth-form">
        <a href="/" className="kc-auth-logo kc-auth-logo-sm" aria-label="Kommently home"><Logo size={28} wordmark /></a>
        <div className="kc-auth-body">{children}</div>
        <p className="kc-auth-foot kc-auth-foot-sm">&copy; {year} Kommently</p>
      </main>
    </div>
  );
}

// Shared pieces of the sign-in forms
export function AuthHeading({ title, children }) {
  return (
    <div className="kc-auth-head">
      <h1 className="kc-display">{title}</h1>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
