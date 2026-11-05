import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjectInvitationsApi, cancelInvitationApi, resendInvitationApi } from '../../services/invitationService';
import { getOrgPeopleApi, getWorkspaceInvitationsApi, updateOrgRoleApi } from '../../services/workspaceService';
import { toast, toastError } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirm';
import { useWorkspaces } from '../../contexts/WorkspaceContext';
import { Avatar, Badge, Button, DataTable, EmptyState, Icon, Input, RowMenu } from '../kc';
import InviteDialog from './InviteDialog';
import RemoveFromProjectDialog from './RemoveFromProjectDialog';
import { ROLES, ROLE_LABEL, formatDate, formatLastActive, idOf, isExpired } from './teamUtils';

const SEARCH_THRESHOLD = 10;
const isOwnerRole = (role) => role === 'owner' || role === 'superadmin';

// Up to two names, then "+N" (full list in the tooltip)
function NameList({ names, empty }) {
  if (!names.length) return <span className="text-ui text-slate-500">{empty}</span>;
  return (
    <span className="text-ui text-slate-700" title={names.join(', ')}>
      {names.slice(0, 2).join(', ')}
      {names.length > 2 && <span className="text-slate-500"> +{names.length - 2}</span>}
    </span>
  );
}

/**
 * The Team area body: a table of members, guests or pending invitations.
 * view: 'members' | 'guests' | 'invites' (invites only for admins).
 * members: people derived from projects (each with `projects`), used as is for
 * non-admins and to attach projects / last active to the org list for admins.
 */
