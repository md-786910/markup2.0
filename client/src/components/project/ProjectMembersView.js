import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getProjectApi,
  inviteMemberApi,
  removeMemberApi,
  updateMemberAccessApi,
} from '../../services/projectService';
import { toast, toastError } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirm';
import {
  Avatar,
  Badge,
  Banner,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  PageHeader,
  RowMenu,
  Section,
  Select,
} from '../kc';

const LEVEL_LABEL = {
  manage: 'Can manage',
  comment: 'Can comment',
  view: 'Can view',
};

const ROLE_LABEL = {
  owner: 'Owner',
  superadmin: 'Super Admin',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Guest (view only)' },
  { value: 'admin', label: 'Admin' },
];

export default function ProjectMembersView({
  projectId,
  projects = [],
  showProjectPicker = false,
  onSelectProject,
}) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [myAccess, setMyAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [roleLoading, setRoleLoading] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(null);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getProjectApi(projectId);
      setProject(res.data.project);
      setMyAccess(res.data.access || null);
    } catch (err) {
      toastError(err, 'Could not load the project.');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const members = useMemo(() => project?.members || [], [project]);
  const ownerId = useMemo(() => String(project?.owner?._id || project?.owner || ''), [project]);
  const isOwner = ownerId === String(user?.id);
  const canManage = isOwner || isAdmin || myAccess === 'manage';

  // Each member's effective level on this project
  const levelOf = useCallback((member) => {
    if (member.role === 'owner' || member.role === 'admin' || String(member._id) === ownerId) {
      return 'manage';
    }
    const entry = (project?.memberAccess || []).find(
      (m) => String(m.user?._id || m.user) === String(member._id)
    );
    return entry?.level || (member.role === 'guest' ? 'view' : 'comment');
  }, [ownerId, project]);

  const handleInvite = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !projectId) return;

    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);

    try {
      const defaultLevel = inviteRole === 'guest' ? 'view' : (inviteRole === 'admin' ? 'manage' : 'comment');
      const res = await inviteMemberApi(projectId, cleanEmail, inviteRole, defaultLevel);
      if (res.data?.project) {
        setProject(res.data.project);
      }
      toast.success(`${cleanEmail} has been added to this project.`);
      setInviteSuccess(`${cleanEmail} has been added / invited successfully.`);
      setEmail('');
      setInviteRole('member');
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to invite member';
      setInviteError(msg);
      toastError(err, msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAccessChange = async (memberId, level) => {
    setRoleLoading(memberId);
    try {
      const res = await updateMemberAccessApi(projectId, memberId, level);
      setProject(res.data.project);
      toast.success('Access level updated.');
    } catch (err) {
      toastError(err, 'Could not change access.');
    } finally {
      setRoleLoading(null);
    }
  };

  const handleRemove = async (member) => {
    const memberName = member.name || member.email;
    const ok = await confirmDialog({
      title: `Remove ${memberName}?`,
      message: `They will lose access to "${project?.name || 'this project'}".`,
      confirmLabel: 'Remove member',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;

    setRemoveLoading(member._id);
    try {
      const res = await removeMemberApi(projectId, member._id);
      setProject(res.data.project);
      toast.success(`${memberName} was removed from the project.`);
    } catch (err) {
      toastError(err, 'Could not remove the member.');
    } finally {
      setRemoveLoading(null);
    }
  };

  // Filtered members list
  const q = search.trim().toLowerCase();
  const filteredMembers = useMemo(() => {
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    );
  }, [members, q]);

  // Table columns definition matching Kommently DataTable standards
  const columns = useMemo(() => [
    {
      key: 'person',
      label: 'Member',
      render: (m, idx) => {
        const isMemberOwner = String(m._id) === ownerId;
        const isSelf = String(m._id) === String(user?.id);
        return (
          <div className="kc-person">
            <Avatar name={m.name || m.email} toneKey={m._id || m.email} index={idx} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <b className="truncate">{m.name || m.email}</b>
                {isMemberOwner && <Badge tone="changes">Owner</Badge>}
                {isSelf && <span style={{ fontWeight: 400, color: 'var(--slate-500)', fontSize: 12 }}>(you)</span>}
              </div>
              {m.name && m.email ? <small className="truncate">{m.email}</small> : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      label: 'Role',
      width: 140,
      render: (m) => {
        const role = m.role || 'member';
        return (
          <Badge tone={role === 'admin' || role === 'owner' ? 'review' : 'neutral'}>
            {ROLE_LABEL[role] || (role.charAt(0).toUpperCase() + role.slice(1))}
          </Badge>
        );
      },
    },
    {
      key: 'access',
      label: 'Access',
      width: 180,
      render: (m) => {
        const isMemberOwner = String(m._id) === ownerId;
        const isSelf = String(m._id) === String(user?.id);
        const currentLevel = levelOf(m);
        const isFixed = !canManage || isMemberOwner || isSelf || m.role === 'owner' || m.role === 'admin';

        if (isFixed) {
          return (
            <Badge tone={currentLevel === 'manage' ? 'review' : 'neutral'}>
              {LEVEL_LABEL[currentLevel] || currentLevel}
            </Badge>
          );
        }

        return (
          <Select
            value={currentLevel}
            disabled={roleLoading === m._id}
            onChange={(e) => handleAccessChange(m._id, e.target.value)}
            aria-label={`Access for ${m.name || m.email}`}
          >
            <option value="manage" disabled={m.role === 'guest'}>
              Can manage{m.role === 'guest' ? ' (disabled for guests)' : ''}
            </option>
            <option value="comment">Can comment</option>
            <option value="view">Can view</option>
          </Select>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 48,
      render: (m) => {
        const isMemberOwner = String(m._id) === ownerId;
        const isSelf = String(m._id) === String(user?.id);
        const canRemove = canManage && !isMemberOwner && !isSelf;

        const items = [];
        if (canRemove) {
          items.push({
            label: 'Remove from project',
            icon: 'trash',
            tone: 'danger',
            disabled: removeLoading === m._id,
            onClick: () => handleRemove(m),
          });
        }
        if (m.email) {
          if (items.length > 0) items.push({ divider: true });
          items.push({
            label: 'Copy email',
            icon: 'link',
            onClick: () => {
              navigator.clipboard?.writeText(m.email);
              toast.success('Email copied to clipboard.');
            },
          });
        }
        if (isSelf) {
          items.push({
            label: 'View profile',
            icon: 'user',
            onClick: () => navigate('/profile'),
          });
        }

        if (!items.length) return null;

        return (
          <RowMenu
            label={`Actions for ${m.name || m.email}`}
            items={items}
          />
        );
      },
    },
  ], [ownerId, user?.id, canManage, levelOf, roleLoading, removeLoading, handleRemove, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-12">
        <EmptyState
          icon="grid"
          title="Project not found"
          action={<Button variant="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>}
        >
          Select an active project or check your access permissions.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="kc-stack">
      <PageHeader
        title={`${project.name} · Members`}
        subtitle={`${members.length} people have access to this project.`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {showProjectPicker && projects.length > 1 && (
              <div style={{ minWidth: 200 }}>
                <Select
                  value={projectId}
                  onChange={(e) => onSelectProject?.(e.target.value)}
                  options={projects.map((p) => ({ value: p._id, label: p.name }))}
                  aria-label="Select project"
                />
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant="secondary"
              icon="eye"
              onClick={() => navigate(`/project/${projectId}`)}
            >
              Open project
            </Button>
          </div>
        }
      />

      {canManage && (
        <Section
          title="Invite to project"
          description="Enter an email to add a teammate or invite an outside collaborator directly to this project."
        >
          {inviteError && (
            <div style={{ marginBottom: 16 }}>
              <Banner tone="danger" title={inviteError} />
            </div>
          )}
          {inviteSuccess && (
            <div style={{ marginBottom: 16 }}>
              <Banner tone="approved" title={inviteSuccess} />
            </div>
          )}
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <Field id="member-email" label="Email address" style={{ flex: 1, margin: 0 }}>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setInviteError(''); setInviteSuccess(''); }}
                placeholder="colleague@example.com"
                required
              />
            </Field>
            <Field id="member-role" label="Role" style={{ width: 220, margin: 0 }}>
              <Select
                id="member-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                options={ROLE_OPTIONS}
              />
            </Field>
            <div className="flex items-center">
              <Button
                type="submit"
                variant="primary"
                icon="plus"
                loading={inviteLoading}
              >
                Invite
              </Button>
            </div>
          </form>
        </Section>
      )}

      {members.length > 5 && (
        <div style={{ maxWidth: 320 }}>
          <Input
            type="search"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {!members.length ? (
        <EmptyState icon="team" title="No members yet">
          Nobody else has been added to this project yet.
        </EmptyState>
      ) : !filteredMembers.length ? (
        <EmptyState
          icon="search"
          title="Nobody matches this search"
          action={<Button variant="secondary" onClick={() => setSearch('')}>Clear search</Button>}
        >
          Try another name or email address.
        </EmptyState>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredMembers}
          label="Project members"
          rowKey={(m) => m._id}
        />
      )}
    </div>
  );
}

