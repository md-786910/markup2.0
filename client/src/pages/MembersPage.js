import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getProjectApi,
  inviteMemberApi,
  removeMemberApi,
  updateMemberRoleApi,
} from '../services/projectService';

export default function MembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [roleLoading, setRoleLoading] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const loadProject = useCallback(async () => {
    try {
      const res = await getProjectApi(projectId);
      setProject(res.data.project);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Project not found</p>
          <button onClick={() => navigate('/dashboard')} className="mt-3 text-sm text-blue-600 hover:text-blue-700">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const members = project.members || [];
  const ownerId = project.owner?._id || project.owner;
  const isOwner = ownerId === user?.id;
  const canManage = isOwner || isAdmin;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);
    try {
      const res = await inviteMemberApi(projectId, email);
      setProject(res.data.project);
      setInviteSuccess(`${email} has been invited`);
      setEmail('');
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setRoleLoading(memberId);
    try {
      const res = await updateMemberRoleApi(projectId, memberId, newRole);
      setProject(res.data.project);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setRoleLoading(null);
    }
  };

  const handleRemove = async (memberId) => {
    setRemoveLoading(memberId);
    try {
      const res = await removeMemberApi(projectId, memberId);
      setProject(res.data.project);
      setConfirmRemove(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemoveLoading(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-gray-900">{project.name}</span>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Members</h2>
        <p className="text-sm text-gray-500 mt-1">
          {members.length} member{members.length !== 1 ? 's' : ''} in this project
        </p>
      </div>

      {/* Invite card */}
      {canManage && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Invite a new member</h3>
          <p className="text-xs text-gray-400 mb-3">Enter the email of a registered user to add them to this project.</p>

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

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setInviteError(''); }}
              placeholder="member@example.com"
              required
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0 transition-colors"
            >
              {inviteLoading ? 'Inviting...' : 'Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Member</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-center">Role</span>
            {canManage && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-right">Action</span>}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {members.map((member) => {
            const isMemberOwner = member._id === ownerId;
            const isSelf = member._id === user?.id;

            return (
              <div key={member._id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                {/* Avatar + info */}
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {(member.name || member.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {member.name || 'Unknown'}
                    </span>
                    {isMemberOwner && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                        Owner
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] text-gray-400 shrink-0">(you)</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>

                {/* Role */}
                <div className="w-28 flex justify-center">
                  {!canManage || isMemberOwner || isSelf ? (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      (member.role || 'member') === 'admin'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {member.role || 'member'}
                    </span>
                  ) : (
                    <select
                      value={member.role || 'member'}
                      onChange={(e) => handleRoleChange(member._id, e.target.value)}
                      disabled={roleLoading === member._id}
                      className="text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  )}
                </div>

                {/* Remove */}
                {canManage && (
                  <div className="w-20 flex justify-end">
                    {isMemberOwner || isSelf ? (
                      <span className="w-20"></span>
                    ) : confirmRemove === member._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemove(member._id)}
                          disabled={removeLoading === member._id}
                          className="text-[11px] px-2 py-1 rounded-md font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                          {removeLoading === member._id ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-[11px] px-2 py-1 rounded-md font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member._id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
