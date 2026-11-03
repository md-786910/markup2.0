import React, { useState } from 'react';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { WorkspaceTile } from '../layout/WorkspaceSwitcher';
import { confirmDialog } from '../../utils/confirm';
import { toast, toastError } from '../../utils/toast';
import { WorkspaceMembersDialog, WorkspaceShareDialog } from './WorkspaceDialogs';
import Modal from '../common/Modal';
import { ActionMenu, Badge, Button, Card, Field, Icon, Input, SearchField } from '../ui';

function WorkspaceRow({ workspace, isCurrent, onRename, onDelete, onMembers, onShare, isOrgAdmin }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === workspace.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await onRename(workspace._id, name.trim());
      setEditing(false);
    } catch (err) {
      toastError(err, 'Could not rename the workspace.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
      {editing ? (
        <form onSubmit={save} className="flex flex-1 flex-wrap items-center gap-2">
          <WorkspaceTile name={workspace.name} />
          <div className="min-w-[200px] flex-1">
            <Input autoFocus value={name} maxLength={60} aria-label="Workspace name" onChange={(e) => setName(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => { setEditing(false); setName(workspace.name); }}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving}>Save</Button>
        </form>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <WorkspaceTile name={workspace.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-medium text-gray-900 truncate">{workspace.name}</p>
                {workspace.isDefault && <Badge>Default</Badge>}
                {isCurrent && <Badge tone="blue">Current</Badge>}
                {workspace.shareSettings?.enabled && <Badge tone="green" dot>Review link on</Badge>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {workspace.projectCount} {workspace.projectCount === 1 ? 'project' : 'projects'}
                {' · '}
                {workspace.memberCount ? `${workspace.memberCount} ${workspace.memberCount === 1 ? 'member' : 'members'}` : 'Owners and admins only'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-12 sm:pl-0">
            <Button size="sm" variant="secondary" onClick={() => onMembers(workspace)}>Members</Button>
            <Button size="sm" variant="secondary" onClick={() => onShare(workspace)}>Share</Button>
            {isOrgAdmin && (
              <ActionMenu
                label={`More for ${workspace.name}`}
                items={[
                  { label: 'Rename', onClick: () => setEditing(true) },
                  !workspace.isDefault && 'divider',
                  !workspace.isDefault && { label: 'Delete workspace', danger: true, onClick: () => onDelete(workspace) },
                ]}
              />
            )}
          </div>
        </>
      )}
    </li>
  );
}

export default function WorkspacesTab() {
  const { workspaces: allWorkspaces, current, create, rename, remove, refresh } = useWorkspaces();
  const { isAdmin } = useAuth();
  // Org admins see every workspace; others the ones they manage
  const workspaces = isAdmin ? allWorkspaces : allWorkspaces.filter((w) => w.myLevel === 'manage');
  const [membersFor, setMembersFor] = useState(null);
  const [shareFor, setShareFor] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const defaultName = workspaces.find((w) => w.isDefault)?.name || 'the default workspace';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await create(newName.trim());
      setNewName('');
      setCreateOpen(false);
      toast.success(`Workspace "${ws.name}" created.`);
    } catch (err) {
      toastError(err, 'Could not create the workspace.');
    } finally {
      setCreating(false);
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

  return (
    <>
      <Card
        flush
        title="Workspaces"
        description="Group projects by client, team or product. Add members to give them every project in a workspace, or share one review link with a client. The plan and billing cover all workspaces."
        actions={(
          <>
            {workspaces.length > 4 && <SearchField value={search} onChange={setSearch} placeholder="Search workspaces..." label="Search workspaces" />}
            {isAdmin && <Button variant="primary" icon={Icon.plus()} onClick={() => setCreateOpen(true)}>New workspace</Button>}
          </>
        )}
      >
        {visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">No workspace matches “{search}”.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((w) => (
              <WorkspaceRow
                key={w._id}
                workspace={w}
                isCurrent={current?._id === w._id}
                onRename={rename}
                onDelete={handleDelete}
                onMembers={setMembersFor}
                onShare={setShareFor}
                isOrgAdmin={isAdmin}
              />
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); setNewName(''); }} title="New workspace" size="sm">
        <form onSubmit={handleCreate} className="space-y-5">
          <Field label="Name" hint="For example a client, a team or a product.">
            <Input autoFocus value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} placeholder="Client X" aria-label="Workspace name" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setNewName(''); }}>Cancel</Button>
            <Button type="submit" variant="primary" loading={creating} disabled={!newName.trim()}>Create workspace</Button>
          </div>
        </form>
      </Modal>
      {membersFor && (
        <WorkspaceMembersDialog workspace={membersFor} onClose={() => setMembersFor(null)} onSaved={() => refresh().catch(() => {})} />
      )}
      {shareFor && (
        <WorkspaceShareDialog workspace={shareFor} onClose={() => setShareFor(null)} onSaved={() => refresh().catch(() => {})} />
      )}
    </>
  );
}
