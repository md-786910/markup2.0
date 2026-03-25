import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  inviteMemberApi,
  removeMemberApi,
  updateMemberRoleApi,
} from '../../services/projectService';
import {
  getProjectInvitationsApi,
  cancelInvitationApi,
} from '../../services/invitationService';

export default function MembersTab({ members, projects, isAdmin, currentUserId, onProjectsChanged }) {
  const navigate = useNavigate();
  const [inviteProjectId, setInviteProjectId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [roleLoading, setRoleLoading] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchInvitations = useCallback(async () => {
    if (!projects?.length) return;
    setInvitationsLoading(true);
    try {
      const results = await Promise.all(
        projects.filter((p) => p.status === 'active').map((p) =>
          getProjectInvitationsApi(p._id)
            .then((res) => res.data.invitations.map((inv) => ({ ...inv, projectName: p.name })))
            .catch(() => [])
        )
      );
      setPendingInvitations(results.flat());
    } catch {
      setPendingInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleCancelInvitation = async (invitationId) => {
    setCancellingId(invitationId);
    try {
      await cancelInvitationApi(invitationId);
      setPendingInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = search
    ? members.filter(
        (m) =>
          (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (m.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : members;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteProjectId) return;
    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);
    try {
      const res = await inviteMemberApi(inviteProjectId, inviteEmail, inviteRole);
      const msg = res.data?.invitation
        ? `Invitation sent to ${inviteEmail}`
        : `${inviteEmail} added successfully`;
      setInviteSuccess(msg);
      setInviteEmail('');
      onProjectsChanged();
      fetchInvitations();
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (member, newRole) => {
    // Use the first project this member belongs to for the API call
    const project = member.projects?.[0];
    if (!project) return;
    setRoleLoading(member._id);
    try {
      await updateMemberRoleApi(project._id, member._id, newRole);
      onProjectsChanged();
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setRoleLoading(null);
    }
  };

  const handleRemove = async (member, projectId) => {
    setRemoveLoading(`${member._id}-${projectId}`);
    try {
      await removeMemberApi(projectId, member._id);
      onProjectsChanged();
      setConfirmRemove(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemoveLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite card */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Add Member to Project</h3>
          <p className="text-xs text-gray-400 mb-4">
            Invite by email. Existing users are added instantly; new users receive a signup link.
          </p>

          {inviteError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg mb-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-lg mb-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {inviteSuccess}
            </div>
          )}

          <form onSubmit={handleInvite} className="flex gap-3 flex-wrap sm:flex-nowrap">
            <select
              value={inviteProjectId}
              onChange={(e) => setInviteProjectId(e.target.value)}
              required
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
            >
              <option value="">Select project...</option>
              {projects.filter((p) => p.status === 'active').map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
              placeholder="member@example.com"
              required
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0 transition-colors"
            >
              {inviteLoading ? 'Sending...' : 'Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-amber-50 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Pending Invitations ({pendingInvitations.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingInvitations.map((inv) => (
              <div key={inv._id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{inv.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {inv.projectName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleCancelInvitation(inv._id)}
                    disabled={cancellingId === inv._id}
                    className="text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {cancellingId === inv._id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {invitationsLoading && pendingInvitations.length === 0 && (
        <div className="text-center py-4">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 hidden sm:flex items-center">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-1">Member</span>
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-32 text-center">Role</span>
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-48 text-center">Projects</span>
          {isAdmin && <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-20 text-right">Action</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-500">
              {search ? 'No members match your search' : 'No members yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((member) => {
              const isSelf = member._id === currentUserId;

              return (
                <div key={member._id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors flex-wrap sm:flex-nowrap">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {(member.name || member.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {member.name || 'Unknown'}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-gray-400 shrink-0">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="w-32 flex justify-center">
                    {!isAdmin || isSelf || member.role === 'owner' ? (
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        member.role === 'owner' ? 'bg-amber-50 text-amber-700'
                        : member.role === 'admin' ? 'bg-purple-50 text-purple-700'
                        : member.role === 'guest' ? 'bg-blue-50 text-blue-500'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.role || 'member'}
                      </span>
                    ) : (
                      <select
                        value={member.role || 'member'}
                        onChange={(e) => handleRoleChange(member, e.target.value)}
                        disabled={roleLoading === member._id}
                        className="text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                      </select>
                    )}
                  </div>

                  {/* Projects */}
                  <div className="w-48 flex justify-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(member.projects || []).map((p) => (
                        <span
                          key={p._id}
                          onClick={() => navigate(`/project/${p._id}`)}
                          className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors truncate max-w-[120px]"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Remove */}
                  {isAdmin && (
                    <div className="w-20 flex justify-end">
                      {isSelf ? (
                        <span></span>
                      ) : confirmRemove === member._id ? (
                        <div className="flex flex-col gap-1">
                          <select
                            id={`remove-project-${member._id}`}
                            className="text-[10px] border border-gray-200 rounded px-1 py-0.5"
                            defaultValue=""
                          >
                            <option value="" disabled>Project...</option>
                            {(member.projects || []).map((p) => (
                              <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const sel = document.getElementById(`remove-project-${member._id}`);
                                if (sel?.value) handleRemove(member, sel.value);
                              }}
                              disabled={removeLoading}
                              className="text-[10px] px-2 py-0.5 rounded font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="text-[10px] px-2 py-0.5 rounded font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(member._id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove from project"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
