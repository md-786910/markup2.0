import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  inviteMemberApi,
  removeMemberApi,
  updateMemberRoleApi,
} from '../../services/projectService';
import {
  getProjectInvitationsApi,
  cancelInvitationApi,
  resendInvitationApi,
} from '../../services/invitationService';

const ROLE_STYLES = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  member: 'bg-gray-50 text-gray-600 border-gray-200',
  guest: 'bg-sky-50 text-sky-600 border-sky-200',
};

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
];

function getAvatarColor(name) {
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const INVITE_ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Manage projects & members' },
  { value: 'member', label: 'Member', desc: 'Create pins & comments' },
  { value: 'guest', label: 'Guest', desc: 'View only' },
];

const EMAIL_SPLIT_RE = /[,\n\r\t ]+/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailList(value) {
  return [...new Set(
    (value || '')
      .split(EMAIL_SPLIT_RE)
      .map((email) => email.trim())
      .filter(Boolean)
  )];
}

export default function MembersTab({ members, projects, isAdmin, currentUserId, onProjectsChanged }) {
  const navigate = useNavigate();
  const activeProjects = useMemo(
    () => (projects || []).filter((p) => p.status === 'active'),
    [projects]
  );
  const [inviteProjectIds, setInviteProjectIds] = useState([]);
  const [inviteEmails, setInviteEmails] = useState([]);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [roleLoading, setRoleLoading] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removeProjectId, setRemoveProjectId] = useState('');
  const [removeLoading, setRemoveLoading] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [search, setSearch] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [showInvitations, setShowInvitations] = useState(true);
  const [invitationsError, setInvitationsError] = useState('');
  const [invitationSuccess, setInvitationSuccess] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const inviteEmailInputRef = useRef(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const selectedInviteProjects = useMemo(
    () => activeProjects.filter((project) => inviteProjectIds.includes(project._id)),
    [activeProjects, inviteProjectIds]
  );
  const projectSelectLabel = selectedInviteProjects.length === 0
    ? 'Select projects'
    : selectedInviteProjects.length === 1
      ? selectedInviteProjects[0].name
      : `${selectedInviteProjects.length} projects selected`;

  const addInviteEmails = useCallback((value) => {
    const nextEmails = parseEmailList(value);
    if (nextEmails.length === 0) return;

    setInviteEmails((prev) => {
      const seen = new Set(prev.map((email) => email.toLowerCase()));
      const merged = [...prev];
      nextEmails.forEach((email) => {
        const normalized = email.toLowerCase();
        if (seen.has(normalized)) return;
        seen.add(normalized);
        merged.push(email);
      });
      return merged;
    });
  }, []);

  const commitInviteInput = useCallback(() => {
    const trimmed = inviteEmailInput.trim();
    if (!trimmed) return;
    addInviteEmails(trimmed);
    setInviteEmailInput('');
  }, [addInviteEmails, inviteEmailInput]);

  const removeInviteEmail = useCallback((emailToRemove) => {
    setInviteEmails((prev) => prev.filter((email) => email !== emailToRemove));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen && !projectDropdownOpen) return;
    const handler = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
      if (projectDropdownOpen && projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, projectDropdownOpen]);

  useEffect(() => {
    if (inviteProjectIds.length === 0) return;
    const activeIds = new Set(activeProjects.map((project) => project._id));
    const filteredIds = inviteProjectIds.filter((projectId) => activeIds.has(projectId));
    if (filteredIds.length !== inviteProjectIds.length) {
      setInviteProjectIds(filteredIds);
    }
  }, [activeProjects, inviteProjectIds]);

  const fetchInvitations = useCallback(async () => {
    if (!projects?.length) return;
    setInvitationsLoading(true);
    setInvitationsError('');
    try {
      const results = await Promise.all(
        projects.filter((p) => p.status === 'active').map((p) =>
          getProjectInvitationsApi(p._id)
            .then((res) => res.data.invitations.map((inv) => ({ ...inv, projectName: p.name })))
            .catch((err) => {
              console.error(`Failed to fetch invitations for project ${p.name}:`, err);
              return [];
            })
        )
      );
      setPendingInvitations(results.flat());
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
      setPendingInvitations([]);
      setInvitationsError('Failed to load pending invitations');
    } finally {
      setInvitationsLoading(false);
    }
  }, [projects]);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  const handleCancelInvitation = async (invitationId) => {
    setCancellingId(invitationId);
    setInvitationsError('');
    setInvitationSuccess('');
    try {
      await cancelInvitationApi(invitationId);
      setPendingInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));
      setInvitationSuccess('Invitation revoked');
      setTimeout(() => setInvitationSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      setInvitationsError(err.response?.data?.message || 'Failed to revoke invitation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleResendInvitation = async (invitation) => {
    setResendingId(invitation._id);
    setInvitationsError('');
    setInvitationSuccess('');
    try {
      const res = await resendInvitationApi(invitation._id);
      setInvitationSuccess(res.data?.message || `Invitation resent to ${invitation.email}`);
      setPendingInvitations((prev) =>
        prev.map((inv) => (
          inv._id === invitation._id
            ? { ...inv, ...(res.data?.invitation || {}), projectName: inv.projectName }
            : inv
        ))
      );
      setTimeout(() => setInvitationSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      setInvitationsError(err.response?.data?.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const filtered = search
    ? members.filter((m) =>
      (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase())
    )
    : members;

  const handleInvite = async (e) => {
    e.preventDefault();
    const draftEmails = parseEmailList(inviteEmailInput);

    const emails = [...inviteEmails, ...draftEmails];
    const uniqueEmails = [...new Set(emails.map((email) => email.toLowerCase()))]
      .map((lowerEmail) => emails.find((email) => email.toLowerCase() === lowerEmail))
      .filter(Boolean);
    if (uniqueEmails.length === 0 || inviteProjectIds.length === 0) return;

    const invalidEmails = uniqueEmails.filter((email) => !EMAIL_RE.test(email));
    if (invalidEmails.length > 0) {
      setInviteError(`Invalid email address${invalidEmails.length > 1 ? 'es' : ''}: ${invalidEmails.join(', ')}`);
      return;
    }

    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);
    try {
      const results = await Promise.allSettled(
        inviteProjectIds.flatMap((projectId) =>
          uniqueEmails.map((email) => inviteMemberApi(projectId, email, inviteRole))
        )
      );

      const failures = [];
      let successCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successCount += 1;
          return;
        }
        failures.push(result.reason?.response?.data?.message || 'Failed to invite member');
      });

      if (successCount > 0) {
        const suffix = successCount === 1 ? 'invitation' : 'invitations';
        setInviteSuccess(`${successCount} ${suffix} sent successfully`);
        setTimeout(() => setInviteSuccess(''), 3000);
      }

      if (failures.length > 0) {
        setInviteError(failures[0]);
      }

      if (successCount > 0 && failures.length === 0) {
        setInviteEmails([]);
        setInviteEmailInput('');
        setInviteProjectIds([]);
        setProjectDropdownOpen(false);
      }

      onProjectsChanged();
      setTimeout(() => fetchInvitations(), 500);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (member, newRole) => {
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

  const handleRemove = async () => {
    if (!confirmRemove || !removeProjectId) return;
    setRemoveLoading(confirmRemove._id);
    setRemoveError('');
    try {
      await removeMemberApi(removeProjectId, confirmRemove._id);
      onProjectsChanged();
      setConfirmRemove(null);
      setRemoveProjectId('');
    } catch (err) {
      console.error('Failed to remove member:', err);
      setRemoveError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemoveLoading(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* ===== INVITE CARD ===== */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-visible relative">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Invite Team Member</h3>
                <p className="text-xs text-gray-400">Existing users are added instantly. New users receive a signup link.</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {inviteError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-lg mb-4">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 px-4 py-2.5 rounded-lg mb-4">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              {/* Row 1: Project + Email */}
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <div ref={projectDropdownRef} className="relative w-full sm:w-60 shrink-0 z-30">
                  <button
                    type="button"
                    onClick={() => setProjectDropdownOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={projectDropdownOpen}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm border rounded-lg bg-white transition-all ${projectDropdownOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <span className={`truncate text-left ${selectedInviteProjects.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                      {projectSelectLabel}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {selectedInviteProjects.length > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {selectedInviteProjects.length}
                        </span>
                      )}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  {projectDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="max-h-64 overflow-y-auto py-1">
                        {activeProjects.length === 0 ? (
                          <div className="px-3.5 py-3 text-sm text-gray-400">
                            No active projects available
                          </div>
                        ) : (
                          activeProjects.map((project) => {
                            const checked = inviteProjectIds.includes(project._id);
                            return (
                              <label
                                key={project._id}
                                className={`flex cursor-pointer items-center gap-3 px-3.5 py-2 text-sm transition-colors hover:bg-gray-50 ${checked ? 'bg-blue-50/60' : ''
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setInviteProjectIds((prev) => (
                                      prev.includes(project._id)
                                        ? prev.filter((id) => id !== project._id)
                                        : [...prev, project._id]
                                    ));
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="min-w-0 flex-1 truncate text-gray-700">{project.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div
                    className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
                    onClick={() => inviteEmailInputRef.current?.focus()}
                  >
                    {inviteEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
                      >
                        <span className="max-w-[180px] truncate">{email}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeInviteEmail(email);
                          }}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                          aria-label={`Remove ${email}`}
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <input
                      ref={inviteEmailInputRef}
                      type="text"
                      value={inviteEmailInput}
                      onChange={(e) => { setInviteEmailInput(e.target.value); setInviteError(''); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                          if (inviteEmailInput.trim()) {
                            e.preventDefault();
                            commitInviteInput();
                          }
                          return;
                        }
                        if (e.key === 'Backspace' && !inviteEmailInput && inviteEmails.length > 0) {
                          removeInviteEmail(inviteEmails[inviteEmails.length - 1]);
                        }
                      }}
                      onBlur={commitInviteInput}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        if (/[,\n\r\t ]/.test(pasted)) {
                          e.preventDefault();
                          addInviteEmails(pasted);
                          setInviteEmailInput('');
                        }
                      }}
                      placeholder={inviteEmails.length === 0 ? 'colleague@company.com, teammate@company.com' : ''}
                      className="min-w-[180px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                  {/* <p className="mt-1 text-[11px] text-gray-400">
                    Press Enter, Tab, or comma to add an email. Paste multiple emails at once.
                  </p> */}
                </div>
              </div>

              {/* Row 2: Role pills + Invite button */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2">
                  {INVITE_ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setInviteRole(r.value)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${inviteRole === r.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      title={r.desc}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={inviteLoading || selectedInviteProjects.length === 0}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {inviteLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PENDING INVITATIONS ===== */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowInvitations(!showInvitations)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-700">
                Pending Invitations
              </span>
              <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {pendingInvitations.length}
              </span>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showInvitations ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showInvitations && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {pendingInvitations.map((inv) => (
                <div key={inv._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{inv.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400">{inv.projectName}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[10px] text-gray-400">{inv.role || 'member'}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[10px] text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    confirmRevoke === inv._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { handleCancelInvitation(inv._id); setConfirmRevoke(null); }}
                          disabled={cancellingId === inv._id}
                          className="text-[11px] font-medium px-2 py-1 rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {cancellingId === inv._id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmRevoke(null)}
                          className="text-[11px] font-medium px-2 py-1 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResendInvitation(inv)}
                          disabled={resendingId === inv._id}
                          className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          {resendingId === inv._id ? 'Sending...' : 'Resend'}
                        </button>
                        <button
                          onClick={() => setConfirmRevoke(inv._id)}
                          className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {invitationSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 px-4 py-2.5 rounded-lg">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {invitationSuccess}
        </div>
      )}

      {invitationsLoading && pendingInvitations.length === 0 && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {invitationsError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-lg">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {invitationsError}
        </div>
      )}

      {/* ===== MEMBERS LIST ===== */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Header with search */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-4 rounded-t-xl overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Members</h3>
            <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{members.length}</span>
          </div>
          <div className="relative w-56">
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">
              {search ? 'No members match your search' : 'No team members yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try a different search term' : 'Invite your first team member above'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((member) => {
              const isSelf = member._id === currentUserId;
              const color = getAvatarColor(member.name || member.email);
              const isMenuOpen = menuOpen === member._id;

              return (
                <div key={member._id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-sm font-bold shrink-0`}>
                    {(member.name || member.email || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{member.name || 'Unknown'}</span>
                      {isSelf && <span className="text-[10px] text-gray-400">(you)</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>

                  {/* Role */}
                  <div className="hidden sm:flex items-center">
                    {!isAdmin || isSelf || member.role === 'owner' ? (
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md border capitalize ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}>
                        {member.role || 'member'}
                      </span>
                    ) : (
                      <select
                        value={member.role || 'member'}
                        onChange={(e) => handleRoleChange(member, e.target.value)}
                        disabled={roleLoading === member._id}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-md border cursor-pointer disabled:opacity-50 appearance-none bg-no-repeat bg-[right_4px_center] bg-[length:12px] pr-5 ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")` }}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                      </select>
                    )}
                  </div>

                  {/* Projects */}
                  <div className="hidden lg:flex items-center gap-1 max-w-[180px] overflow-hidden">
                    {(member.projects || []).slice(0, 3).map((p) => (
                      <span
                        key={p._id}
                        onClick={() => navigate(`/project/${p._id}`)}
                        className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors truncate max-w-[80px]"
                        title={p.name}
                      >
                        {p.name}
                      </span>
                    ))}
                    {(member.projects || []).length > 3 && (
                      <span className="text-[10px] text-gray-400">+{member.projects.length - 3}</span>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin && !isSelf && member.role !== 'owner' && (
                    <div className="relative" ref={isMenuOpen ? menuRef : null}>
                      <button
                        onClick={() => setMenuOpen(isMenuOpen ? null : member._id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-20 animate-scale-in">
                          <button
                            onClick={() => { setMenuOpen(null); navigate(`/project/${member.projects?.[0]?._id}/members`); }}
                            className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            View Profile
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => { setMenuOpen(null); setConfirmRemove(member); setRemoveProjectId(member.projects?.[0]?._id || ''); }}
                            className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                            </svg>
                            Remove from Project
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== REMOVE CONFIRMATION MODAL ===== */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 w-full animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Remove Member</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              Remove <strong>{confirmRemove.name}</strong> from a project? They'll lose access to that project.
            </p>
            {removeError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {removeError}
              </div>
            )}
            {(confirmRemove.projects || []).length > 1 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Select project to remove from</label>
                <select
                  value={removeProjectId}
                  onChange={(e) => setRemoveProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(confirmRemove.projects || []).map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmRemove(null); setRemoveProjectId(''); setRemoveError(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removeLoading || !removeProjectId}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {removeLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
