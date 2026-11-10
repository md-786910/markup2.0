// Kommently design system components (Layout C), ported from
// kommently-design-system/components/bundle.js to real, data-driven React.
// Styles: src/styles/kommently.css (kc-* classes, scoped under `.kc`, which
// AppLayout puts around the signed-in shell). Rules worth remembering:
// one `primary` Button per view, status is always a dot plus a word, icons
// are the outline set below (16 in rows, 18 in the header, 20 in the rail).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PdfThumb from './PdfThumb';

export function cx(...args) { return args.filter(Boolean).join(' '); }

// ── Icons: 24px grid, 1.6 stroke, round caps ────────────────────────────────
const P = {
  grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  archive: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  team: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  gear: ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  help: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
  search: 'M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z',
  plus: 'M12 5v14M5 12h14',
  updown: 'M8 9l4-4 4 4M16 15l-4 4-4-4',
  down: 'M6 9l6 6 6-6',
  right: 'M9 6l6 6-6 6',
  panel: ['M4 5h16v14H4z', 'M9 5v14'],
  menu: 'M4 6h16M4 12h16M4 18h16',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  chat: 'M8 10h8M8 14h5M21 12a8.5 8.5 0 01-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1121 12z',
  out: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 018 0v4'],
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18',
  doc: ['M7 3h7l5 5v13H7z', 'M14 3v5h5'],
  check: 'M5 13l4 4L19 7',
  okc: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  eye: ['M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  card: ['M3 6h18v12H3z', 'M3 10h18'],
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  x: 'M6 6l12 12M18 6L6 18',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  info: 'M12 8h.01M11 12h1v5h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warn: 'M12 9v4M12 17h.01M10.3 4.3L2.6 18a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z',
  copy: ['M9 9h11v11H9z', 'M5 15V5h10'],
  clock: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3',
  restore: 'M4 12a8 8 0 108-8 8 8 0 00-5.7 2.4L4 9m0-5v5h5',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  filter: 'M4 5h16l-6 8v5l-4 2v-7L4 5z',
  calendar: ['M4 6h16v14H4z', 'M4 10h16M8 3v4M16 3v4'],
  board: ['M4 5h5v14H4z', 'M10 5h4v9h-4z', 'M15 5h5v6h-5z'],
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  sort: 'M8 5v14m0 0l-3-3m3 3l3-3M16 19V5m0 0l-3 3m3-3l3 3',
  share: 'M4 12v7h16v-7M12 3v12M8 7l4-4 4 4',
  userplus: ['M15 8a3 3 0 11-6 0 3 3 0 016 0zM4 20a6 6 0 0112 0', 'M19 8v6M16 11h6'],
  monitor: ['M3 5h18v11H3z', 'M8 20h8M12 16v4'],
  tablet: ['M6 3h12v18H6z', 'M11 18h2'],
  phone: ['M8 3h8v18H8z', 'M11 18h2'],
};
export const ICON_NAMES = Object.keys(P).concat(['slack', 'jira', 'discord', 'teams']);

export function Icon({ name, size = 18, stroke, className, style, label }) {
  if (name === 'slack') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden={label ? undefined : 'true'}
        role={label ? 'img' : undefined}
        aria-label={label || 'Slack'}
        className={className}
        style={style}
      >
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523c0-1.394 1.127-2.52 2.52-2.52h2.524v2.52c0 1.395-1.13 2.523-2.524 2.523z" fill="#E01E5A"/>
        <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.521 2.523v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
        <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52 2.528 2.528 0 0 1 2.521-2.522c1.395 0 2.521 1.128 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
        <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
        <path d="M18.956 8.834c1.394 0 2.522 1.127 2.522 2.521 0 1.395-1.128 2.521-2.522 2.521h-2.522V11.355c0-1.394 1.128-2.521 2.522-2.521z" fill="#2EB67D"/>
        <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522C12.645 1.128 13.77 0 15.165 0c1.395 0 2.523 1.128 2.523 2.522v6.312z" fill="#2EB67D"/>
        <path d="M15.165 18.956c0 1.395-1.128 2.522-2.523 2.522a2.528 2.528 0 0 1-2.52-2.522v-2.522h2.52c1.395 0 2.523 1.127 2.523 2.522z" fill="#ECB22E"/>
        <path d="M15.165 17.688a2.527 2.527 0 0 1-2.523-2.523c0-1.394 1.128-2.52 2.523-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
      </svg>
    );
  }

  if (name === 'jira') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden={label ? undefined : 'true'}
        role={label ? 'img' : undefined}
        aria-label={label || 'Jira'}
        className={className}
        style={style}
      >
        <path d="M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8v4.33h4.33c4.78 0 8.67-3.87 8.67-8.68H11.53z" fill="#2684FF"/>
        <path d="M16.14 6.78c0 2.4-1.97 4.35-4.4 4.35H7.4v4.33h4.34c4.78 0 8.67-3.87 8.67-8.68h-4.27z" fill="#0052CC"/>
        <path d="M20.75 11.56c0 2.4-1.97 4.35-4.4 4.35H12v4.34h4.35c4.78 0 8.67-3.88 8.67-8.69h-4.27z" fill="#2684FF"/>
      </svg>
    );
  }

  if (name === 'discord') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden={label ? undefined : 'true'}
        role={label ? 'img' : undefined}
        aria-label={label || 'Discord'}
        className={className}
        style={style}
      >
        <path
          d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
          fill="#5865F2"
        />
      </svg>
    );
  }

  if (name === 'teams') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden={label ? undefined : 'true'}
        role={label ? 'img' : undefined}
        aria-label={label || 'Microsoft Teams'}
        className={className}
        style={style}
      >
        <circle cx="16.5" cy="5.5" r="2.2" fill="#505AC9" />
        <path d="M15 8.5h3.2a2.3 2.3 0 0 1 2.3 2.3v3.2h-5.5v-5.5z" fill="#505AC9" opacity="0.85" />
        <circle cx="9.5" cy="5.5" r="2.8" fill="#464EB8" />
        <rect x="2.5" y="8.5" width="14" height="13.5" rx="2.5" fill="#464EB8" />
        <path d="M6.5 13.5h6M9.5 13.5v6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const d = [].concat(P[name] || []);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke || (name === 'dots' ? 3 : 1.6)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={className}
      style={style}
    >
      {d.map((x, i) => <path key={i} d={x} />)}
    </svg>
  );
}

