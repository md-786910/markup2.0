// Shared building blocks for the app's pages, cut from the dashboard (page
// header, "New project" button, FilterBar pills and search, project cards), so
// every page looks and behaves the same. Brand blue + slate, rounded-lg
// controls, rounded-xl cards and menus, text-label controls, sentence case.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Icons used by the kit ────────────────────────────────────────────────────
export const Icon = {
  chevron: (cls = 'w-3.5 h-3.5') => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
  ),
  check: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
  ),
  close: (cls = 'w-3.5 h-3.5') => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
  ),
  search: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
  ),
  plus: (cls = 'w-3.5 h-3.5') => (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
  ),
  dots: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
  ),
};

// Closes a popover on outside click and Escape. `extraRef` is a second area
// that counts as inside (e.g. a menu rendered in a portal).
export function useDismiss(ref, open, onClose, extraRef = null) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || extraRef?.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    // Capture phase: Escape closes the menu first, not the dialog around it
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [ref, open, onClose, extraRef]);
}

// A menu that floats above everything (portal), so scrolling lists and dialogs
// never clip it; opens upwards when there is no room below the trigger.
function FloatingPanel({ anchorRef, panelRef, align = 'left', width, children }) {
  const [style, setStyle] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelH = panelRef.current?.offsetHeight || 240;
      const below = window.innerHeight - r.bottom;
      const up = below < panelH + 12 && r.top > below;
      const next = { position: 'fixed', zIndex: 80, top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined };
      if (width === 'match') next.width = r.width;
      if (align === 'right') next.right = window.innerWidth - r.right; else next.left = r.left;
      setStyle(next);
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchorRef, panelRef, align, width]);
  return createPortal(
    <div ref={panelRef} style={style || { position: 'fixed', visibility: 'hidden' }} className={`${width === 'match' ? '' : width} bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 animate-scale-in`}>
      {children}
    </div>,
    document.body,
  );
}

// ── Page layout ──────────────────────────────────────────────────────────────
// Same padding as the dashboard; `narrow` keeps forms readable on wide screens
export function Page({ children, narrow = false }) {
  return (
    <div className={`min-w-0 px-6 lg:px-8 py-6 lg:py-8 animate-page-enter ${narrow ? 'max-w-5xl' : ''}`}>{children}</div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h2 className="text-h3 font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-body-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:text-gray-900 shadow-sm',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  'danger-soft': 'bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300',
  link: 'text-blue-600 hover:text-blue-700 px-0',
};
const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-label gap-1.5',
  md: 'h-9 px-3.5 text-label gap-1.5',
};

export function Spinner({ className = 'w-3.5 h-3.5' }) {
  return <span className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin opacity-70`} aria-hidden="true" />;
}

export function Button({ variant = 'secondary', size = 'md', loading = false, icon = null, className = '', children, disabled, type = 'button', ...props }) {
  const sizeCls = variant === 'link' ? 'h-auto text-label gap-1.5' : BUTTON_SIZES[size];
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${sizeCls} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Cards and sections ───────────────────────────────────────────────────────
// A titled card. `flush` drops the body padding (lists and tables).
export function Card({ title, description, actions, children, flush = false, className = '', footer = null }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 px-6 py-5 border-b border-gray-100 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 max-w-2xl">
            {title && <h3 className="text-body font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-body-sm text-gray-500 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={flush ? '' : 'p-6'}>{children}</div>
      {footer && <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-xl">{footer}</div>}
    </section>
  );
}

// Label on the left, control on the right (stacks on small screens)
export function SettingRow({ label, hint, children, last = false }) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-8 ${last ? '' : 'pb-6 mb-6 border-b border-gray-100'}`}>
      <div className="sm:w-48 shrink-0 sm:pt-2">
        <p className="text-label text-gray-900">{label}</p>
        {hint && <p className="text-caption text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ── Form controls ────────────────────────────────────────────────────────────
export const inputClass = 'w-full h-9 px-3 text-body text-gray-900 bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow disabled:bg-gray-50 disabled:text-gray-500';
export const textareaClass = 'w-full px-3 py-2 text-body text-gray-900 bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow resize-y';

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="block text-label text-gray-700 mb-1.5">{label}</label>}
      {children}
      {error ? <p className="text-caption text-red-600 mt-1.5">{error}</p> : hint && <p className="text-caption text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${inputClass} ${className}`} {...props} />;
});

