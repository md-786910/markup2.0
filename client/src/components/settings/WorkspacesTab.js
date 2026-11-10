import React, { useState } from 'react';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { workspaceTone } from '../layout/WorkspaceSwitcher';
import { confirmDialog } from '../../utils/confirm';
import { toast, toastError } from '../../utils/toast';
import { WorkspaceMembersDialog } from './WorkspaceDialogs';
import Modal from '../common/Modal';
import { Badge, Button, DataTable, Field, Icon, Input, RowMenu, Section, Tile, TILE_TONES } from '../kc';
import SettingsLayout, { Muted } from './SettingsLayout';

// Create or rename a workspace (one dialog for both) with name and color selection
function NameDialog({ title, initial = '', initialColor = '', submitLabel, onSubmit, onClose, count = 0 }) {
  const [name, setName] = useState(initial);
  const [color, setColor] = useState(initialColor || TILE_TONES[count % TILE_TONES.length] || 'blue');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), color });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={title} size="sm">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field id="workspace-name" label="Name" hint="For example a client, a team or a product.">
          <Input id="workspace-name" autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Client X" />
        </Field>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
            Workspace color
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {TILE_TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setColor(t)}
                className={`kc-tile ${t}`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  border: color === t ? '2px solid var(--text)' : '2px solid transparent',
                  boxShadow: color === t ? '0 0 0 2px var(--surface)' : 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
                aria-label={t}
              >
                {color === t ? <Icon name="check" size={14} stroke={2.5} /> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!name.trim() || (name.trim() === initial && color === initialColor)}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Settings → Workspaces: org admins see every workspace, workspace managers
// the ones they manage. Members, review link, rename and delete.
export default function WorkspacesTab() {
  const { workspaces: allWorkspaces, current, create, rename, remove, refresh } = useWorkspaces();
  const { isAdmin } = useAuth();
  const workspaces = isAdmin ? allWorkspaces : allWorkspaces.filter((w) => w.myLevel === 'manage');
  const [membersFor, setMembersFor] = useState(null);
  const [renameFor, setRenameFor] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const defaultName = allWorkspaces.find((w) => w.isDefault)?.name || 'the default workspace';

  const handleCreate = async (data) => {
    try {
      const ws = await create(data);
      setCreateOpen(false);
      toast.success(`Workspace "${ws.name}" created.`);
    } catch (err) {
      toastError(err, 'Could not create the workspace.');
    }
  };

  const handleRename = async (data) => {
    try {
      await rename(renameFor._id, data);
      setRenameFor(null);
      toast.success('Workspace updated.');
    } catch (err) {
      toastError(err, 'Could not update the workspace.');
    }
  };

  const handleDelete = async (workspace) => {
    const ok = await confirmDialog({
      title: `Delete "${workspace.name}"?`,
      message: `Its ${workspace.projectCount === 1 ? 'project moves' : 'projects move'} to ${defaultName}. Nothing else is deleted.`,
      confirmLabel: 'Delete workspace',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await remove(workspace._id);
      toast.success(res.movedProjects ? `Workspace deleted. ${res.movedProjects} moved to ${defaultName}.` : 'Workspace deleted.');
    } catch (err) {
      toastError(err, 'Could not delete the workspace.');
    }
  };

  const q = search.trim().toLowerCase();
  const visible = q ? workspaces.filter((w) => w.name.toLowerCase().includes(q)) : workspaces;

  const columns = [
    {
      key: 'name',
      label: 'Workspace',
      render: (w, idx) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Tile letter={w.name} tone={workspaceTone(w, idx, allWorkspaces)} size={28} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-gray-900 truncate">{w.name}</span>
              {w.isDefault && <Badge tone="neutral">Default</Badge>}
              {current?._id === w._id && <Badge status="review">Current</Badge>}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'projects', label: 'Projects', render: (w) => <span className="tabular-nums">{w.projectCount}</span> },
    {
      key: 'members',
      label: 'Members',
      render: (w) => <span className="text-gray-600">{w.memberCount ? w.memberCount : 'Owners and admins'}</span>,
    },
    {
      key: 'actions',
      label: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (w) => (
        <span className="kc-table-actions">
          <Button size="sm" onClick={() => setMembersFor(w)}>Members</Button>
          {isAdmin && (
            <RowMenu
              label={`More for ${w.name}`}
              items={[
                { label: 'Rename & color', icon: 'edit', onClick: () => setRenameFor(w) },
                !w.isDefault && { divider: true },
                !w.isDefault && { label: 'Delete workspace', icon: 'trash', tone: 'danger', onClick: () => handleDelete(w) },
              ]}
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <SettingsLayout title="Workspaces" subtitle="Group projects by client, team or product. The plan covers all of them.">
      <Section
        title="Workspaces"
        description="Members get every project in a workspace."
        action={isAdmin ? <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)} style={{ flexShrink: 0 }}>New workspace</Button> : null}
      >
        {workspaces.length > 4 && (
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workspaces" aria-label="Search workspaces" style={{ maxWidth: 260 }} />
        )}
        {visible.length === 0 ? (
          <Muted>{q ? `No workspace matches "${search}".` : 'No workspaces yet.'}</Muted>
        ) : (
          <DataTable label="Workspaces" columns={columns} rows={visible} />
        )}
      </Section>

      {createOpen && (
        <NameDialog title="New workspace" submitLabel="Create workspace" onSubmit={handleCreate} onClose={() => setCreateOpen(false)} count={allWorkspaces.length} />
      )}
      {renameFor && (
        <NameDialog
          title="Edit workspace"
          initial={renameFor.name}
          initialColor={renameFor.color || workspaceTone(renameFor, undefined, allWorkspaces)}
          submitLabel="Save changes"
          onSubmit={handleRename}
          onClose={() => setRenameFor(null)}
        />
      )}
      {membersFor && (
        <WorkspaceMembersDialog workspace={membersFor} onClose={() => setMembersFor(null)} onSaved={() => refresh().catch(() => {})} />
      )}
    </SettingsLayout>
  );
}