// ── Brand ───────────────────────────────────────────────────────────────────
export function Logo({ size = 28, wordmark = false, onDark = false }) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 64 64" role={wordmark ? undefined : 'img'} aria-label={wordmark ? undefined : 'Kommently'} aria-hidden={wordmark ? 'true' : undefined} className={wordmark ? undefined : 'logo'}>
      <rect width="64" height="64" rx="15" fill="var(--brand-600)" />
      <path d="M18.5 16v33M18.5 36.5L39 19M25.1 31L39 49" stroke="var(--white)" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="40.5" cy="17.5" r="7.6" fill="var(--white)" />
      <circle cx="40.5" cy="17.5" r="3" fill="var(--brand-600)" />
    </svg>
  );
  if (!wordmark) return mark;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, font: '700 15.5px/20px var(--font-display)', letterSpacing: '-.03em', color: onDark ? 'var(--on-brand)' : 'var(--text)' }}>
      {mark}Kommently
    </span>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────
const BTN = { primary: 'pri', secondary: 'sec', ghost: 'ghost', danger: 'danger', 'danger-quiet': 'danger-quiet' };

function Spin() {
  return <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-70" />;
}

export const Button = React.forwardRef(function Button(
  { variant = 'secondary', size, icon, block, loading = false, className, children, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cx('kc-btn', BTN[variant], size, block && 'block', className)} disabled={disabled || loading} {...rest}>
      {loading ? <Spin /> : icon ? (typeof icon === 'string' ? <Icon name={icon} size={size === 'sm' ? 14 : 16} stroke={variant === 'primary' ? 2 : 1.6} /> : icon) : null}
      {children}
    </button>
  );
});

