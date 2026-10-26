import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { toast, toastError } from '../../utils/toast';

// Tile colors for workspace initials (stable per name)
const TILE_COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-fuchsia-600'];
export function workspaceColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}

export function WorkspaceTile({ name, className = 'w-8 h-8 text-sm' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-lg font-semibold text-white shrink-0 ${workspaceColor(name)} ${className}`}>
      {(name || '?')[0].toUpperCase()}
    </span>
  );
}

// Sidebar block: the selected workspace, a menu to switch, create and manage
export default function WorkspaceSwitcher({ onNavigate }) {
  const { user, canManage } = useAuth();
  const { workspaces, current, select, create } = useWorkspaces();
  const managesAWorkspace = workspaces.some((w) => w.myLevel === 'manage');
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) { setCreating(false); setNewName(''); }
  }, [open]);

  const go = (id) => {
    select(id);
    setOpen(false);
    navigate('/dashboard');
    onNavigate?.();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const ws = await create(newName.trim());
      toast.success(`Workspace "${ws.name}" created.`);
      setOpen(false);
      navigate('/dashboard');
      onNavigate?.();
    } catch (err) {
      toastError(err, 'Could not create the workspace.');
    } finally {
      setSaving(false);
    }
  };

  const name = current?.name || user?.orgName || 'Workspace';

  return (
    <div className="relative px-3 pt-3 pb-3" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${open ? 'bg-gray-800' : 'bg-gray-800/60 hover:bg-gray-800'}`}
      >
        <WorkspaceTile name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.orgName}</p>
        </div>
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-xl border border-gray-700 bg-gray-800 py-1.5 shadow-xl animate-scale-in">
          <p className="px-3 pt-1 pb-1.5 text-xs font-medium text-gray-400">Workspaces in {user?.orgName}</p>
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {workspaces.map((w) => (
              <button
                key={w._id}
                type="button"
                role="menuitem"
                onClick={() => go(w._id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-700/60 transition-colors"
              >
                <WorkspaceTile name={w.name} className="w-6 h-6 text-xs" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-100">{w.name}</span>
                <span className="text-xs text-gray-500 tabular-nums">{w.projectCount}</span>
                {current?._id === w._id && (
                  <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-label="Selected">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {(canManage || managesAWorkspace) && (
            <>
              <div className="my-1.5 border-t border-gray-700" />
              {!canManage ? null : creating ? (
                <form onSubmit={handleCreate} className="px-3 py-1.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={60}
                    placeholder="Workspace name, e.g. Client X"
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setCreating(false)} className="px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white">
                      Cancel
                    </button>
                    <button type="submit" disabled={!newName.trim() || saving} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700/60 transition-colors"
                >
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-lg border border-dashed border-gray-500 text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                    </svg>
                  </span>
                  Create workspace
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); navigate('/settings?tab=workspaces'); onNavigate?.(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
              >
                <span className="inline-flex w-6 h-6 items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                </span>
                Manage workspaces
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
