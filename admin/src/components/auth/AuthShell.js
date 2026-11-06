import React, { createContext, useContext, useState } from 'react';
import '../../styles/auth.css';

// Sign-in frame for login, two-step code, forgot and reset password. Same
// design as the customer app's sign-in (client/src/components/layout/AuthLayout):
// brand panel on the left (app-bg: logo, cover artwork, promise, copyright),
// the form on white on the right; below 960px only the form shows. Classes live in styles/auth.css.
const InShell = createContext(false);

function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="var(--brand-600)" />
      <path d="M18.5 16v33M18.5 36.5L39 19M25.1 31L39 49" stroke="var(--white)" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="40.5" cy="17.5" r="7.6" fill="var(--white)" />
      <circle cx="40.5" cy="17.5" r="3" fill="var(--brand-600)" />
    </svg>
  );
}

// The design system's cover artwork: four brand blocks carrying comment pins
// whose ring and dot swap colours per block.
function CoverArt({ className }) {
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

function Wordmark({ small }) {
  return (
    <div className={small ? 'kc-auth-logo kc-auth-logo-sm' : 'kc-auth-logo'}>
      <span className="kc-auth-wordmark"><Mark size={28} />Kommently</span>
      <span className="kc-auth-badge">Admin</span>
    </div>
  );
}

export default function AuthShell({ title, description, children, footer }) {
  const foot = <>&copy; {new Date().getFullYear()} Kommently admin · for staff only</>;
  return (
    <InShell.Provider value={true}>
      <div className="kc-auth">
        <aside className="kc-auth-art">
          <Wordmark />
          <div className="kc-auth-art-in" aria-hidden="true">
            <CoverArt className="kc-auth-cover" />
            <p className="kc-auth-promise">Point at the page. Say what to change.</p>
            <p className="kc-auth-sub">Pins on live websites and PDFs, a thread on each one, and a clear status for every project.</p>
          </div>
          <p className="kc-auth-foot">{foot}</p>
        </aside>
        <main className="kc-auth-form">
          <Wordmark small />
          <div className="kc-auth-body">
            <div className="kc-auth-head">
              <h1 className="kc-display">{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {children}
            {footer && <p className="kc-auth-alt">{footer}</p>}
          </div>
          <p className="kc-auth-foot kc-auth-foot-sm">{foot}</p>
        </main>
      </div>
    </InShell.Provider>
  );
}

// Class for text inputs on the sign-in screens
export const authInputClass = 'kc-input';

// Used outside the sign-in frame too (Account page): keeps the panel's own field style there
const panelInputClass =
  'h-10 w-full rounded-lg border border-gray-200 px-3 text-body focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15';

function BannerIcon({ path }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  info: 'M12 8h.01M11 12h1v5h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  danger: 'M12 9v4M12 17h.01M10.3 4.3L2.6 18a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z',
  success: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

export function AuthBanner({ tone = 'info', children }) {
  if (!children) return null;
  return (
    <div className={`kc-banner ${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="ico"><BannerIcon path={ICONS[tone]} /></span>
      <div style={{ minWidth: 0 }}><p>{children}</p></div>
    </div>
  );
}

export function AuthError({ children }) {
  // children can be [error, extra]: nothing to show while every part is empty
  if (!React.Children.toArray(children).some((c) => c !== '')) return null;
  return <AuthBanner tone="danger">{children}</AuthBanner>;
}

function Spin() {
  return <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-70" />;
}

export function SubmitButton({ loading, children, loadingLabel }) {
  return (
    <button type="submit" disabled={loading} className="kc-btn pri block">
      {loading && <Spin />}
      {loading ? loadingLabel : children}
    </button>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  const inShell = useContext(InShell);
  return (
    <div className={inShell ? 'kc-pass' : 'relative'}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={inShell ? 'kc-input' : `${panelInputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        className={inShell ? undefined : 'absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 transition-colors hover:text-gray-600'}
      >
        {show ? (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
          </svg>
        ) : (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}
