import React, { useState } from 'react';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../hooks/useAuth';
import { WorkspaceTile } from '../layout/WorkspaceSwitcher';
import { confirmDialog } from '../../utils/confirm';
import { toast, toastError } from '../../utils/toast';
import { WorkspaceMembersDialog, WorkspaceShareDialog } from './WorkspaceDialogs';

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
    <div className="flex items-center gap-3 px-5 py-3.5">
      <WorkspaceTile name={workspace.name} />
      {editing ? (
        <form onSubmit={save} className="flex flex-1 items-center gap-2">
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
          <button type="button" onClick={() => { setEditing(false); setName(workspace.name); }} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {workspace.name}
              {workspace.isDefault && <span className="ml-2 text-xs font-normal text-gray-400">Default</span>}
              {isCurrent && <span className="ml-2 text-xs font-normal text-blue-600">Current</span>}
            </p>
            <p className="text-xs text-gray-500">
              {workspace.projectCount} {workspace.projectCount === 1 ? 'project' : 'projects'}
              {' · '}
              {workspace.memberCount ? `${workspace.memberCount} ${workspace.memberCount === 1 ? 'member' : 'members'}` : 'Owners and admins'}
              {workspace.shareSettings?.enabled && <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-px text-[11px] font-medium text-emerald-700">Link on</span>}
            </p>
          </div>
          <button type="button" onClick={() => onMembers(workspace)} className="px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100">
            Members
          </button>
          <button type="button" onClick={() => onShare(workspace)} className="px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100">
            Share
          </button>
          {isOrgAdmin && (
            <button type="button" onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100">
              Rename
            </button>
          )}
          {isOrgAdmin && !workspace.isDefault && (
            <button type="button" onClick={() => onDelete(workspace)} className="px-3 py-1.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50">
              Delete
            </button>
          )}
        </>
      )}
    </div>
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
  const defaultName = workspaces.find((w) => w.isDefault)?.name || 'the default workspace';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await create(newName.trim());
      setNewName('');
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

  return (
    <div className="mb-10 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900">Workspaces</h3>
          <p className="text-sm text-gray-500 mt-1">
            Group projects by client, team, or product. Add members to give them every project in a workspace, or share one review link with a client. The plan and billing cover all workspaces.
          </p>
        </div>
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {workspaces.map((w) => (
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
        </div>
        {isAdmin && <form onSubmit={handleCreate} className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
          <input
            value={newName}
            maxLength={60}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New workspace name, e.g. Client X"
            className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
          <button type="submit" disabled={!newName.trim() || creating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40">
            {creating ? 'Creating…' : 'Create workspace'}
          </button>
        </form>}
      </div>
      {membersFor && (
        <WorkspaceMembersDialog workspace={membersFor} onClose={() => setMembersFor(null)} onSaved={() => refresh().catch(() => {})} />
      )}
      {shareFor && (
        <WorkspaceShareDialog workspace={shareFor} onClose={() => setShareFor(null)} onSaved={() => refresh().catch(() => {})} />
      )}
    </div>
  );
}
