import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import {
  getWorkspaceMembersApi,
  inviteMemberApi,
  removeMemberApi,
} from '../../services/projectService';
import {
  getProjectInvitationsApi,
  resendInvitationApi,
  cancelInvitationApi,
} from '../../services/invitationService';
import { toast, toastError } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirm';
import { relativeTime } from '../../utils/relativeTime';

const TABS = [
  { id: 'email', label: 'Email invite' },
  { id: 'existing', label: 'Existing members' },
  { id: 'add', label: 'Add members' },
];

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Can manage projects & members' },
  { value: 'member', label: 'Member', description: 'Can create pins & comments' },
  { value: 'guest', label: 'Guest', description: 'View only access' },
];

const MEMBER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Guest' },
];

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

function CustomDropdown({ value, options = [], onChange, label, className = 'w-full' }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('below');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const modal = ref.current.closest('.kc-modal') || document.body;
      const modalRect = modal.getBoundingClientRect();
      const spaceBelowInModal = modalRect.bottom - rect.bottom;
      if (spaceBelowInModal < 170) {
        setPlacement('above');
      } else {
        setPlacement('below');
      }
    }
  }, [open]);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          border: open ? '1px solid #003dff' : '1px solid #d1d5db',
          borderRadius: '8px',
          background: '#ffffff',
          outline: 'none',
          boxShadow: 'none',
        }}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-body text-left transition-colors cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className={`block truncate text-gray-900 ${selectedOption?.description ? 'font-semibold' : ''}`}>
            {selectedOption?.label || label || 'Select option'}
          </span>
          {selectedOption?.description && (
            <span className="block truncate text-body-sm text-gray-500">{selectedOption.description}</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ml-2 ${
            open ? (placement === 'above' ? '' : 'rotate-180 text-blue-600') : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(placement === 'above' ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
            zIndex: 100,
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '4px',
          }}
        >
          {options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  border: 'none',
                  background: selected ? '#eff6ff' : 'transparent',
                  color: selected ? '#1d4ed8' : '#374151',
                  fontWeight: selected ? 500 : 400,
                  borderRadius: '7px',
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-body-sm text-left transition-colors cursor-pointer hover:bg-gray-50"
              >
                <span className="min-w-0">
                  <span className="block">{opt.label}</span>
                  {opt.description && (
                    <span className="block text-caption text-gray-500 font-normal">{opt.description}</span>
                  )}
                </span>
                {selected && (
                  <svg className="w-4 h-4 text-blue-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnSecondary = 'px-4 py-2.5 text-label text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors';
const btnPrimary = 'px-4 py-2.5 text-label text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors';

export default function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
  project,
  onInvited,
  onProjectUpdate,
}) {
  const [activeTab, setActiveTab] = useState('email');
  const [emails, setEmails] = useState([]);
  const [emailDraft, setEmailDraft] = useState('');
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
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteBusyId, setInviteBusyId] = useState(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    let cancelled = false;
    getProjectInvitationsApi(projectId)
      .then((res) => { if (!cancelled) setPendingInvites(res.data?.invitations || []); })
      .catch(() => { if (!cancelled) setPendingInvites([]); });
    return () => { cancelled = true; };
  }, [isOpen, projectId]);

  const handleResendInvite = async (inv) => {
    setInviteBusyId(inv._id);
    try {
      await resendInvitationApi(inv._id);
      toast.success(`Invitation resent to ${inv.email}`);
    } catch (err) {
      toastError(err, 'Failed to resend invitation');
    } finally {
      setInviteBusyId(null);
    }
  };

  const handleRevokeInvite = async (inv) => {
    const ok = await confirmDialog({
      title: 'Revoke invitation?',
      message: `${inv.email} will no longer be able to join with this invitation.`,
      confirmLabel: 'Revoke',
      danger: true,
    });
    if (!ok) return;
    setInviteBusyId(inv._id);
    try {
      await cancelInvitationApi(inv._id);
      setPendingInvites((prev) => prev.filter((i) => i._id !== inv._id));
      toast.success('Invitation revoked');
    } catch (err) {
      toastError(err, 'Failed to revoke invitation');
    } finally {
      setInviteBusyId(null);
    }
  };

  // Splits "a@x.com, b@y.com" into chips. Invalid entries stay in the field.
  const commitEmailDraft = (text = emailDraft) => {
    const parts = text.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      setEmailDraft('');
      return { list: emails, invalid: [] };
    }
    const valid = parts.filter((p) => EMAIL_RE.test(p));
    const invalid = parts.filter((p) => !EMAIL_RE.test(p));
    const next = [...emails];
    valid.forEach((p) => {
      if (!next.some((e) => e.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    setEmails(next);
    setEmailDraft(invalid.join(', '));
    setError(invalid.length ? `Not a valid email: ${invalid.join(', ')}` : '');
    return { list: next, invalid };
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitEmailDraft();
    } else if (e.key === 'Backspace' && !emailDraft && emails.length) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const draftValidCount = emailDraft
    .split(/[\s,;]+/)
    .filter((p) => EMAIL_RE.test(p.trim()) && !emails.some((e) => e.toLowerCase() === p.trim().toLowerCase())).length;
  const inviteCount = emails.length + draftValidCount;

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
    setEmails([]);
    setEmailDraft('');
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
    const { list: emailList, invalid } = commitEmailDraft();
    if (invalid.length) return; // commitEmailDraft already shows the error
    setError('');
    setLoading(true);

    try {
      const targets = emailList.map((value) => ({ email: value, role }));

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

      setEmails([]);
      setEmailDraft('');
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

  const handleCopyProjectLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/project/${projectId}`);
      toast.success('Project link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" labelledBy="invite-members-title">
      {/* Header */}
      <div className="flex items-start gap-3 px-6 pt-6 pb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3M7 12a4 4 0 100-8 4 4 0 000 8zm7 8v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="invite-members-title" className="text-h4 font-semibold text-gray-900">Invite members</h3>
          {project?.name && (
            <p className="text-body-sm text-gray-500 truncate">
              Add people to <span className="font-semibold text-gray-900">{project.name}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-5 px-6 border-b border-gray-200" role="tablist">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px pb-2.5 text-label border-b-2 transition-colors ${
                active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-body-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {activeTab === 'email' && (
          <form id="invite-email-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="invite-email-input" className="block text-label text-gray-700 mb-1.5">Email addresses</label>
              <div
                onClick={() => emailInputRef.current?.focus()}
                className="w-full min-h-[48px] flex flex-wrap items-center gap-1.5 px-2 py-2 border border-gray-300 rounded-lg focus-within:border-blue-600 transition-colors cursor-text"
              >
                {emails.map((value) => (
                  <span key={value} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 pl-2 pr-1 py-1 text-body-sm text-gray-800">
                    {value}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEmails((prev) => prev.filter((x) => x !== value)); }}
                      className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:text-gray-700"
                      aria-label={`Remove ${value}`}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  id="invite-email-input"
                  ref={emailInputRef}
                  type="text"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  onBlur={() => emailDraft.trim() && commitEmailDraft()}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (/[\s,;]/.test(text.trim())) {
                      e.preventDefault();
                      commitEmailDraft(`${emailDraft} ${text}`);
                    }
                  }}
                  className="flex-1 min-w-[140px] px-1.5 py-1 text-body bg-transparent border-0 outline-none focus:ring-0"
                  placeholder={emails.length ? 'Add more...' : 'member@example.com'}
                  autoComplete="off"
                />
              </div>
              <p className="mt-1.5 text-caption text-gray-500">
                Separate multiple emails with a comma or Enter.
              </p>
            </div>

            <div>
              <label className="block text-label text-gray-700 mb-1.5">Role</label>
              <CustomDropdown value={role} options={ROLES} onChange={setRole} />
            </div>

            {pendingInvites.length > 0 && (
              <div className="pt-1">
                <p className="text-overline text-gray-500 mb-2">Pending invitations · {pendingInvites.length}</p>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
                  {pendingInvites.map((inv) => {
                    const sent = relativeTime(inv.createdAt);
                    return (
                      <div key={inv._id} className="flex items-center gap-3 px-3.5 py-3">
                        <div className="w-8 h-8 rounded-full border border-dashed border-gray-300 text-gray-400 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25l9 6 9-6M4.5 6.75h15A1.5 1.5 0 0121 8.25v7.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 15.75v-7.5A1.5 1.5 0 014.5 6.75z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm text-gray-900 truncate">{inv.email}</p>
                          <p className="text-caption text-gray-500 capitalize">
                            {inv.role || 'member'}{sent ? ` · Sent ${sent.charAt(0).toLowerCase()}${sent.slice(1)}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResendInvite(inv)}
                          disabled={inviteBusyId === inv._id}
                          className="px-3 py-1.5 text-label text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shrink-0"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv)}
                          disabled={inviteBusyId === inv._id}
                          className="px-2 py-1.5 text-label text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors shrink-0"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === 'existing' && (
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
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-caption font-semibold shrink-0">
                      {(member.name || member.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-body-sm font-medium text-gray-900 truncate">
                          {member.name || member.email || 'Unknown member'}
                        </span>
                        <span className={`text-caption font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
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
                      <p className="text-caption text-gray-400 truncate">{member.email}</p>
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
              <div className="px-3.5 py-6 text-body-sm text-gray-500">
                No members are currently assigned to this project.
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <form id="invite-add-form" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-caption text-gray-500">
                Select workspace members who are not yet on this project. Type <span className="font-medium">@</span> to quick-filter the list.
              </p>
              <span className="text-caption text-gray-400 shrink-0 ml-3">{selectedWorkspaceMemberIds.length} selected</span>
            </div>

            {selectedWorkspaceMembers.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedWorkspaceMembers.map((member) => {
                  const selectedRole = selectedWorkspaceMemberRoles[member._id] || member.role || 'member';
                  return (
                    <div
                      key={member._id}
                      className="inline-flex items-center gap-2 rounded-md bg-gray-100 pl-2.5 pr-1 py-1 text-body-sm text-gray-800"
                    >
                      <span className="max-w-[180px] truncate">{member.name || member.email || 'Unknown member'}</span>
                      <span className="text-caption text-gray-500 capitalize">{selectedRole}</span>
                      <button
                        type="button"
                        onClick={() => toggleWorkspaceMember(member)}
                        className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:text-gray-700"
                        aria-label={`Remove ${member.name || member.email} from selection`}
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search by name, email, or @name"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-0 text-body mb-3 transition-colors"
            />

            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white">
              {workspaceLoading ? (
                <div className="px-3.5 py-8 flex justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : workspaceError ? (
                <div className="px-3.5 py-6 text-body-sm text-red-600 bg-red-50">
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
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-caption font-semibold shrink-0 mt-0.5">
                        {(member.name || member.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-body-sm font-medium text-gray-900 truncate">
                            {member.name || member.email || 'Unknown member'}
                          </span>
                          <span className="text-caption font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0 capitalize">
                            {member.role || 'member'}
                          </span>
                        </div>
                        <p className="text-caption text-gray-400 truncate">{member.email}</p>

                        {checked && (
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <label className="block text-label text-gray-500 mb-1">Project role</label>
                            <CustomDropdown
                              value={selectedRole}
                              options={MEMBER_ROLES}
                              onChange={(val) => setSelectedWorkspaceMemberRoles((prev) => ({
                                ...prev,
                                [member._id]: val,
                              }))}
                              className="w-full sm:w-48"
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="px-3.5 py-6 text-body-sm text-gray-500">
                  No workspace members match your search.
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50"
        style={{ borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}
      >
        {activeTab === 'email' && projectId && (
          <button
            type="button"
            onClick={handleCopyProjectLink}
            className="inline-flex items-center gap-1.5 text-label text-blue-600 hover:text-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy project link
          </button>
        )}
        <div className="ml-auto flex gap-3">
          {activeTab === 'existing' ? (
            <button type="button" onClick={onClose} className={btnSecondary}>Close</button>
          ) : (
            <>
              <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
              <button
                type="submit"
                form={activeTab === 'email' ? 'invite-email-form' : 'invite-add-form'}
                disabled={loading}
                className={btnPrimary}
              >
                {loading
                  ? 'Sending...'
                  : activeTab === 'email'
                    ? (inviteCount > 1 ? `Send ${inviteCount} invites` : 'Send invite')
                    : (selectedWorkspaceMemberIds.length > 1 ? `Add ${selectedWorkspaceMemberIds.length} members` : 'Add member')}
              </button>
            </>
          )}
        </div>
      </div>

      {removeTarget && (
        <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Member" size="sm">
          <div className="space-y-4">
            <p className="text-body-sm text-gray-600">
              Remove <span className="font-medium text-gray-900">{removeTarget.name || removeTarget.email}</span> from this project?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2.5 text-label text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={removeLoading}
                className="px-4 py-2.5 text-label text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
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
