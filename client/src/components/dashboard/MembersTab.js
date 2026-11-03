import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { inviteMemberApi, removeMemberApi } from '../../services/projectService';
import { getProjectInvitationsApi, cancelInvitationApi, resendInvitationApi } from '../../services/invitationService';
import { toast, toastError } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirm';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { getOrgPeopleApi, getWorkspaceInvitationsApi, inviteToWorkspaceApi, updateOrgRoleApi } from '../../services/workspaceService';
import Modal from '../common/Modal';
import {
  ActionMenu, Avatar, Badge, Button, Card, EmptyState, Field, FilterMenu, SearchField, SelectMenu, Tabs, Toolbar, ClearFilters, useDismiss, Icon,
} from '../ui';

// Organization roles (what someone can do on each workspace and project is set there)
const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Manages every workspace, project and member' },
  { value: 'member', label: 'Member', description: 'Works on the workspaces and projects they are given' },
  { value: 'guest', label: 'Guest', description: 'Outside collaborator, can comment at most' },
];
const ROLE_FILTERS = [{ value: 'owner', label: 'Owner' }, ...ROLES.map(({ value, label }) => ({ value, label }))];
const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest' };
const STATUS_FILTERS = [{ value: 'pending', label: 'Pending' }, { value: 'expired', label: 'Expired' }];

const EMAIL_SPLIT_RE = /[,\n\r\t ]+/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const parseEmailList = (value) => [...new Set((value || '').split(EMAIL_SPLIT_RE).map((e) => e.trim()).filter(Boolean))];
const isExpired = (inv) => new Date(inv.expiresAt).getTime() <= Date.now();
const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const filterIcon = {
  role: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  status: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};
const peopleIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);
const mailIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

