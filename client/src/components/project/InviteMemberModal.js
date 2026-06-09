import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import {
  getWorkspaceMembersApi,
  inviteMemberApi,
  removeMemberApi,
} from '../../services/projectService';

const TABS = [
  { id: 'email', label: 'Email Invite' },
  { id: 'existing', label: "Existing Member's" },
  { id: 'add', label: 'Add Members' },
];

export default function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
  project,
  onInvited,
  onProjectUpdate,
}) {
  const [activeTab, setActiveTab] = useState('email');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedWorkspaceMemberIds, setSelectedWorkspaceMemberIds] = useState([]);
  const [selectedWorkspaceMemberRoles, setSelectedWorkspaceMemberRoles] = useState({});
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const existingMembers = useMemo(() => {
    const seen = new Set();
    const list = [];

    const addMember = (member, extra = {}) => {
      if (!member || !member._id || seen.has(member._id)) return;
      seen.add(member._id);
      list.push({ ...member, ...extra });
    };

    addMember(project?.owner, { role: 'owner' });
    (project?.members || []).forEach((member) => addMember(member));

    return list;
  }, [project]);

  const filteredWorkspaceMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase().replace(/^@/, '');
    if (!query) return workspaceMembers;
    return workspaceMembers.filter((member) => {
      const name = (member.name || '').toLowerCase();
      const emailValue = (member.email || '').toLowerCase();
      return name.includes(query) || emailValue.includes(query);
    });
  }, [workspaceMembers, memberSearch]);

  const selectedWorkspaceMembers = useMemo(
    () =>
      selectedWorkspaceMemberIds
        .map((memberId) => workspaceMembers.find((member) => member._id === memberId))
        .filter(Boolean),
    [selectedWorkspaceMemberIds, workspaceMembers]
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadWorkspaceMembers = async () => {
      setWorkspaceLoading(true);
      setWorkspaceError('');
      try {
        const res = await getWorkspaceMembersApi(projectId);
        if (!cancelled) {
          setWorkspaceMembers(res.data?.members || []);
        }
      } catch (err) {
        if (!cancelled) {
          setWorkspaceMembers([]);
          setWorkspaceError(err.response?.data?.message || 'Failed to load workspace members');
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    };

    setActiveTab('email');
    setError('');
    setEmail('');
    setRole('member');
    setMemberSearch('');
    setSelectedWorkspaceMemberIds([]);
    setSelectedWorkspaceMemberRoles({});
    setRemoveTarget(null);
    loadWorkspaceMembers();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  const toggleWorkspaceMember = (member) => {
    setSelectedWorkspaceMemberIds((prev) => {
      const isSelected = prev.includes(member._id);
      setSelectedWorkspaceMemberRoles((rolesPrev) => {
        if (isSelected) {
          const next = { ...rolesPrev };
          delete next[member._id];
          return next;
        }
        return { ...rolesPrev, [member._id]: rolesPrev[member._id] || member.role || 'member' };
      });
      return isSelected ? prev.filter((id) => id !== member._id) : [...prev, member._id];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const targets = [];
      const trimmedEmail = email.trim();

      if (trimmedEmail) {
        targets.push({ email: trimmedEmail, role });
      }

      selectedWorkspaceMemberIds.forEach((memberId) => {
        const member = workspaceMembers.find((item) => item._id === memberId);
        if (member?.email) {
          targets.push({
            email: member.email,
            role: selectedWorkspaceMemberRoles[memberId] || member.role || 'member',
          });
        }
      });

      const uniqueTargets = [];
      const seenEmails = new Set();
      targets.forEach((target) => {
        const normalizedEmail = target.email.toLowerCase();
        if (seenEmails.has(normalizedEmail)) return;
        seenEmails.add(normalizedEmail);
        uniqueTargets.push(target);
      });

      if (uniqueTargets.length === 0) {
        setError('Add an email or select at least one workspace member.');
        return;
      }

      const results = await Promise.allSettled(
        uniqueTargets.map((target) => inviteMemberApi(projectId, target.email, target.role))
      );

      let latestProject = null;
      const failures = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.data?.project) {
            latestProject = result.value.data.project;
          }
          return;
        }

        failures.push(result.reason?.response?.data?.message || 'Failed to invite member');
      });

      if (latestProject) {
        onInvited(latestProject);
      }

      if (failures.length > 0) {
        setError(failures[0]);
        return;
      }

      setEmail('');
      setRole('member');
      setMemberSearch('');
      setSelectedWorkspaceMemberIds([]);
      setSelectedWorkspaceMemberRoles({});
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoveLoading(true);
    setError('');
    try {
      const res = await removeMemberApi(projectId, removeTarget._id);
      if (res.data?.project) {
        onProjectUpdate?.(res.data.project);
      }
      setRemoveTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Member">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-1">
        <div className="grid grid-cols-3 gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.id === 'email' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25l9 6 9-6M4.5 6.75h15A1.5 1.5 0 0121 8.25v7.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 15.75v-7.5A1.5 1.5 0 014.5 6.75z" />
                  </svg>
                )}
                {tab.id === 'existing' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1m-4-3a4 4 0 100-8 4 4 0 000 8zm-6 8v-1a4 4 0 014-4h2a4 4 0 014 4v1" />
                  </svg>
                )}
                {tab.id === 'add' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3M7 12a4 4 0 100-8 4 4 0 000 8zm7 8v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" />
                  </svg>
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'email' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Member Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="member@example.com"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Use this to invite someone new by email.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-shadow"
              >
                <option value="admin">Admin - Can manage projects & members</option>
                <option value="member">Member - Can create pins & comments</option>
                <option value="guest">Guest - View only access</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'existing' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Existing Members</p>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
              {existingMembers.length > 0 ? (
                existingMembers.map((member) => {
                  const isOwner = member.role === 'owner';
                  const roleLabel = member.role || 'member';

                  return (
                    <div
                      key={member._id}
                      className={`flex items-center gap-3 px-3.5 py-3 ${isOwner ? 'bg-gray-50/80' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {(member.name || member.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {member.name || member.email || 'Unknown member'}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            roleLabel === 'owner'
                              ? 'bg-amber-100 text-amber-700'
                              : roleLabel === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : roleLabel === 'guest'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-gray-100 text-gray-600'
                          }`}>
                            {roleLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      </div>

                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(member)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-3.5 py-6 text-sm text-gray-500">
                  No members are currently assigned to this project.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Add Members</p>
                <p className="text-xs text-gray-400 mt-1">
                  Select workspace members who are not yet on this project. Type <span className="font-medium">@</span> to quick-filter the list.
                </p>
              </div>
              <span className="text-[11px] text-gray-400">{selectedWorkspaceMemberIds.length} selected</span>
            </div>

            {selectedWorkspaceMembers.length > 0 && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Selected Members
                  </p>
                  <span className="text-[11px] text-emerald-700/80">
                    {selectedWorkspaceMembers.length} picked
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkspaceMembers.map((member) => {
                    const selectedRole = selectedWorkspaceMemberRoles[member._id] || member.role || 'member';
                    return (
                      <div
                        key={member._id}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm"
                      >
                        <span className="max-w-[180px] truncate font-medium">
                          {member.name || member.email || 'Unknown member'}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          {selectedRole}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWorkspaceMember(member)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label={`Remove ${member.name || member.email} from selection`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search by name, email, or @name"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-3"
            />

            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
              {workspaceLoading ? (
                <div className="px-3.5 py-8 flex justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : workspaceError ? (
                <div className="px-3.5 py-6 text-sm text-red-600 bg-red-50">
                  {workspaceError}
                </div>
              ) : filteredWorkspaceMembers.length > 0 ? (
                filteredWorkspaceMembers.map((member) => {
                  const checked = selectedWorkspaceMemberIds.includes(member._id);
                  const selectedRole = selectedWorkspaceMemberRoles[member._id] || member.role || 'member';

                  return (
                    <label
                      key={member._id}
                      className={`flex items-start gap-3 px-3.5 py-3 ${checked ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'} transition-colors cursor-pointer`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleWorkspaceMember(member)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-2"
                      />
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {(member.name || member.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {member.name || member.email || 'Unknown member'}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0 capitalize">
                            {member.role || 'member'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>

                        {checked && (
                          <div className="mt-2">
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">Project Role</label>
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedWorkspaceMemberRoles((prev) => ({
                                ...prev,
                                [member._id]: e.target.value,
                              }))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full sm:w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="guest">Guest</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="px-3.5 py-6 text-sm text-gray-500">
                  No workspace members match your search.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}

      {removeTarget && (
        <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Member" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Remove <span className="font-medium text-gray-900">{removeTarget.name || removeTarget.email}</span> from this project?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={removeLoading}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {removeLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
