import React, { useState } from 'react';
import {
  inviteMemberApi,
  removeMemberApi,
  updateMemberRoleApi,
} from '../../services/projectService';
import { useAuth } from '../../hooks/useAuth';

export default function ManageMembersModal({ project, onClose, onProjectUpdate }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const members = project.members || [];
  const ownerId = project.owner?._id || project.owner;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteError('');
    setInviteLoading(true);
    try {
      const res = await inviteMemberApi(project._id, email);
      onProjectUpdate(res.data.project);
      setEmail('');
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setRoleLoading(memberId);
    try {
      const res = await updateMemberRoleApi(project._id, memberId, newRole);
      onProjectUpdate(res.data.project);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setRoleLoading(null);
    }
  };

  const handleRemove = async (memberId) => {
    setRemoveLoading(memberId);
    try {
      const res = await removeMemberApi(project._id, memberId);
      onProjectUpdate(res.data.project);
      setConfirmRemove(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemoveLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Manage Members</h3>
            <p className="text-xs text-gray-400 mt-0.5">{project.name} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {members.map((member) => {
            const isOwner = member._id === ownerId;
            const isSelf = member._id === user?.id;

            return (
              <div key={member._id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {(member.name || member.email || '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {member.name || 'Unknown'}
                    </span>
                    {isOwner && (
                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                        Owner
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] text-gray-400 shrink-0">you</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                </div>

                {/* Role selector */}
                {isOwner ? (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md shrink-0">
                    {member.role || 'admin'}
                  </span>
                ) : (
                  <select
                    value={member.role || 'member'}
                    onChange={(e) => handleRoleChange(member._id, e.target.value)}
                    disabled={roleLoading === member._id || isSelf}
                    className="text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                )}

                {/* Remove button */}
                {!isOwner && !isSelf && (
                  <>
                    {confirmRemove === member._id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRemove(member._id)}
                          disabled={removeLoading === member._id}
                          className="text-[10px] px-2 py-0.5 rounded font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                          {removeLoading === member._id ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(null)}
                          className="text-[10px] px-2 py-0.5 rounded font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors shrink-0"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite section */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl shrink-0">
          <p className="text-xs font-medium text-gray-600 mb-2">Invite a new member</p>
          {inviteError && (
            <div className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md mb-2">{inviteError}</div>
          )}
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setInviteError(''); }}
              placeholder="member@example.com"
              required
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0 transition-colors"
            >
              {inviteLoading ? 'Inviting...' : 'Invite'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