export const IconButton = React.forwardRef(function IconButton(
  { icon, label, tip, onDark, size, active, badge, iconSize, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx('kc-icb', size, onDark && 'dark', active && 'on', className)}
      aria-label={label}
      data-tip={tip}
      title={tip ? undefined : label}
      {...rest}
    >
      {children || <Icon name={icon} size={iconSize || (size === 'lg' ? 20 : 18)} />}
      {badge ? <span className="kc-badge-dot" /> : null}
    </button>
  );
});

// Review status of a project → badge status. Only the three review states
// have a colour; everything else is neutral (a dot plus the word).
export const STATUS_LABEL = { review: 'In review', approved: 'Approved', changes: 'Changes requested' };
export function Badge({ status, tone, children, className, title }) {
  const t = tone || status || 'neutral';
  return <span className={cx('kc-st', t, className)} title={title}><i />{children || STATUS_LABEL[status]}</span>;
}

export function toneFor(key = '') {
  let h = 0;
  const s = String(key);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
export function initials(n) {
  return String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?';
}
export const AVATAR_TONES = [undefined, 'green', 'amber', 'rose', 'slate'];
export function avatarTone(key, index) {
  if (typeof index === 'number' && index >= 0) {
    return AVATAR_TONES[index % AVATAR_TONES.length];
  }
  if (!key) return undefined;
  return AVATAR_TONES[toneFor(key) % AVATAR_TONES.length];
}

export function Avatar({ name, src, tone, size, toneKey, index, className }) {
  const t = tone !== undefined ? tone : avatarTone(toneKey || name, index);
  if (src) {
    const px = size === 'sm' ? 22 : size === 'lg' ? 40 : 30;
    return <img src={src} alt="" title={name} className={cx('kc-av', size, className)} style={{ width: px, height: px, objectFit: 'cover', background: 'var(--slate-100)' }} />;
  }
  let text = initials(name);
  if (size === 'sm') text = text.slice(0, 1);
  return <span className={cx('kc-av', size, t, className)} title={name}>{text}</span>;
}
export function AvatarStack({ people = [], max = 3 }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className="kc-avs">
        {shown.map((x, i) => (
          <Avatar
            key={x.id || x._id || i}
            name={x.name || x.email}
            tone={x.tone}
            toneKey={x._id || x.id}
            index={i}
            size="sm"
          />
        ))}
      </span>
      {extra > 0 ? <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>+{extra}</span> : null}
    </span>
  );
}

// Workspace tiles: blue, green, amber, purple, rose, teal, indigo, orange, cyan, pink
export const TILE_TONES = [
  'blue',
  'green',
  'amber',
  'purple',
  'rose',
  'teal',
  'indigo',
  'orange',
  'cyan',
  'pink',
];
export function tileTone(index, name) {
  if (typeof index === 'number' && index >= 0) return TILE_TONES[index % TILE_TONES.length];
  if (!name) return TILE_TONES[0];
  return TILE_TONES[toneFor(name) % TILE_TONES.length];
}
export function Tile({ name, letter, tone = 'blue', size = 28 }) {
  return (
    <span className={cx('kc-tile', tone)} style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }} aria-hidden="true">
      {String(letter || name || '?').trim()[0]?.toUpperCase() || '?'}
    </span>
  );
}

// ── Popovers ────────────────────────────────────────────────────────────────
// Closes on outside click and Escape, then returns focus to the trigger.
export function useDismiss(ref, open, onClose, triggerRef) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
      triggerRef?.current?.focus?.();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [ref, open, onClose, triggerRef]);
}

