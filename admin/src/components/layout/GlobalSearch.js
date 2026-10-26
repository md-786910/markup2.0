import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizationsApi, getUsersApi } from '../../services/adminService';
import { Avatar } from '../common/ui';
import { PlanBadge } from '../common/StatusBadge';

// Search customers and people from anywhere; "/" focuses it
export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return undefined; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const [orgs, users] = await Promise.all([
          getOrganizationsApi({ search: q, limit: 5 }),
          getUsersApi({ search: q, limit: 5 }),
        ]);
        if (!cancelled) setResults({ orgs: orgs.data.organizations, users: users.data.users });
      } catch {
        if (!cancelled) setResults({ orgs: [], users: [] });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const go = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const empty = results && !results.orgs.length && !results.users.length;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
          if (e.key === 'Enter' && query.trim()) go(`/organizations?search=${encodeURIComponent(query.trim())}`);
        }}
        placeholder="Search organizations and people"
        aria-label="Search organizations and people"
        className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-10 text-sm placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15"
      />
      <kbd className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${query ? 'hidden' : 'hidden sm:block'} rounded border border-gray-200 bg-white px-1.5 text-[11px] text-gray-400`}>/</kbd>

      {open && results && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {empty ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No organizations or people match “{query}”.</p>
          ) : (
            <>
              {results.orgs.length > 0 && (
                <div className="py-1.5">
                  <p className="px-4 py-1 text-xs font-medium text-gray-400">Organizations</p>
                  {results.orgs.map((o) => (
                    <button key={o._id} type="button" onClick={() => go(`/organizations/${o._id}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50">
                      <Avatar name={o.name} size="sm" square />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{o.name}</span>
                        <span className="block truncate text-xs text-gray-500">{o.owner?.email}</span>
                      </span>
                      <PlanBadge plan={o.plan} />
                    </button>
                  ))}
                </div>
              )}
              {results.users.length > 0 && (
                <div className="border-t border-gray-100 py-1.5">
                  <p className="px-4 py-1 text-xs font-medium text-gray-400">People</p>
                  {results.users.map((u) => (
                    <button key={u._id} type="button" onClick={() => go(`/users/${u._id}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50">
                      <Avatar name={u.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{u.name}</span>
                        <span className="block truncate text-xs text-gray-500">{u.email}{u.organization?.name ? ` · ${u.organization.name}` : ''}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