export function Checkbox({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
      <span>
        <span className="block text-body-sm text-gray-900">{label}</span>
        {description && <span className="block text-caption text-gray-500 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}

// ── Menus: the dashboard filter pill and its dropdown ─────────────────────────
function MenuPanel({ children, align = 'left', width = 'w-52' }) {
  return (
    <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 ${width} bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 animate-scale-in z-40`}>
      {children}
    </div>
  );
}

function MenuOption({ selected, onClick, children, description, disabled = false }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left px-3.5 py-2 text-body-sm flex items-center justify-between gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selected ? 'text-blue-700 bg-blue-50/60' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2.5">{children}</span>
        {description && <span className={`block text-caption mt-0.5 ${selected ? 'text-blue-600/80' : 'text-gray-500'}`}>{description}</span>}
      </span>
      {selected && <span className="text-blue-600 shrink-0">{Icon.check()}</span>}
    </button>
  );
}

const pillClass = (active) => `flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-label border transition-colors duration-150 ${active
  ? 'bg-blue-50 border-blue-200 text-blue-700'
  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'}`;

// Filter pill: "Status ▾" → menu with "All" plus the options (value null = all)
export function FilterMenu({ label, icon, options, value, onChange, renderOption, allLabel = 'All' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));
  const selected = options.find((o) => o.value === value);
  const active = value !== null && value !== undefined;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} className={pillClass(active)}>
        {icon}
        <span>{selected?.label || label}</span>
        <span className={`transition-transform duration-150 ${open ? 'rotate-180' : ''} ${active ? 'text-blue-500' : 'text-gray-400'}`}>{Icon.chevron()}</span>
      </button>
      {open && (
        <MenuPanel>
          <div role="listbox">
            <MenuOption selected={!active} onClick={() => { onChange(null); setOpen(false); }}>{allLabel}</MenuOption>
            <div className="border-t border-gray-100 my-1" />
            {options.map((o) => (
              <MenuOption key={o.value} selected={o.value === value} onClick={() => { onChange(o.value === value ? null : o.value); setOpen(false); }}>
                {renderOption ? renderOption(o) : o.label}
              </MenuOption>
            ))}
          </div>
        </MenuPanel>
      )}
    </div>
  );
}

// Value picker in the same style (e.g. a member's role). `variant="field"`
// gives a full-width form control; options may carry a description.
export function SelectMenu({ value, options, onChange, disabled = false, variant = 'pill', align = 'left', width = 'w-64', ariaLabel, placeholder = 'Select', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const panelRef = useRef(null);
  useDismiss(ref, open, () => setOpen(false), panelRef);
  const selected = options.find((o) => o.value === value);
  const trigger = variant === 'field'
    ? `w-full flex items-center justify-between gap-2 h-9 px-3 text-body bg-white border rounded-lg transition-shadow ${open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'}`
    : 'flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg text-label border bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900 transition-colors';
  return (
    <div ref={ref} className={`relative ${variant === 'field' ? 'w-full' : ''}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} className={`${trigger} disabled:opacity-50 disabled:pointer-events-none ${className}`}>
        <span className={`truncate ${selected && selected.value !== '' ? 'text-gray-900' : 'text-gray-400'}`}>{selected?.label || placeholder}</span>
        <span className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>{Icon.chevron()}</span>
      </button>
      {open && (
        <FloatingPanel anchorRef={ref} panelRef={panelRef} align={align} width={variant === 'field' ? 'match' : width}>
          <div role="listbox" className="max-h-72 overflow-y-auto">
            {options.map((o) => (
              <MenuOption key={o.value} selected={o.value === value} description={o.description} disabled={o.disabled} onClick={() => { setOpen(false); if (o.value !== value) onChange(o.value); }}>
                {o.label}
              </MenuOption>
            ))}
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}

// Row actions (⋯) menu
export function ActionMenu({ label = 'Actions', items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));
  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return (
    <div ref={ref} className="relative">
      <IconButton label={label} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>{Icon.dots()}</IconButton>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 animate-scale-in z-40">
          {visible.map((item, i) => (item === 'divider'
            ? <div key={`d${i}`} className="border-t border-gray-100 my-1" />
            : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick(); }}
                className={`w-full text-left px-3.5 py-2 text-body-sm flex items-center gap-2.5 transition-colors disabled:opacity-50 ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {item.icon && <span className={item.danger ? 'text-red-500' : 'text-gray-400'}>{item.icon}</span>}
                {item.label}
              </button>
            )))}
        </div>
      )}
    </div>
  );
}

