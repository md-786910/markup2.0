import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, useDismiss } from '../kc';

// Searchable project switcher (replaces the native <select>, which renders the
// browser's own unstyled list and gets unwieldy with many projects).
export default function ProjectPicker({ projects = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  useDismiss(ref, open, () => setOpen(false), triggerRef);

  const selected = projects.find((p) => String(p._id) === String(value));
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? projects.filter((p) => (p.name || '').toLowerCase().includes(q)) : projects),
    [projects, q]
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const idx = projects.findIndex((p) => String(p._id) === String(value));
    setActive(idx < 0 ? 0 : idx);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (q) setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (p) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (p && String(p._id) !== String(value)) onChange?.(p._id);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(filtered[active]); }
  };

  const typeIcon = (p) => (p.projectType === 'document' ? 'doc' : 'globe');

  return (
    <div ref={ref} className="kc-picker">
      <button
        ref={triggerRef}
        type="button"
        className={`kc-picker-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select project"
      >
        {selected ? <Icon name={typeIcon(selected)} size={15} className="kc-picker-type" /> : null}
        <span className="kc-picker-label">{selected?.name || 'Select project'}</span>
        <Icon name="down" size={15} className="kc-picker-arrow" />
      </button>

      {open && (
        <div className="kc-pop kc-picker-pop">
          <div className="kc-menu kc-picker-menu">
            <div className="kc-picker-search">
              <Icon name="search" size={15} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search projects"
                aria-label="Search projects"
              />
            </div>
            <div ref={listRef} className="kc-picker-list" role="listbox" aria-label="Projects">
              {filtered.length === 0 ? (
                <div className="kc-picker-empty">No projects match "{query.trim()}"</div>
              ) : (
                filtered.map((p, i) => {
                  const isSel = String(p._id) === String(value);
                  return (
                    <button
                      key={p._id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      data-idx={i}
                      className={`mi${isSel ? ' on' : ''}${i === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(p)}
                    >
                      <Icon name={typeIcon(p)} size={15} />
                      <span className="kc-picker-name">{p.name}</span>
                      {isSel ? <span className="ck"><Icon name="check" size={15} stroke={2} /></span> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
