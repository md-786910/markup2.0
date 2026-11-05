import React, { useRef, useState } from 'react';
import { PROJECT_TYPES, OWNERSHIP_OPTIONS } from '../../utils/projectConstants';
import { FilterPills, Icon, PillMenu, cx, useDismiss } from '../kc';

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

// Date pill (design system filter pill + menu). Also used by Settings → Activity log.
export function DateFilterDropdown({ value, onChange, isOpen, onToggle, onClose, label = 'Created' }) {
  const ref = useRef(null);
  const dateRange = value || { preset: null, start: '', end: '' };
  const selectedLabel = DATE_OPTIONS.find((o) => o.value === dateRange.preset)?.label;
  const isActive = !!dateRange.preset;
  useDismiss(ref, isOpen, onClose);

  const set = (next) => onChange({ ...dateRange, ...next });
  const pick = (preset) => {
    if (preset === null) { onChange({ preset: null, start: '', end: '' }); onClose(); return; }
    set({ preset });
    if (preset !== 'custom') onClose();
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className={cx('kc-pill', isActive && 'on')} onClick={onToggle} aria-haspopup="menu" aria-expanded={isOpen}>
        <Icon name="calendar" size={14} />
        {selectedLabel || label}
        <Icon name="down" size={13} />
      </button>
      {isOpen && (
        <div className="kc-pop" style={{ top: 'calc(100% + 6px)', left: 0 }}>
          <div className="kc-menu" role="menu" aria-label={label} style={{ width: 240 }}>
            {[{ value: null, label: 'Any time' }, ...DATE_OPTIONS].map((o) => {
              const on = (o.value ?? null) === (dateRange.preset ?? null);
              return (
                <button key={o.label} type="button" role="menuitemradio" aria-checked={on} className={cx('mi', on && 'on')} onClick={() => pick(o.value)}>
                  <span>{o.label}</span>
                  {on ? <span className="ck"><Icon name="check" size={15} stroke={2} /></span> : null}
                </button>
              );
            })}
            {dateRange.preset === 'custom' && (
              <>
                <hr />
                <div style={{ display: 'grid', gap: 8, padding: '4px 6px 6px' }}>
                  <div className="kc-field">
                    <label htmlFor="date-from">From</label>
                    <input id="date-from" type="date" className="kc-input" value={dateRange.start} onChange={(e) => set({ preset: 'custom', start: e.target.value })} />
                  </div>
                  <div className="kc-field">
                    <label htmlFor="date-to">To</label>
                    <input id="date-to" type="date" className="kc-input" value={dateRange.end} onChange={(e) => set({ preset: 'custom', end: e.target.value })} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Search that sits at the right of the toolbar
function SearchInput({ value, onChange }) {
  return (
    <div className="kc-filter-search">
      <span className="kc-filter-search-icon">
        <Icon name="search" size={14} />
      </span>
      <input
        type="search"
        className="kc-filter-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onChange(''); }}
        placeholder="Search projects"
        aria-label="Search projects"
      />
      {value && (
        <button
          type="button"
          className="kc-filter-search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
}

// Projects toolbar: review status pills (All first, then workflow order),
// menu pills for type, owner and date, and search on the right.
export default function FilterBar({ status, onStatusChange, filters, onFiltersChange, activeFilterCount, showStatus = true }) {
  const [dateOpen, setDateOpen] = useState(false);
  const update = (key, value) => onFiltersChange({ ...filters, [key]: value });

  return (
    <FilterPills
      label="Filter projects"
      value={showStatus ? status || 'all' : null}
      onChange={(id) => onStatusChange(id === 'all' ? null : id)}
      items={showStatus ? [
        { id: 'all', label: 'All' },
        { id: 'in_review', label: 'In review' },
        { id: 'changes_requested', label: 'Changes requested' },
        { id: 'approved', label: 'Approved' },
      ] : []}
      end={<SearchInput value={filters.search} onChange={(v) => update('search', v)} />}
    >
      <PillMenu label="Websites and documents" icon="globe" allLabel="Websites and documents" options={PROJECT_TYPES} value={filters.type} onChange={(v) => update('type', v)} />
      <PillMenu label="Anyone's" icon="user" allLabel="Anyone's" options={OWNERSHIP_OPTIONS} value={filters.ownership} onChange={(v) => update('ownership', v)} />
      <DateFilterDropdown
        value={filters.dateRange}
        onChange={(v) => update('dateRange', v)}
        isOpen={dateOpen}
        onToggle={() => setDateOpen((o) => !o)}
        onClose={() => setDateOpen(false)}
      />
      {activeFilterCount > 0 && (
        <button
          type="button"
          className="kc-link"
          style={{ fontSize: 12.5, padding: '0 4px' }}
          onClick={() => onFiltersChange({ ...filters, type: null, ownership: null, search: '', dateRange: { preset: null, start: '', end: '' } })}
        >
          Clear filters
        </button>
      )}
    </FilterPills>
  );
}