// ── Search: the dashboard's icon that opens into a field ─────────────────────
export function SearchField({ value, onChange, placeholder = 'Search…', label = 'Search', alwaysOpen = false }) {
  const [expanded, setExpanded] = useState(alwaysOpen || !!value);
  const inputRef = useRef(null);
  useEffect(() => { if (expanded && !alwaysOpen) inputRef.current?.focus(); }, [expanded, alwaysOpen]);
  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} title={label} aria-label={label} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm bg-white">
        {Icon.search()}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 animate-scale-in">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{Icon.search()}</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !alwaysOpen) { onChange(''); setExpanded(false); } }}
          placeholder={placeholder}
          aria-label={label}
          className="w-56 pl-9 pr-8 py-2 text-body bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
        />
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {Icon.close()}
          </button>
        )}
      </div>
      {!alwaysOpen && (
        <button type="button" onClick={() => { setExpanded(false); onChange(''); }} aria-label="Close search" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          {Icon.close('w-4 h-4')}
        </button>
      )}
    </div>
  );
}

// "2  Clear all ×" after the filter pills
export function ClearFilters({ count, onClear }) {
  if (!count) return null;
  return (
    <button type="button" onClick={onClear} className="flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100">
      <span className="rounded-full bg-blue-100 text-blue-700 text-caption font-semibold flex items-center justify-center" style={{ width: '18px', height: '18px' }}>{count}</span>
      <span>Clear all</span>
      {Icon.close('w-3 h-3')}
    </button>
  );
}

// Row of filter pills, with search on the right
export function Toolbar({ children, search }) {
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {children}
      {search && <div className="ml-auto flex items-center">{search}</div>}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange, className = 'mb-8' }) {
  return (
    <div role="tablist" className={`-mx-6 px-6 sm:mx-0 sm:px-0 border-b border-gray-200 flex gap-6 overflow-x-auto scrollbar-none ${className}`}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 whitespace-nowrap pb-3 -mb-px text-label transition-colors flex items-center gap-2 border-b-2 ${isActive ? 'text-blue-600 border-blue-600' : 'text-gray-500 hover:text-gray-900 border-transparent'}`}
          >
            {t.label}
            {t.count != null && (
              <span className={`text-caption font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
            )}
            {t.dot && <span title={t.dotTitle} className="w-2 h-2 rounded-full bg-red-500" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Badges, avatars, empty states ────────────────────────────────────────────
const BADGE_TONES = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};
export function Badge({ tone = 'gray', dot = false, children, className = '' }) {
  const dotTone = { gray: 'bg-gray-400', blue: 'bg-blue-500', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotTone}`} />}
      {children}
    </span>
  );
}

// Same avatar colours as the dashboard's project cards
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-gray-200 text-gray-700',
];
export function Avatar({ name, src, size = 'md' }) {
  const sz = { sm: 'w-7 h-7 text-caption', md: 'w-9 h-9 text-body-sm', lg: 'w-12 h-12 text-body' }[size];
  if (src) return <img src={src} alt="" className={`${sz} rounded-full object-cover shrink-0`} />;
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span className={`${sz} ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} rounded-full font-semibold flex items-center justify-center shrink-0`} aria-hidden="true">
      {(name || '?').trim()[0]?.toUpperCase() || '?'}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="px-6 py-14 text-center">
      {icon && <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">{icon}</div>}
      <p className="text-body-sm font-semibold text-gray-900">{title}</p>
      {description && <p className="text-body-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// Small inline notice inside a card (prefer toasts for results of actions)
export function Notice({ tone = 'blue', children, action }) {
  const tones = {
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-100 text-red-700',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-body-sm ${tones[tone]}`}>
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}
