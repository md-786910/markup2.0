import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { toast, toastError } from '../../utils/toast';
import { Icon, Menu, Tile, tileTone, useDismiss, Button, Input, TILE_TONES } from '../kc';

// Workspace tile tones (blue, green, amber, purple, rose, teal, indigo)
// Assigned by workspace index in the organization so each workspace gets a distinct color
const TILE_CLASSES = {
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  amber: 'bg-amber-500',
  purple: 'bg-purple-600',
  rose: 'bg-rose-500',
  teal: 'bg-teal-600',
  indigo: 'bg-indigo-600',
};

export function workspaceTone(target = '', index, workspacesList) {
  // If target is a workspace object
  const ws = typeof target === 'object' && target !== null ? target : null;
  const name = ws ? (ws.name || '') : (typeof target === 'string' ? target : '');

  // 1. If explicit workspace color is set
  if (ws?.color && TILE_TONES.includes(ws.color)) {
    return ws.color;
  }

  // 2. If index is explicitly provided as a non-negative number
  if (typeof index === 'number' && index >= 0) {
    return TILE_TONES[index % TILE_TONES.length];
  }

  // 3. If workspacesList is provided, find index by ID or name
  if (Array.isArray(workspacesList) && (ws?._id || name)) {
    const foundIdx = workspacesList.findIndex((w) =>
      (ws?._id && w?._id && String(w._id) === String(ws._id)) ||
      (name && w?.name === name)
    );
    if (foundIdx >= 0) {
      return TILE_TONES[foundIdx % TILE_TONES.length];
    }
  }

  // 4. Default to index 0 if it's "General" or first workspace
  if (name.toLowerCase() === 'general') {
    return TILE_TONES[0];
  }

  return tileTone(index, name);
}

export function workspaceColor(target = '', index, workspacesList) {
  return TILE_CLASSES[workspaceTone(target, index, workspacesList)] || 'bg-blue-600';
}

export function WorkspaceTile({ name, workspace, index, className = 'w-8 h-8 text-body-sm' }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center rounded-[7px] font-semibold text-white shrink-0 ${workspaceColor(workspace || name, index)} ${className}`}>
      {((typeof name === 'string' ? name : workspace?.name) || '?').trim()[0]?.toUpperCase() || '?'}
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
  const currentIdx = workspaces.findIndex((w) => w._id === current?._id);
  const currentTone = workspaceTone(current || name, currentIdx >= 0 ? currentIdx : undefined, workspaces);

  const items = [
    { header: `Workspaces in ${user?.orgName || 'your organization'}` },
    ...workspaces.map((w, index) => ({
      label: w.name,
      tile: workspaceTone(w, index, workspaces),
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
    <div
      ref={ref}
      style={{
        height: 'var(--header-height)',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="kc-ws"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Tile letter={name} tone={currentTone} size={28} />
        <span style={{ minWidth: 0, flex: 1 }}>
          <div className="name">{name}</div>
          <div className="sub">{count != null ? `${count} project${count === 1 ? '' : 's'}` : user?.orgName}</div>
        </span>
        <Icon name="updown" size={15} style={{ color: 'var(--slate-500)' }} />
      </button>
      {open && (
        <div className="kc-pop" style={{ top: 'calc(100% + 6px)', left: 10, right: 10 }}>
          <Menu items={items} label="Workspaces" onPick={undefined} style={{ maxHeight: 360, overflow: 'auto' }} />
        </div>
      )}
    </div>
  );
}
