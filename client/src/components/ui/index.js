// Shared building blocks for the app's pages, restyled to the Kommently design
// system (kommently-design-system/, Layout C): 32px controls, 13px text
// (text-ui), hairline cards, pill filters, dot-plus-word badges. New pages
// should prefer the design-system components in components/kc; this kit keeps
// the same look for the screens and dialogs still built on it.
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
    <div ref={panelRef} style={style || { position: 'fixed', visibility: 'hidden' }} className={`${width === 'match' ? '' : width} bg-white border border-gray-200 rounded-xl shadow-[var(--shadow-menu)] p-1.5`}>
      {children}
    </div>,
    document.body,
  );
}

// ── Page layout ──────────────────────────────────────────────────────────────
// The shell's content area already pads the page; `narrow` is the 720px form column
export function Page({ children, narrow = false }) {
  return (
    <div className={`min-w-0 ${narrow ? 'max-w-[720px]' : ''}`}>{children}</div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="kc-ph flex-wrap">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="act shrink-0">{actions}</div>}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-transparent',
  'danger-soft': 'bg-white text-red-600 border border-gray-200 hover:bg-red-50',
  link: 'text-blue-600 hover:underline px-0',
};
// Design system: control-height 32px; sm 28px; lg 36px
const BUTTON_SIZES = {
  sm: 'h-7 px-2.5 text-ui-label gap-1.5',
  md: 'h-8 px-3 text-ui font-medium gap-1.5',
  lg: 'h-9 px-4 text-ui font-medium gap-1.5',
};

export function Spinner({ className = 'w-3.5 h-3.5' }) {
  return <span className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin opacity-70`} aria-hidden="true" />;
}

export function Button({ variant = 'secondary', size = 'md', loading = false, icon = null, className = '', children, disabled, type = 'button', ...props }) {
  const sizeCls = variant === 'link' ? 'h-auto text-ui font-medium gap-1.5' : BUTTON_SIZES[size];
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${sizeCls} ${BUTTON_VARIANTS[variant]} ${className}`}
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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
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
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 max-w-2xl">
            {title && <h2 className="text-section-title text-gray-900">{title}</h2>}
            {description && <p className="text-ui-label font-normal text-gray-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
      {footer && <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">{footer}</div>}
    </section>
  );
}

// Label on the left, control on the right (stacks on small screens)
export function SettingRow({ label, hint, children, last = false }) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-8 ${last ? '' : 'pb-5 mb-5 border-b border-gray-200'}`}>
      <div className="sm:w-48 shrink-0 sm:pt-2">
        <p className="text-ui font-medium text-gray-900">{label}</p>
        {hint && <p className="text-caption text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ── Form controls ────────────────────────────────────────────────────────────
// Design system: field-height 36px, border-control (3.2:1), 2px focus outline
export const inputClass = 'w-full h-9 px-2.5 text-ui text-gray-900 bg-white border border-control rounded-lg placeholder:text-gray-500 hover:border-gray-500 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-blue-600 focus:border-blue-600 disabled:bg-gray-50 disabled:text-gray-500';
export const textareaClass = 'w-full px-2.5 py-2 text-ui text-gray-900 bg-white border border-control rounded-lg placeholder:text-gray-500 hover:border-gray-500 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-blue-600 focus:border-blue-600 resize-y';

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="block text-ui-label text-gray-700 mb-1.5">{label}</label>}
      {children}
      {error ? <p role="alert" className="text-caption text-red-600 mt-1.5">{error}</p> : hint && <p className="text-caption text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${inputClass} ${className}`} {...props} />;
});

