import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { toast, toastError } from '../../utils/toast';
import { Icon, Menu, Tile, tileTone, useDismiss, Button, Input } from '../kc';

// Workspace tile tones (design system: tile-blue, tile-green, tile-amber,
// tile-rose), stable per workspace name so a workspace looks the same everywhere
const TILE_CLASSES = { blue: 'bg-blue-600', green: 'bg-emerald-600', amber: 'bg-amber-500', rose: 'bg-rose-500' };
export function workspaceTone(name = '') {
  return tileTone(undefined, name);
}
export function workspaceColor(name = '') {
  return TILE_CLASSES[workspaceTone(name)];
}

export function WorkspaceTile({ name, className = 'w-8 h-8 text-body-sm' }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center rounded-[7px] font-semibold text-white shrink-0 ${workspaceColor(name)} ${className}`}>
      {(name || '?').trim()[0]?.toUpperCase() || '?'}
    </span>
  );
}

// Top of the Projects panel: the selected workspace; the menu (6px below)
// switches, creates and manages workspaces
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
  const triggerRef = useRef(null);

  const close = () => { setOpen(false); setCreating(false); setNewName(''); };
  useDismiss(ref, open, close, triggerRef);

  const go = (id) => {
    select(id);
    close();
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
      close();
      navigate('/dashboard');
      onNavigate?.();
    } catch (err) {
      toastError(err, 'Could not create the workspace.');
    } finally {
      setSaving(false);
    }
  };

  const name = current?.name || user?.orgName || 'Workspace';
  const count = current?.projectCount;

  const items = [
    { header: `Workspaces in ${user?.orgName || 'your organization'}` },
    ...workspaces.map((w) => ({
      label: w.name,
      tile: workspaceTone(w.name),
      checked: current?._id === w._id,
      meta: current?._id === w._id ? undefined : w.projectCount,
      onClick: () => go(w._id),
    })),
  ];
  if (canManage || managesAWorkspace) {
    items.push({ divider: true });
    if (canManage && !creating) items.push({ label: 'Create workspace', icon: 'plus', onClick: () => setCreating(true) });
    if (canManage && creating) {
      items.push({
        node: (
          <form onSubmit={handleCreate} style={{ padding: '6px 4px' }}>
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} placeholder="Workspace name, e.g. Client X" aria-label="Workspace name" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Button size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button size="sm" variant="primary" type="submit" disabled={!newName.trim()} loading={saving}>Create workspace</Button>
            </div>
          </form>
        ),
      });
    }
    items.push({ label: 'Manage workspaces', icon: 'gear', onClick: () => { close(); navigate('/settings?tab=workspaces'); onNavigate?.(); } });
  }

  return (
    <div ref={ref} style={{ padding: '12px 10px 8px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className="kc-ws"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Tile letter={name} tone={workspaceTone(name)} size={28} />
        <span style={{ minWidth: 0, flex: 1 }}>
          <div className="name">{name}</div>
          <div className="sub">{count != null ? `${count} project${count === 1 ? '' : 's'}` : user?.orgName}</div>
        </span>
        <Icon name="updown" size={15} style={{ color: 'var(--slate-500)' }} />
      </button>
      {open && (
        <div className="kc-pop" style={{ top: 'calc(100% - 2px)', left: 10, right: 10 }}>
          <Menu items={items} label="Workspaces" onPick={undefined} style={{ maxHeight: 360, overflow: 'auto' }} />
        </div>
      )}
    </div>
  );
}