// items: { label, icon?, tile?, checked?, meta?, tone?: 'danger', divider?, header?, onClick?, disabled? }
export function Menu({ items = [], style, className, onPick, label }) {
  return (
    <div className={cx('kc-menu', className)} role="menu" aria-label={label} style={style}>
      {items.filter(Boolean).map((it, i) => {
        if (it.divider) return <hr key={i} />;
        if (it.header) return <div key={i} className="mh">{it.header}</div>;
        if (it.node) return <React.Fragment key={i}>{it.node}</React.Fragment>;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            className={cx('mi', it.checked && 'on', it.tone === 'danger' && 'danger')}
            onClick={() => { onPick?.(); it.onClick?.(); }}
          >
            {it.tile ? <Tile letter={it.label} tone={it.tile} size={22} /> : it.icon ? <Icon name={it.icon} size={16} /> : null}
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
            {it.checked ? <span className="ck"><Icon name="check" size={15} stroke={2} /></span> : it.meta != null ? <span className="meta">{it.meta}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// A trigger plus a Menu that opens 6px below it (or above with `placement` or when space below is limited)
export function MenuButton({ items, renderTrigger, align = 'left', placement = 'below', width, label = 'Menu', className }) {
  const [open, setOpen] = useState(false);
  const [actualPlacement, setActualPlacement] = useState(placement);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  useDismiss(ref, open, () => setOpen(false), triggerRef);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (placement === 'below' && spaceBelow < 220 && spaceAbove > spaceBelow) {
        setActualPlacement('above');
      } else {
        setActualPlacement(placement);
      }
    }
  }, [open, placement]);

  const pos = actualPlacement === 'below' ? { top: 'calc(100% + 6px)' } : { bottom: 'calc(100% + 6px)' };
  return (
    <div ref={ref} className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      {renderTrigger({ ref: triggerRef, open, toggle: () => setOpen((o) => !o), 'aria-haspopup': 'menu', 'aria-expanded': open })}
      {open && (
        <div className="kc-pop" style={{ ...pos, [align === 'right' ? 'right' : 'left']: 0, zIndex: 100 }}>
          <Menu items={items} label={label} onPick={() => setOpen(false)} style={width ? { width } : undefined} />
        </div>
      )}
    </div>
  );
}

// Row actions (⋯)
export function RowMenu({ items, label = 'More actions' }) {
  const visible = (items || []).filter(Boolean);
  if (!visible.length) return null;
  return (
    <MenuButton
      items={visible}
      align="right"
      label={label}
      renderTrigger={({ ref, toggle, ...aria }) => <IconButton ref={ref} icon="dots" label={label} onClick={(e) => { e.stopPropagation(); toggle(); }} {...aria} />}
    />
  );
}

// ── Navigation inside a page ────────────────────────────────────────────────
// items: { id, label, icon? }. Extra pills (menus) go in `children`.
export function FilterPills({ items = [], value, onChange, label = 'Filter', children, end }) {
  return (
    <div className="kc-fb" role="group" aria-label={label}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" className={cx('kc-pill', on && 'on')} aria-pressed={on} onClick={() => onChange?.(it.id)}>
            {it.icon ? <Icon name={it.icon} size={14} /> : null}{it.label}
          </button>
        );
      })}
      {children}
      {end ? <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{end}</span> : null}
    </div>
  );
}

// A pill that opens a menu of options (value null = all)
export function PillMenu({ label, icon, options, value, onChange, allLabel = 'All' }) {
  const selected = options.find((o) => o.value === value);
  const active = value !== null && value !== undefined;
  return (
    <MenuButton
      label={label}
      items={[
        { label: allLabel, checked: !active, onClick: () => onChange(null) },
        { divider: true },
        ...options.map((o) => ({ label: o.label, icon: o.icon, checked: o.value === value, onClick: () => onChange(o.value) })),
      ]}
      renderTrigger={({ ref, toggle, ...aria }) => (
        <button ref={ref} type="button" className={cx('kc-pill', active && 'on')} onClick={toggle} {...aria}>
          {icon ? <Icon name={icon} size={14} /> : null}
          {selected ? selected.label : label}
          <Icon name="down" size={13} />
        </button>
      )}
    />
  );
}