export function Checkbox({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="mt-0.5 h-4 w-4 rounded border-control accent-blue-600 text-blue-600 focus:ring-blue-600" />
      <span>
        <span className="block text-ui text-gray-900">{label}</span>
        {description && <span className="block text-caption text-gray-500 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}

// ── Menus: the dashboard filter pill and its dropdown ─────────────────────────
function MenuPanel({ children, align = 'left', width = 'w-52' }) {
  return (
    <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 ${width} bg-white border border-gray-200 rounded-xl shadow-[var(--shadow-menu)] p-1.5 z-30`}>
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
      className={`w-full text-left px-2.5 py-[7px] rounded-[7px] text-ui flex items-center justify-between gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 ${selected ? 'text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900'}`}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2.5">{children}</span>
        {description && <span className="block text-caption font-normal mt-0.5 text-gray-500">{description}</span>}
      </span>
      {selected && <span className="text-blue-600 shrink-0">{Icon.check()}</span>}
    </button>
  );
}

// Design system filter pill: the active pill gets a text-coloured border, not a fill
const pillClass = (active) => `flex items-center gap-1.5 h-[30px] px-[11px] rounded-full text-ui-label border bg-white transition-colors duration-150 ${active
  ? 'border-gray-900 text-gray-900'
  : 'font-normal border-gray-200 text-gray-600 hover:border-gray-300'}`;

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
        <span className="text-gray-500">{Icon.chevron('w-3 h-3')}</span>
      </button>
      {open && (
        <MenuPanel>
          <div role="listbox">
            <MenuOption selected={!active} onClick={() => { onChange(null); setOpen(false); }}>{allLabel}</MenuOption>
            <div className="border-t border-gray-200 my-1.5 mx-0.5" />
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
    ? `w-full flex items-center justify-between gap-2 h-9 px-2.5 text-ui bg-white border rounded-lg ${open ? 'border-blue-600 outline outline-2 outline-offset-1 outline-blue-600' : 'border-control hover:border-gray-500'}`
    : 'flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg text-ui font-medium border bg-white border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors';
  return (
    <div ref={ref} className={`relative ${variant === 'field' ? 'w-full' : ''}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} className={`${trigger} disabled:opacity-50 disabled:pointer-events-none ${className}`}>
        <span className={`truncate ${selected && selected.value !== '' ? 'text-gray-900' : 'text-gray-500'}`}>{selected?.label || placeholder}</span>
        <span className="text-gray-500 shrink-0">{Icon.chevron()}</span>
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
        <div role="menu" className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-[var(--shadow-menu)] p-1.5 z-30">
          {visible.map((item, i) => (item === 'divider'
            ? <div key={`d${i}`} className="border-t border-gray-200 my-1.5 mx-0.5" />
            : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { setOpen(false); item.onClick(); }}
                className={`w-full text-left px-2.5 py-[7px] rounded-[7px] text-ui flex items-center gap-2.5 transition-colors disabled:opacity-50 hover:bg-gray-100 ${item.danger ? 'text-red-600' : 'text-gray-700 hover:text-gray-900'}`}
              >
                {item.icon && <span className={item.danger ? 'text-red-600' : 'text-gray-500'}>{item.icon}</span>}
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
      <button type="button" onClick={() => setExpanded(true)} title={label} aria-label={label} className="inline-flex h-[30px] w-[30px] items-center justify-center text-gray-500 hover:text-gray-700 rounded-full transition-colors border border-gray-200 hover:border-gray-300 bg-white">
        {Icon.search()}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 animate-scale-in">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">{Icon.search()}</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !alwaysOpen) { onChange(''); setExpanded(false); } }}
          placeholder={placeholder}
          aria-label={label}
          className="w-56 h-8 pl-8 pr-8 text-ui bg-white border border-control rounded-lg placeholder:text-gray-500 hover:border-gray-500 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-blue-600 focus:border-blue-600"
        />
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {Icon.close()}
          </button>
        )}
      </div>
      {!alwaysOpen && (
        <button type="button" onClick={() => { setExpanded(false); onChange(''); }} aria-label="Close search" className="inline-flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
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
    <button type="button" onClick={onClear} className="flex items-center gap-1.5 h-[30px] px-2.5 text-ui-label text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
      <span className="tabular-nums">{count}</span>
      <span>Clear filters</span>
      {Icon.close('w-3 h-3')}
    </button>
  );
}

// Row of filter pills, with search on the right
export function Toolbar({ children, search }) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {children}
      {search && <div className="ml-auto flex items-center">{search}</div>}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
// Design system tabs: 2px text-coloured underline over a hairline, plain counts
export function Tabs({ tabs, active, onChange, className = 'mb-5' }) {
  return (
    <div role="tablist" className={`border-b border-gray-200 flex gap-1 overflow-x-auto scrollbar-none ${className}`}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 whitespace-nowrap h-10 px-3 -mb-px text-ui font-medium transition-colors flex items-center gap-1.5 border-b-2 ${isActive ? 'text-gray-900 border-gray-900' : 'text-gray-600 hover:text-gray-900 border-transparent'}`}
          >
            {t.label}
            {t.count != null && (
              <span className="text-micro font-normal tabular-nums text-gray-600">{t.count}</span>
            )}
            {t.dot && <span title={t.dotTitle} className="w-2 h-2 rounded-full bg-red-500" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Badges, avatars, empty states ────────────────────────────────────────────
// Design system badge: always a dot plus the word (colour is never the only
// signal). `dot` is accepted for compatibility; the dot is always shown.
const BADGE_TONES = { gray: 'neutral', blue: 'review', green: 'approved', amber: 'changes', red: 'danger' };
export function Badge({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`kc-st ${BADGE_TONES[tone] || 'neutral'} whitespace-nowrap ${className}`}>
      <i />
      {children}
    </span>
  );
}

// Design system avatar: brand blue filled circle with white initials
export function Avatar({ name, src, size = 'md' }) {
  const cls = { sm: 'sm', md: '', lg: 'lg' }[size] || '';
  const px = { sm: 22, md: 30, lg: 40 }[size] || 30;
  if (src) return <img src={src} alt="" className="rounded-full object-cover shrink-0" style={{ width: px, height: px }} />;
  const key = name || '';
  const initials = key.trim().split(/\s+/).slice(0, size === 'sm' ? 1 : 2).map((x) => x[0]).join('').toUpperCase() || '?';
  return (
    <span className={`kc-av ${cls}`} aria-hidden="true">{initials}</span>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="px-6 py-12 text-center text-gray-500">
      {icon && <div className="flex items-center justify-center mx-auto mb-2 text-gray-500">{icon}</div>}
      <p className="text-section-title text-gray-900">{title}</p>
      {description && <p className="text-ui text-gray-500 mt-1 max-w-[40ch] mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// Small inline notice inside a card (prefer toasts for results of actions)
export function Notice({ tone = 'blue', children, action }) {
  // Design system banner tints; text stays slate so contrast never depends on the tint
  const tones = {
    blue: 'bg-[#eef2ff] border-[#dfe7ff]',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-emerald-50 border-emerald-200',
    gray: 'bg-gray-50 border-gray-200',
  };
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-ui text-gray-900 ${tones[tone]}`}>
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}