export default function TeamView({
  view = 'members', members, projects, isAdmin, currentUserId, onProjectsChanged = () => {},
  inviteOpen = false, onInviteOpenChange = () => {}, onCounts, ready = true,
}) {
  const navigate = useNavigate();
  const { workspaces } = useWorkspaces();
  const activeProjects = useMemo(() => (projects || []).filter((p) => p.status === 'active'), [projects]);

  const [search, setSearch] = useState('');
  const [orgPeople, setOrgPeople] = useState(null);
  const [peopleLoaded, setPeopleLoaded] = useState(!isAdmin);
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoaded, setInvitationsLoaded] = useState(false);
  const [roleSaving, setRoleSaving] = useState(null);
  const [busyInvite, setBusyInvite] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [inviteRole, setInviteRole] = useState('member');

  const effectiveView = view === 'invites' && !isAdmin ? 'members' : view;
  useEffect(() => { setSearch(''); }, [effectiveView]);

  // Everyone in the organization (owners/admins)
  const loadPeople = useCallback(async () => {
    if (!isAdmin) { setPeopleLoaded(true); return; }
    try {
      const { data } = await getOrgPeopleApi();
      setOrgPeople(data.people || []);
    } catch { setOrgPeople(null); }
    setPeopleLoaded(true);
  }, [isAdmin]);
  useEffect(() => { loadPeople(); }, [loadPeople]);

  // Last active, from the project owners and members we already loaded
  const lastSeenById = useMemo(() => {
    const map = new Map();
    const note = (u) => {
      if (!u || typeof u !== 'object' || !u.lastSeen) return;
      const id = idOf(u);
      const prev = map.get(id);
      if (!prev || new Date(u.lastSeen) > new Date(prev)) map.set(id, u.lastSeen);
    };
    (projects || []).forEach((p) => { note(p.owner); (p.members || []).forEach(note); });
    return map;
  }, [projects]);

  // Workspaces each person can reach (from workspace grants and their projects)
  const workspaceNamesFor = useMemo(() => {
    const list = workspaces || [];
    const defaultId = list.find((w) => w.isDefault)?._id;
    const nameById = new Map(list.map((w) => [String(w._id), w.name]));
    return (person) => {
      const ids = new Set();
      list.forEach((w) => { if ((w.members || []).some((m) => idOf(m.user) === idOf(person))) ids.add(String(w._id)); });
      (person.projects || []).forEach((p) => {
        const wid = idOf(p.workspace) || (defaultId ? String(defaultId) : '');
        if (wid) ids.add(wid);
      });
      return [...ids].map((id) => nameById.get(id)).filter(Boolean);
    };
  }, [workspaces]);

  const people = useMemo(() => {
    const byId = new Map((members || []).map((m) => [String(m._id), m]));
    const base = orgPeople
      ? orgPeople.map((p) => ({ ...p, projects: byId.get(String(p._id))?.projects || [] }))
      : (members || []);
    return base.map((p) => ({ ...p, lastSeen: p.lastSeen || lastSeenById.get(String(p._id)) || null }));
  }, [orgPeople, members, lastSeenById]);

  const nonGuests = useMemo(() => people.filter((p) => (p.role || 'member') !== 'guest'), [people]);
  const guests = useMemo(() => people.filter((p) => p.role === 'guest'), [people]);

  // Pending invitations: to projects here and to whole workspaces
  const loadInvitations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [byProject, byWorkspace] = await Promise.all([
        Promise.all(activeProjects.map((p) => getProjectInvitationsApi(p._id)
          .then((r) => r.data.invitations.map((inv) => ({ ...inv, target: p.name, targetType: 'project' })))
          .catch(() => []))),
        Promise.all((workspaces || []).map((w) => getWorkspaceInvitationsApi(w._id)
          .then((r) => r.data.invitations.map((inv) => ({ ...inv, target: w.name, targetType: 'workspace' })))
          .catch(() => []))),
      ]);
      setInvitations([...byProject.flat(), ...byWorkspace.flat()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } finally {
      setInvitationsLoaded(true);
    }
  }, [activeProjects, workspaces, isAdmin]);
  useEffect(() => { if (ready) loadInvitations(); }, [loadInvitations, ready]);

  // Counts for the context panel
  const onCountsRef = useRef(onCounts);
  onCountsRef.current = onCounts;
  useEffect(() => {
    if (!ready || !peopleLoaded || !onCountsRef.current) return;
    onCountsRef.current({
      'team.members': nonGuests.length,
      'team.guests': guests.length,
      ...(isAdmin && invitationsLoaded ? { 'team.invites': invitations.length } : {}),
    });
  }, [ready, peopleLoaded, nonGuests.length, guests.length, isAdmin, invitationsLoaded, invitations.length]);

  const changeRole = async (member, role) => {
    setRoleSaving(member._id);
    try {
      await updateOrgRoleApi(member._id, role);
      toast.success(`${member.name || member.email} is now ${role === 'admin' ? 'an admin' : `a ${ROLE_LABEL[role].toLowerCase()}`}.`);
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

  const openInvite = (role = 'member') => { setInviteRole(role); onInviteOpenChange(true); };

  // ── Columns ───────────────────────────────────────────────────────────────
  const personColumns = [
    {
      key: 'person',
      label: effectiveView === 'guests' ? 'Guest' : 'Member',
      render: (m) => {
        const isSelf = String(m._id) === String(currentUserId);
        return (
          <div className="kc-person">
            <Avatar name={m.name || m.email} toneKey={m._id} />
            <div className="min-w-0">
              <b className="truncate">
                {m.name || m.email}
                {isSelf && <span className="ml-1.5 font-normal text-slate-500">(you)</span>}
              </b>
              {m.name && m.email ? <small className="truncate">{m.email}</small> : null}
            </div>
          </div>
        );
      },
    },
    { key: 'role', label: 'Role', render: (m) => <Badge tone="neutral">{ROLE_LABEL[m.role || 'member'] || 'Member'}</Badge> },
    {
      key: 'workspaces',
      label: 'Workspaces',
      render: (m) => (isOwnerRole(m.role) || m.role === 'admin'
        ? <span className="text-ui text-slate-700">All workspaces</span>
        : <NameList names={workspaceNamesFor(m)} empty="None yet" />),
    },
    {
      key: 'projects',
      label: 'Projects',
      render: (m) => {
        const list = m.projects || [];
        if (!list.length) {
          return <span className="text-ui text-slate-500">{isOwnerRole(m.role) || m.role === 'admin' ? 'All projects' : 'None yet'}</span>;
        }
        return (
          <span className="flex flex-nowrap items-center gap-1.5 min-w-0">
            {list.slice(0, 2).map((p) => (
              <button
                key={p._id}
                type="button"
                title={p.name}
                onClick={() => navigate(`/project/${p._id}`)}
                className="max-w-[120px] shrink-0 truncate rounded-md bg-slate-100 px-2 py-0.5 text-micro text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              >
                {p.name}
              </button>
            ))}
            {list.length > 2 && <span className="shrink-0 text-caption text-slate-500" title={list.slice(2).map((p) => p.name).join(', ')}>+{list.length - 2}</span>}
          </span>
        );
      },
    },
    {
      key: 'lastSeen',
      label: 'Last active',
      render: (m) => {
        const text = formatLastActive(m.lastSeen);
        return text
          ? <span className="text-ui text-slate-600" title={new Date(m.lastSeen).toLocaleString()}>{text}</span>
          : <span className="text-ui text-slate-500">Not known</span>;
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 48,
      render: (m) => {
        const role = m.role || 'member';
        const isSelf = String(m._id) === String(currentUserId);
        const editable = isAdmin && !isSelf && !isOwnerRole(role);
        if (!editable) return null;
        const list = m.projects || [];
        const saving = roleSaving === m._id;
        return (
          <RowMenu
            label={`Actions for ${m.name || m.email}`}
            items={[
              { header: 'Role' },
              ...ROLES.map((r) => ({
                label: r.label,
                checked: role === r.value,
                disabled: saving,
                onClick: () => { if (role !== r.value) changeRole(m, r.value); },
              })),
              list.length > 0 && { divider: true },
              list.length > 0 && { label: 'Manage project access', icon: 'user', onClick: () => navigate(`/project/${list[0]._id}/members`) },
              list.length > 0 && { label: 'Remove from a project', icon: 'trash', tone: 'danger', onClick: () => setRemoving(m) },
            ]}
          />
        );
      },
    },
  ];

  const inviteColumns = [
    {
      key: 'email',
      label: 'Invitee',
      render: (inv) => (
        <div className="kc-person">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icon name="mail" size={15} /></span>
          <div className="min-w-0">
            <b className="truncate">{inv.email}</b>
            <small className="truncate">{inv.targetType === 'workspace' ? `Workspace: ${inv.target}` : `Project: ${inv.target}`}</small>
          </div>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (inv) => <Badge tone="neutral">{ROLE_LABEL[inv.role || 'member'] || 'Member'}</Badge> },
    {
      key: 'invitedBy',
      label: 'Invited by',
      render: (inv) => <span className="text-ui text-slate-600">{inv.invitedBy?.name || inv.invitedBy?.email || 'Not known'}</span>,
    },
    {
      key: 'expires',
      label: 'Expires',
      render: (inv) => (isExpired(inv)
        ? <Badge tone="danger">Expired {formatDate(inv.expiresAt)}</Badge>
        : <Badge tone="changes">Expires {formatDate(inv.expiresAt)}</Badge>),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (inv) => (
        <span className="kc-table-actions">
          <Button size="sm" variant="ghost" loading={busyInvite === inv._id} onClick={() => resend(inv)}>{isExpired(inv) ? 'Send new link' : 'Resend'}</Button>
          <Button size="sm" variant="ghost" disabled={busyInvite === inv._id} onClick={() => revoke(inv)}>Revoke</Button>
        </span>
      ),
    },
  ];

  // ── Rows for the current view ─────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const allRows = effectiveView === 'invites' ? invitations : effectiveView === 'guests' ? guests : nonGuests;
  const rows = !q ? allRows : allRows.filter((r) => (effectiveView === 'invites'
    ? r.email.toLowerCase().includes(q) || (r.target || '').toLowerCase().includes(q)
    : (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)));
  const loading = !ready || !peopleLoaded || (effectiveView === 'invites' && !invitationsLoaded);
  const showSearch = allRows.length > SEARCH_THRESHOLD;

  let body;
  if (loading) {
    body = <div className="flex justify-center py-14"><span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" aria-label="Loading" /></div>;
  } else if (!allRows.length) {
    body = effectiveView === 'invites' ? (
      <EmptyState icon="mail" title="No pending invites">Invitations you send show up here until they are accepted.</EmptyState>
    ) : effectiveView === 'guests' ? (
      <EmptyState
        icon="user"
        title="No guests yet"
        action={isAdmin ? <Button variant="secondary" icon="plus" onClick={() => openInvite('guest')}>Invite a guest</Button> : null}
      >
        Guests are outside collaborators who can comment on the projects you give them.
      </EmptyState>
    ) : (
      <EmptyState icon="team" title="No members yet">Members are the people who work on your organization&apos;s projects.</EmptyState>
    );
  } else if (!rows.length) {
    body = (
      <EmptyState icon="search" title="Nobody matches this search" action={<Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button>}>
        Try another name or email address.
      </EmptyState>
    );
  } else {
    body = (
      <DataTable
        label={effectiveView === 'invites' ? 'Pending invites' : effectiveView === 'guests' ? 'Guests' : 'Members'}
        columns={effectiveView === 'invites' ? inviteColumns : personColumns}
        rows={rows}
      />
    );
  }

  return (
    <div>
      {showSearch && !loading && (
        <div className="mb-3 max-w-xs">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={effectiveView === 'invites' ? 'Search invites' : 'Search by name or email'}
            aria-label="Search"
          />
        </div>
      )}

      {body}

      <InviteDialog
        isOpen={inviteOpen}
        initialRole={inviteRole}
        onClose={() => { onInviteOpenChange(false); setInviteRole('member'); }}
        activeProjects={activeProjects}
        workspaces={workspaces || []}
        onInvited={() => { onProjectsChanged(); loadPeople(); setTimeout(loadInvitations, 400); }}
      />
      <RemoveFromProjectDialog member={removing} onClose={() => setRemoving(null)} onRemoved={onProjectsChanged} />
    </div>
  );
}