export function Tabs({ items = [], value, onChange }) {
  return (
    <div className="kc-tabs" role="tablist">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} className={cx('kc-tab', on && 'on')} onClick={() => onChange?.(it.id)}>
            {it.label}
            {it.count != null ? <span className="ct">{it.count}</span> : null}
            {it.dot ? <span title={it.dotTitle} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger-500)' }} /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="kc-ph">
      <div style={{ minWidth: 0 }}>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="act">{actions}</div> : null}
    </div>
  );
}

// ── Project thumbnail: a grey wireframe carrying the project's pins ─────────
// pins: [x%, y%, label, resolved?]
export function ProjectThumb({ type = 'web', pins = [], imageSrc, fallbackImageSrc, pdfFile }) {
  const [imgError, setImgError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(imageSrc);
  const [isReady, setIsReady] = useState(() => type !== 'web' || !imageSrc?.includes('wp.com/mshots'));

  useEffect(() => {
    setCurrentSrc(imageSrc);
    setImgError(false);
    setIsReady(type !== 'web' || !imageSrc?.includes('wp.com/mshots'));
  }, [imageSrc, type]);

  // Real-time automatic screenshot resolution for WordPress mshots
  useEffect(() => {
    if (type !== 'web' || !imageSrc || !imageSrc.includes('wp.com/mshots')) {
      return;
    }

    let timer = null;
    let cancelled = false;
    let attempts = 0;
    let createdUrl = null;
    const maxAttempts = 10;

    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(imageSrc, { cache: 'reload' });
        if (cancelled) return;
        const contentType = res.headers.get('content-type') || '';
        const blob = await res.blob();
        if (cancelled) return;

        // When WordPress completes capturing, it returns image/jpeg (size > 20KB)
        const isFinished = contentType.includes('jpeg') || contentType.includes('png') || blob.size > 20000;

        if (isFinished) {
          if (createdUrl) URL.revokeObjectURL(createdUrl);
          createdUrl = URL.createObjectURL(blob);
          setCurrentSrc(createdUrl);
          setIsReady(true);
          return;
        }
      } catch (err) {
        // Ignore network hiccups while polling
      }

      if (!cancelled && attempts < maxAttempts) {
        timer = setTimeout(poll, 2000);
      } else if (!cancelled) {
        setCurrentSrc(imageSrc);
        setIsReady(true);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [imageSrc, type]);

  const handleImgError = () => {
    if (fallbackImageSrc && currentSrc !== fallbackImageSrc) {
      setCurrentSrc(fallbackImageSrc);
    } else {
      setImgError(true);
    }
  };

  const showImage = Boolean(currentSrc) && !imgError && isReady;

  return (
    <div className={`kc-thumb ${type === 'doc' ? 'doc' : 'web'}`}>
      {type === 'doc' ? (
        pdfFile ? (
          <>
            <PdfThumb file={pdfFile} />
            <div className="page">
              <i style={{ width: '60%', height: 6, background: 'var(--slate-400)' }} />
              <i /><i style={{ width: '80%' }} /><i /><i style={{ width: '50%' }} />
              <i style={{ height: 22, background: 'var(--slate-200)' }} />
            </div>
          </>
        ) : showImage ? (
          <img
            className="doc-img"
            src={currentSrc}
            alt=""
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <div className="page">
            <i style={{ width: '60%', height: 6, background: 'var(--slate-400)' }} />
            <i /><i style={{ width: '80%' }} /><i /><i style={{ width: '50%' }} />
            <i style={{ height: 22, background: 'var(--slate-200)' }} />
          </div>
        )
      ) : (
        showImage ? (
          <img
            className="web-img"
            src={currentSrc}
            alt=""
            loading="lazy"
            onError={handleImgError}
          />
        ) : (
          <>
            <i style={{ height: 8, width: '40%' }} />
            <i className="hero" />
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map((i) => <i key={i} style={{ flex: 1, height: 26, background: 'var(--slate-200)' }} />)}
            </div>
            <i style={{ height: 6, width: '70%' }} />
          </>
        )
      )}
      <ThumbPins pins={pins} />
      <div className="kc-thumb-overlay" />
      <span className="kc-thumb-open-btn">Open</span>
    </div>
  );
}
function ThumbPins({ pins }) {
  return pins.map((q, i) => (
    <em key={i} className={cx('pinm', q[3] && 'ok')} style={{ left: `${q[0]}%`, top: `${q[1]}%` }}>
      {q[3] ? <Icon name="check" size={10} stroke={3} /> : q[2]}
    </em>
  ));
}

// ── Table ───────────────────────────────────────────────────────────────────
// columns: { key, label, render?, align?: 'right', width? }
export function DataTable({ columns = [], rows = [], rowKey = (r, i) => r._id || r.id || i, label }) {
  return (
    <div className="kc-tablewrap">
      <table className="kc-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.align === 'right' ? 'r' : undefined} style={c.width ? { width: c.width } : undefined}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'r' : undefined}>{c.render ? c.render(r, i) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Person({ name, email, src, tone, toneKey, index }) {
  return (
    <div className="kc-person">
      <Avatar name={name || email} src={src} tone={tone} toneKey={toneKey} index={index} />
      <div style={{ minWidth: 0 }}>
        <b>{name || email}</b>
        {email && name ? <small>{email}</small> : null}
      </div>
    </div>
  );
}

// ── Forms ───────────────────────────────────────────────────────────────────
export function Field({ id, label, hint, error, children, style }) {
  return (
    <div className="kc-field" style={style}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      {children}
      {error ? (
        <div className="err" role="alert"><Icon name="warn" size={14} />{error}</div>
      ) : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
export const Input = React.forwardRef(function Input({ className, ...p }, ref) {
  return <input ref={ref} type="text" className={cx('kc-input', className)} {...p} />;
});
// options: strings or { value, label }
export const Select = React.forwardRef(function Select(
  { options = [], className, style, disabled, children, onChange, onFocus, onBlur, onMouseDown, onKeyDown, ...p },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const wasOpenRef = useRef(false);

  const handleMouseDown = (e) => {
    if (!disabled) {
      wasOpenRef.current = isOpen;
      if (wasOpenRef.current) {
        setIsOpen(false);
        e.currentTarget.blur();
      } else {
        setIsOpen(true);
      }
    }
    onMouseDown?.(e);
  };

  const handleFocus = (e) => {
    if (!disabled) setIsOpen(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsOpen(false);
    onBlur?.(e);
  };

  const handleChange = (e) => {
    setIsOpen(false);
    e.target.blur();
    onChange?.(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      e.target.blur();
    }
    onKeyDown?.(e);
  };

  return (
    <div className={cx('kc-select-wrap', isOpen && 'is-open', disabled && 'is-disabled')} style={style}>
      <select
        ref={ref}
        disabled={disabled}
        className={cx('kc-select', className)}
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...p}
      >
        {children || options.map((x) => {
          const o = typeof x === 'string' ? { value: x, label: x } : x;
          return <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>;
        })}
      </select>
      <span className="kc-select-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
});
export const Textarea = React.forwardRef(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cx('kc-textarea', className)} {...p} />;
});
export function Toggle({ checked, onChange, label, showLabel, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      className="kc-toggle"
      disabled={disabled}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      onClick={() => !disabled && onChange?.(!checked)}
      aria-label={label && !showLabel ? label : undefined}
    >
      <span className="track" />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}
export function Checkbox({ checked, onChange, label, description, disabled }) {
  return (
    <label className="kc-check" style={{ alignItems: description ? 'flex-start' : 'center', opacity: disabled ? 0.6 : 1 }}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} style={description ? { marginTop: 2 } : undefined} />
      <span>
        <span style={{ display: 'block' }}>{label}</span>
        {description ? <span style={{ display: 'block', fontSize: 12, color: 'var(--slate-500)' }}>{description}</span> : null}
      </span>
    </label>
  );
}

// A bordered settings card: title, one-line description, body, footer (Save/Cancel)
export function Section({ title, description, tone, action, footer, children, flush = false, id }) {
  return (
    <section className={cx('kc-section', tone)} id={id}>
      <div className="sh">
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action || null}
      </div>
      {children ? (flush ? <div>{children}</div> : <div className="sb">{children}</div>) : null}
      {footer ? <div className="sf">{footer}</div> : null}
    </section>
  );
}

// A setting row: name and one muted sentence on the left, the control on the right
export function Row({ title, description, children, last = false, padded = false }) {
  return (
    <div className="kc-row" style={padded ? { padding: '14px 0', borderBottom: last ? 0 : '1px solid var(--border)' } : undefined}>
      <div style={{ minWidth: 0 }}>
        <b>{title}</b>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

// ── Page state ──────────────────────────────────────────────────────────────
export function Banner({ tone = 'info', title, icon, action, children }) {
  const ic = { info: 'info', warning: 'warn', success: 'okc', danger: 'warn' }[tone];
  return (
    <div className={cx('kc-banner', tone)} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="ico"><Icon name={icon || ic} size={18} /></span>
      <div style={{ minWidth: 0 }}>
        {title ? <b>{title}</b> : null}
        {children ? <p>{children}</p> : null}
      </div>
      {action ? <div className="act">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon = 'grid', title, action, children, style }) {
  return (
    <div className="kc-empty" style={style}>
      <Icon name={icon} size={28} />
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action ? <div className="btn">{action}</div> : null}
    </div>
  );
}

export function Progress({ value = 0, label }) {
  return (
    <div className="kc-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// ── Search palette ──────────────────────────────────────────────────────────
// Centred modal opened from the header search box or Ctrl K (SearchPalette).
// items: [{ group, label, icon?, kbd?, sub?, onClick? }]
export function SearchPalette({
  items = [],
  query: initialQuery = '',
  highlighted: initialHighlight = 0,
  onClose,
  placeholder = 'Search projects, pages and actions',
  fixed = true,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [highlighted, setHighlighted] = useState(initialHighlight);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((it) =>
      (it.label && it.label.toLowerCase().includes(q)) ||
      (it.group && it.group.toLowerCase().includes(q)) ||
      (it.sub && it.sub.toLowerCase().includes(q))
    );
  }, [items, q]);

  useEffect(() => {
    setHighlighted(0);
  }, [q]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`.mi.hl`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [highlighted]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) {
        filtered[highlighted].onClick?.();
        onClose?.();
      }
    }
  };

  let lastGroup = null;
  let activeIndex = -1;
  const rows = [];
  filtered.forEach((it, i) => {
    if (it.group !== lastGroup) {
      rows.push(<div key={`g-${it.group}-${i}`} className="mh">{it.group}</div>);
      lastGroup = it.group;
    }
    activeIndex++;
    const isHighlighted = activeIndex === highlighted;
    const itemIndex = activeIndex;
    rows.push(
      <button
        key={`item-${i}-${it.label}`}
        type="button"
        className={cx('mi', isHighlighted && 'hl')}
        onClick={() => {
          it.onClick?.();
          onClose?.();
        }}
        onMouseEnter={() => setHighlighted(itemIndex)}
      >
        <Icon name={it.icon || 'search'} size={16} />
        <span>{it.label}</span>
        {it.sub ? <span className="sub">{it.sub}</span> : null}
        {it.kbd ? <kbd>{it.kbd}</kbd> : null}
      </button>
    );
  });

  return (
    <div
      className={cx('kc-scrim', fixed && 'fixed')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="presentation"
    >
      <div className="kc-pal" role="dialog" aria-modal="true" aria-label="Search" onKeyDown={handleKeyDown}>
        <div className="in">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
          <kbd onClick={onClose} style={{ cursor: 'pointer' }}>Esc</kbd>
        </div>
        <div className="sec">
          <div ref={listRef} className="list">
            {rows.length ? rows : <div className="mh" style={{ padding: '18px 10px' }}>No results</div>}
          </div>
        </div>
        <div className="foot">
          <span>↑ ↓ to move</span>
          <span>Enter to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}

// ── Notification panel ──────────────────────────────────────────────────────
// Popover anchored to the rail's bell icon (NotificationPanel).
// items: [{ id?, pin?, resolved?, who, what, when, preview?, project?, onClick? }]
export function NotificationPanel({
  items = [],
  onMarkAllRead,
  style,
  className,
  onItemClick,
  emptyTitle = "You're all caught up",
  emptyText = 'Comments, mentions and resolved pins will show up here.',
}) {
  return (
    <div className={cx('kc-menu kc-notif', className)} role="dialog" aria-label="Notifications" style={style}>
      <div className="nh">
        <span>Notifications</span>
        {onMarkAllRead ? (
          <button type="button" className="kc-link" style={{ fontSize: 12, border: 0, background: 'none', padding: 0 }} onClick={onMarkAllRead}>
            Mark all read
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--slate-500)' }}>
          <b style={{ display: 'block', fontSize: 13, color: 'var(--slate-700)', marginBottom: 4 }}>{emptyTitle}</b>
          <small style={{ fontSize: 11.5 }}>{emptyText}</small>
        </div>
      ) : (
        <div className="list">
          {items.map((n, i) => (
            <div
              key={n.id || i}
              className="nr"
              role={n.onClick || onItemClick ? 'button' : undefined}
              tabIndex={n.onClick || onItemClick ? 0 : undefined}
              onClick={() => { n.onClick?.(); onItemClick?.(n); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { n.onClick?.(); onItemClick?.(n); } }}
              style={n.onClick || onItemClick ? { cursor: 'pointer' } : undefined}
            >
              <span className={cx('pin', n.resolved && 'ok')}>
                {n.resolved ? <Icon name="check" size={12} stroke={3} /> : (n.pin || '#')}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <b>{n.who}</b> {n.what}
                {n.preview ? <p style={{ margin: '4px 0 0', color: 'var(--slate-500)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.preview}</p> : null}
                <small>{n.when}{n.project ? ` · ${n.project}` : ''}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trial card ──────────────────────────────────────────────────────────────
export function TrialCard({ daysLeft = 12, total = 30, onUpgrade, className, style }) {
  return (
    <div className={cx('kc-trial', className)} style={style}>
      <div className="row">
        <span>Pro trial</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{daysLeft} of {total} days left</span>
      </div>
      <div className="pb">
        <i style={{ width: `${Math.round(((total - daysLeft) / total) * 100)}%` }} />
      </div>
      <button type="button" className="kc-link" style={{ fontSize: 12, border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={onUpgrade}>
        Choose a plan
      </button>
    </div>
  );
}

// ── Project card (presentation) ─────────────────────────────────────────────
export function ProjectCard({
  name,
  type = 'web',
  status = 'review',
  open = 0,
  resolved = 0,
  updated,
  pins = [],
  archived = false,
  people,
  onClick,
}) {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag className={cx('kc-card', 'hover', archived && 'archived')} onClick={onClick} type={onClick ? 'button' : undefined}>
      <ProjectThumb type={type === 'doc' ? 'doc' : 'web'} pins={pins} />
      <div className="kc-cb">
        <div className="kc-ct1">
          <Icon name={type === 'doc' ? 'doc' : 'globe'} size={15} />
          <span>{name}</span>
        </div>
        <div className="kc-cm">
          {archived ? <Badge tone="neutral">Archived</Badge> : <Badge status={status} />}
          <span className="n">{open} open · {resolved} resolved</span>
        </div>
        <div className="kc-cm">
          <AvatarStack people={people || []} />
          {updated ? <span>Updated {updated}</span> : null}
        </div>
      </div>
    </Tag>
  );
}