// ── Invite dialog ────────────────────────────────────────────────────────────
function InviteDialog({ isOpen, onClose, activeProjects, workspaces, onInvited }) {
  const [emails, setEmails] = useState([]);
  const [draft, setDraft] = useState('');
  const [role, setRole] = useState('member');
  const [projectIds, setProjectIds] = useState([]);
  const [workspaceIds, setWorkspaceIds] = useState([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const inputRef = useRef(null);
  const accessRef = useRef(null);
  useDismiss(accessRef, accessOpen, () => setAccessOpen(false));

  useEffect(() => {
    if (!isOpen) return;
    setEmails([]); setDraft(''); setRole('member'); setProjectIds([]); setWorkspaceIds([]); setError(''); setAccessOpen(false);
  }, [isOpen]);

  const addEmails = (value) => {
    const next = parseEmailList(value);
    if (!next.length) return;
    setEmails((prev) => {
      const seen = new Set(prev.map((e) => e.toLowerCase()));
      return [...prev, ...next.filter((e) => !seen.has(e.toLowerCase()) && seen.add(e.toLowerCase()))];
    });
  };
  const commitDraft = () => { if (draft.trim()) { addEmails(draft); setDraft(''); } };

  const chosenWorkspaces = role === 'admin' ? [] : workspaces.filter((w) => workspaceIds.includes(w._id));
  const chosenProjects = activeProjects.filter((p) => projectIds.includes(p._id));
  const accessCount = chosenWorkspaces.length + chosenProjects.length;
  const accessLabel = accessCount === 0
    ? 'Choose workspaces or projects'
    : accessCount === 1
      ? (chosenWorkspaces[0] ? `All of ${chosenWorkspaces[0].name}` : chosenProjects[0].name)
      : [
        chosenWorkspaces.length && `${chosenWorkspaces.length} ${chosenWorkspaces.length === 1 ? 'workspace' : 'workspaces'}`,
        chosenProjects.length && `${chosenProjects.length} ${chosenProjects.length === 1 ? 'project' : 'projects'}`,
      ].filter(Boolean).join(', ');
  const toggle = (setter, id) => setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allEmails = [...emails, ...parseEmailList(draft)];
  const uniqueEmails = [...new Map(allEmails.map((e) => [e.toLowerCase(), e])).values()];
  const canSend = uniqueEmails.length > 0 && accessCount > 0 && !sending;

  const send = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    const invalid = uniqueEmails.filter((m) => !EMAIL_RE.test(m));
    if (invalid.length) { setError(`Check ${invalid.length > 1 ? 'these addresses' : 'this address'}: ${invalid.join(', ')}`); return; }
    setError('');
    setSending(true);
    try {
      const projectResults = await Promise.allSettled(projectIds.flatMap((pid) => uniqueEmails.map((m) => inviteMemberApi(pid, m, role))));
      const wsResults = await Promise.allSettled(chosenWorkspaces.map((w) => inviteToWorkspaceApi(w._id, uniqueEmails, role)));
      const failures = [];
      let sent = 0;
      projectResults.forEach((r) => { if (r.status === 'fulfilled') sent += 1; else failures.push(r.reason?.response?.data?.message || 'Could not invite'); });
      wsResults.forEach((r) => {
        if (r.status !== 'fulfilled') { failures.push(r.reason?.response?.data?.message || 'Could not invite to the workspace'); return; }
        (r.value.data.results || []).forEach((x) => {
          if (x.status === 'added' || x.status === 'invited') sent += 1;
          else if (x.status === 'error') failures.push(`${x.email}: ${x.message}`);
        });
      });
      if (sent) toast.success(`${sent} ${sent === 1 ? 'invitation' : 'invitations'} sent.`);
      if (failures.length) setError(failures[0]);
      onInvited();
      if (sent && !failures.length) onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the invitations.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite people" size="lg">
      <form onSubmit={send} className="space-y-5">
        <p className="text-sm text-gray-500 -mt-1">People already in your organization are added at once. Everyone else gets an email with a sign-up link.</p>

        <Field label="Email addresses" hint="Press Enter or a comma after each address. You can paste a list.">
          <div
            className="flex min-h-[36px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
            onClick={() => inputRef.current?.focus()}
          >
            {emails.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-md bg-gray-100 pl-2 pr-1 py-0.5 text-[13px] text-gray-700">
                <span className="max-w-[200px] truncate">{m}</span>
                <button type="button" aria-label={`Remove ${m}`} onClick={(ev) => { ev.stopPropagation(); setEmails((p) => p.filter((x) => x !== m)); }} className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700">{Icon.close('w-3 h-3')}</button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={draft}
              autoFocus
              onChange={(ev) => { setDraft(ev.target.value); setError(''); }}
              onKeyDown={(ev) => {
                if ((ev.key === 'Enter' || ev.key === ',' || ev.key === 'Tab') && draft.trim()) { ev.preventDefault(); commitDraft(); return; }
                if (ev.key === 'Backspace' && !draft && emails.length) setEmails((p) => p.slice(0, -1));
              }}
              onBlur={commitDraft}
              onPaste={(ev) => {
                const text = ev.clipboardData.getData('text');
                if (/[,\n\r\t ]/.test(text)) { ev.preventDefault(); addEmails(text); }
              }}
              placeholder={emails.length ? '' : 'name@company.com'}
              className="min-w-[160px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </Field>

        <Field label="Role">
          <SelectMenu variant="field" value={role} options={ROLES} onChange={setRole} ariaLabel="Role" />
        </Field>

        <Field label="Access" hint={role === 'admin' ? 'Admins see every workspace; pick a project to send the invitation from.' : 'A whole workspace includes its future projects.'}>
          <div ref={accessRef} className="relative">
            <button
              type="button"
              onClick={() => setAccessOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={accessOpen}
              className={`w-full flex items-center justify-between gap-2 h-9 px-3 text-sm bg-white border rounded-lg transition-shadow ${accessOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <span className={`truncate ${accessCount ? 'text-gray-900' : 'text-gray-400'}`}>{accessLabel}</span>
              <span className="flex items-center gap-2 shrink-0">
                {accessCount > 0 && <Badge tone="blue">{accessCount}</Badge>}
                <span className={`text-gray-400 transition-transform ${accessOpen ? 'rotate-180' : ''}`}>{Icon.chevron()}</span>
              </span>
            </button>
            {accessOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 animate-scale-in z-40 max-h-72 overflow-y-auto">
                {role !== 'admin' && (
                  <>
                    <p className="px-3.5 pt-1.5 pb-1 text-xs font-medium text-gray-500">Whole workspace</p>
                    {workspaces.map((w) => (
                      <label key={w._id} className={`flex cursor-pointer items-center gap-3 px-3.5 py-2 text-sm transition-colors hover:bg-gray-50 ${workspaceIds.includes(w._id) ? 'bg-blue-50/60' : ''}`}>
                        <input type="checkbox" checked={workspaceIds.includes(w._id)} onChange={() => toggle(setWorkspaceIds, w._id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="min-w-0 flex-1 truncate text-gray-700">{w.name}</span>
                        <span className="text-xs text-gray-400">{w.projectCount} {w.projectCount === 1 ? 'project' : 'projects'}</span>
                      </label>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                <p className="px-3.5 pt-1.5 pb-1 text-xs font-medium text-gray-500">Single projects</p>
                {activeProjects.length === 0 ? (
                  <p className="px-3.5 py-2 text-sm text-gray-400">No active projects here yet.</p>
                ) : activeProjects.map((p) => (
                  <label key={p._id} className={`flex cursor-pointer items-center gap-3 px-3.5 py-2 text-sm transition-colors hover:bg-gray-50 ${projectIds.includes(p._id) ? 'bg-blue-50/60' : ''}`}>
                    <input type="checkbox" checked={projectIds.includes(p._id)} onChange={() => toggle(setProjectIds, p._id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="min-w-0 flex-1 truncate text-gray-700">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={sending} disabled={!canSend}>
            {sending ? 'Sending…' : uniqueEmails.length > 1 ? `Send ${uniqueEmails.length} invitations` : 'Send invitation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Remove from a project ────────────────────────────────────────────────────
function RemoveDialog({ member, onClose, onRemoved }) {
  const [projectId, setProjectId] = useState(member?.projects?.[0]?._id || '');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setProjectId(member?.projects?.[0]?._id || ''); }, [member]);
  if (!member) return null;
  const remove = async () => {
    setBusy(true);
    try {
      await removeMemberApi(projectId, member._id);
      toast.success(`${member.name || member.email} was removed from the project.`);
      onRemoved();
      onClose();
    } catch (err) {
      toastError(err, 'Could not remove them from the project.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Remove from a project" size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{member.name || member.email}</span> loses access to the project you choose. They stay in your organization.
        </p>
        {(member.projects || []).length > 1 && (
          <Field label="Project">
            <SelectMenu variant="field" value={projectId} options={member.projects.map((p) => ({ value: p._id, label: p.name }))} onChange={setProjectId} ariaLabel="Project" />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={!projectId} onClick={remove}>Remove</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Team page ────────────────────────────────────────────────────────────────
export default function MembersTab({ members, projects, isAdmin, currentUserId, onProjectsChanged, inviteOpen = false, onInviteOpenChange = () => {} }) {
  const navigate = useNavigate();
  const { workspaces } = useWorkspaces();
  const activeProjects = useMemo(() => (projects || []).filter((p) => p.status === 'active'), [projects]);

  const [view, setView] = useState('members');
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [orgPeople, setOrgPeople] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(null);
  const [busyInvite, setBusyInvite] = useState(null);
  const [removing, setRemoving] = useState(null);

  // Everyone in the organization (owners/admins), with their projects here
  const loadPeople = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await getOrgPeopleApi();
      setOrgPeople(data.people || []);
    } catch { setOrgPeople(null); }
  }, [isAdmin]);
  useEffect(() => { loadPeople(); }, [loadPeople]);

  const people = useMemo(() => {
    const byId = new Map((members || []).map((m) => [String(m._id), m]));
    if (!orgPeople) return members || [];
    return orgPeople.map((p) => ({ ...p, projects: byId.get(String(p._id))?.projects || [] }));
  }, [orgPeople, members]);

  // Pending invitations: to projects here and to whole workspaces
  const loadInvitations = useCallback(async () => {
    if (!isAdmin) return;
    setInvitationsLoading(true);
    try {
      const [byProject, byWorkspace] = await Promise.all([
        Promise.all(activeProjects.map((p) => getProjectInvitationsApi(p._id)
          .then((r) => r.data.invitations.map((inv) => ({ ...inv, target: p.name, targetType: 'project' })))
          .catch(() => []))),
        Promise.all((workspaces || []).filter((w) => w.myLevel === 'manage' || isAdmin).map((w) => getWorkspaceInvitationsApi(w._id)
          .then((r) => r.data.invitations.map((inv) => ({ ...inv, target: w.name, targetType: 'workspace' })))
          .catch(() => []))),
      ]);
      setInvitations([...byProject.flat(), ...byWorkspace.flat()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } finally {
      setInvitationsLoading(false);
    }
  }, [activeProjects, workspaces, isAdmin]);
  useEffect(() => { loadInvitations(); }, [loadInvitations]);

  const q = search.trim().toLowerCase();
  const visiblePeople = people.filter((m) => (!roleFilter || (m.role || 'member') === roleFilter)
    && (!q || (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)));
  const visibleInvitations = invitations.filter((inv) => (!statusFilter || (statusFilter === 'expired') === isExpired(inv))
    && (!q || inv.email.toLowerCase().includes(q) || (inv.target || '').toLowerCase().includes(q)));
  const activeFilterCount = (view === 'members' ? (roleFilter ? 1 : 0) : (statusFilter ? 1 : 0)) + (q ? 1 : 0);

  const changeRole = async (member, role) => {
    setRoleSaving(member._id);
    try {
      await updateOrgRoleApi(member._id, role);
      toast.success(`${member.name || member.email} is now ${ROLE_LABEL[role].toLowerCase() === 'admin' ? 'an admin' : `a ${ROLE_LABEL[role].toLowerCase()}`}.`);
      await loadPeople();
      onProjectsChanged();
    } catch (err) {
      toastError(err, 'Could not change the role.');
    } finally {
      setRoleSaving(null);
    }
  };

  const resend = async (inv) => {
    setBusyInvite(inv._id);
    try {
      const res = await resendInvitationApi(inv._id);
      toast.success(res.data?.message || `Invitation sent again to ${inv.email}.`);
      loadInvitations();
    } catch (err) {
      toastError(err, 'Could not send the invitation again.');
    } finally {
      setBusyInvite(null);
    }
  };

  const revoke = async (inv) => {
    if (!(await confirmDialog({ title: `Revoke the invitation for ${inv.email}?`, message: 'The link in their email stops working.', confirmLabel: 'Revoke', danger: true }))) return;
    setBusyInvite(inv._id);
    try {
      await cancelInvitationApi(inv._id);
      setInvitations((prev) => prev.filter((x) => x._id !== inv._id));
      toast.success('Invitation revoked.');
    } catch (err) {
      toastError(err, 'Could not revoke the invitation.');
    } finally {
      setBusyInvite(null);
    }
  };

  const tabs = [
    { id: 'members', label: 'Members', count: people.length },
    ...(isAdmin ? [{ id: 'invitations', label: 'Invitations', count: invitations.length }] : []),
  ];

  return (
    <div>
      <Tabs tabs={tabs} active={view} onChange={(id) => { setView(id); setSearch(''); }} className="mb-6" />

      <Toolbar
        search={<SearchField value={search} onChange={setSearch} placeholder={view === 'members' ? 'Search people...' : 'Search invitations...'} label="Search" />}
      >
        {view === 'members' ? (
          <FilterMenu label="Role" icon={filterIcon.role} options={ROLE_FILTERS} value={roleFilter} onChange={setRoleFilter} />
        ) : (
          <FilterMenu label="Status" icon={filterIcon.status} options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
        )}
        <ClearFilters count={activeFilterCount} onClear={() => { setRoleFilter(null); setStatusFilter(null); setSearch(''); }} />
      </Toolbar>

      {view === 'members' ? (
        <Card flush>
          {visiblePeople.length === 0 ? (
            <EmptyState
              icon={peopleIcon}
              title={activeFilterCount ? 'Nobody matches these filters' : 'No team members yet'}
              description={activeFilterCount ? 'Try another role or search.' : 'Invite the people you work with to review projects together.'}
              action={activeFilterCount
                ? <Button variant="secondary" size="sm" onClick={() => { setRoleFilter(null); setSearch(''); }}>Clear filters</Button>
                : isAdmin && <Button variant="primary" size="sm" icon={Icon.plus()} onClick={() => onInviteOpenChange(true)}>Invite people</Button>}
            />
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_150px_minmax(0,260px)_40px] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500">
                <span>Person</span><span>Role</span><span>Projects in this workspace</span><span />
              </div>
              <ul className="divide-y divide-gray-100">
                {visiblePeople.map((m) => {
                  const isSelf = String(m._id) === String(currentUserId);
                  const role = m.role || 'member';
                  const editable = isAdmin && !isSelf && role !== 'owner';
                  const projectList = m.projects || [];
                  return (
                    <li key={m._id} className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_150px_minmax(0,260px)_40px] items-center gap-x-4 gap-y-2 px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={m.name || m.email} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {m.name || m.email}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{m.email}</p>
                        </div>
                      </div>
                      <div className="justify-self-end md:justify-self-start">
                        {editable ? (
                          <SelectMenu
                            value={role}
                            options={ROLES}
                            onChange={(r) => changeRole(m, r)}
                            disabled={roleSaving === m._id}
                            ariaLabel={`Role of ${m.name || m.email}`}
                            align="left"
                          />
                        ) : (
                          <Badge tone={role === 'owner' ? 'blue' : 'gray'}>{ROLE_LABEL[role]}</Badge>
                        )}
                      </div>
                      <div className="col-span-2 md:col-span-1 flex flex-nowrap items-center gap-1.5 min-w-0 overflow-hidden">
                        {projectList.length === 0 ? (
                          <span className="text-xs text-gray-400">{role === 'owner' || role === 'admin' ? 'All projects' : 'No projects here'}</span>
                        ) : (
                          <>
                            {projectList.slice(0, 2).map((p) => (
                              <button key={p._id} type="button" title={p.name} onClick={() => navigate(`/project/${p._id}`)} className="max-w-[104px] shrink-0 truncate rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                {p.name}
                              </button>
                            ))}
                            {projectList.length > 2 && <span className="shrink-0 text-xs text-gray-400" title={projectList.slice(2).map((p) => p.name).join(', ')}>+{projectList.length - 2}</span>}
                          </>
                        )}
                      </div>
                      <div className="hidden md:flex justify-end">
                        {editable && (
                          <ActionMenu
                            label={`Actions for ${m.name || m.email}`}
                            items={[
                              projectList[0] && { label: 'Manage project access', onClick: () => navigate(`/project/${projectList[0]._id}/members`) },
                              projectList.length > 0 && 'divider',
                              projectList.length > 0 && { label: 'Remove from a project', danger: true, onClick: () => setRemoving(m) },
                            ]}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      ) : (
        <Card flush>
          {invitationsLoading && invitations.length === 0 ? (
            <div className="flex justify-center py-14"><span className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" /></div>
          ) : visibleInvitations.length === 0 ? (
            <EmptyState
              icon={mailIcon}
              title={activeFilterCount ? 'No invitations match' : 'No pending invitations'}
              description={activeFilterCount ? 'Try another status or search.' : 'Invitations you send show up here until they are accepted.'}
              action={!activeFilterCount && <Button variant="primary" size="sm" icon={Icon.plus()} onClick={() => onInviteOpenChange(true)}>Invite people</Button>}
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {visibleInvitations.map((inv) => {
                const expired = isExpired(inv);
                return (
                  <li key={inv._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {inv.targetType === 'workspace' ? `Workspace · ${inv.target}` : inv.target} · {ROLE_LABEL[inv.role || 'member']}
                        </p>
                      </div>
                    </div>
                    <Badge tone={expired ? 'red' : 'amber'} dot>{expired ? `Expired ${formatDate(inv.expiresAt)}` : `Expires ${formatDate(inv.expiresAt)}`}</Badge>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" loading={busyInvite === inv._id} onClick={() => resend(inv)}>{expired ? 'Send new link' : 'Resend'}</Button>
                      <Button size="sm" variant="ghost" disabled={busyInvite === inv._id} onClick={() => revoke(inv)} className="hover:text-red-600 hover:bg-red-50">Revoke</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <InviteDialog
        isOpen={inviteOpen}
        onClose={() => onInviteOpenChange(false)}
        activeProjects={activeProjects}
        workspaces={workspaces || []}
        onInvited={() => { onProjectsChanged(); loadPeople(); setTimeout(loadInvitations, 400); }}
      />
      <RemoveDialog member={removing} onClose={() => setRemoving(null)} onRemoved={onProjectsChanged} />
    </div>
  );
}
