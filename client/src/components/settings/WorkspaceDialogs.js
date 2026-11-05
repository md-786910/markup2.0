import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import {
  getOrgPeopleApi,
  setWorkspaceMembersApi,
  enableWorkspaceShareApi,
  updateWorkspaceShareApi,
  disableWorkspaceShareApi,
  inviteToWorkspaceApi,
  getWorkspaceInvitationsApi,
} from '../../services/workspaceService';
import { cancelInvitationApi, resendInvitationApi } from '../../services/invitationService';
import { toast, toastError } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirm';
import { Avatar, Badge, Banner, Button, Checkbox, Field, Input, Select } from '../kc';

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest' };

// Access levels (server: utils/access.js). Guests can comment at most.
export const LEVEL_OPTIONS = [
  { value: 'manage', label: 'Can manage', hint: 'Projects, sharing and members' },
  { value: 'comment', label: 'Can comment', hint: 'Pin, comment and resolve' },
  { value: 'view', label: 'Can view', hint: 'Read only' },
];

/** Choose who sees every project in a workspace. */
export function WorkspaceMembersDialog({ workspace, onClose, onSaved }) {
  const [people, setPeople] = useState([]);
  // userId -> level for people with access to this workspace
  const [levels, setLevels] = useState(() => new Map((workspace.members || []).map((m) => [String(m.user), m.level])));
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteText, setInviteText] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLevel, setInviteLevel] = useState('comment');
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState([]);

  const loadInvitations = () => getWorkspaceInvitationsApi(workspace._id)
    .then((res) => setInvitations(res.data.invitations || []))
    .catch(() => {});

  useEffect(() => { loadInvitations(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const invite = async (e) => {
    e.preventDefault();
    const emails = inviteText.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (!emails.length) return;
    setInviting(true);
    try {
      const res = await inviteToWorkspaceApi(workspace._id, emails, inviteRole, inviteLevel);
      const results = res.data.results || [];
      const ok = results.filter((r) => r.status === 'added' || r.status === 'invited');
      const failed = results.filter((r) => r.status === 'error');
      const already = results.filter((r) => r.status === 'already');
      if (ok.length) toast.success(`${ok.length} ${ok.length === 1 ? 'person' : 'people'} invited.`);
      if (already.length) toast.info(`${already.map((r) => r.email).join(', ')}: ${already[0].message.toLowerCase()}.`);
      failed.forEach((r) => toast.error(`${r.email}: ${r.message}`));
      // People already in the organization were added straight away
      results.filter((r) => r.status === 'added').forEach((r) => {
        const person = people.find((p) => p.email === r.email);
        if (person) setLevels((prev) => new Map(prev).set(person._id, person.role === 'guest' && inviteLevel === 'manage' ? 'comment' : inviteLevel));
      });
      setInviteText('');
      loadInvitations();
      getOrgPeopleApi().then((r) => setPeople(r.data.people || [])).catch(() => {});
      onSaved?.();
    } catch (err) {
      toastError(err, 'Could not send the invitations.');
    } finally {
      setInviting(false);
    }
  };

  const cancelInvite = async (inv) => {
    try {
      await cancelInvitationApi(inv._id);
      setInvitations((prev) => prev.filter((i) => i._id !== inv._id));
    } catch (err) {
      toastError(err, 'Could not cancel the invitation.');
    }
  };

  const resendInvite = async (inv) => {
    try {
      await resendInvitationApi(inv._id);
      toast.success(`Invitation resent to ${inv.email}.`);
    } catch (err) {
      toastError(err, 'Could not resend the invitation.');
    }
  };

  useEffect(() => {
    getOrgPeopleApi()
      .then((res) => setPeople(res.data.people || []))
      .catch((err) => toastError(err, 'Could not load people.'))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => !q || p.name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [people, query]);

  const setLevel = (id, level) => setLevels((prev) => {
    const next = new Map(prev);
    if (level) next.set(id, level); else next.delete(id);
    return next;
  });

  const save = async () => {
    setSaving(true);
    try {
      // Owners and admins manage everything already; only store the others
      const members = people
        .filter((p) => levels.has(p._id) && p.role !== 'owner' && p.role !== 'admin')
        .map((p) => ({ userId: p._id, level: levels.get(p._id) }));
      await setWorkspaceMembersApi(workspace._id, members);
      toast.success('Workspace members updated.');
      onSaved?.();
      onClose();
    } catch (err) {
      toastError(err, 'Could not update members.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Members of ${workspace.name}`} size="md">
      <p className="m-0 mb-4 text-ui text-gray-600">
        People with access here get it on every project in this workspace, including new ones. Owners and admins can manage
        everything; guests can comment at most.
      </p>
      <form onSubmit={invite} className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-200 p-4" style={{ background: 'var(--slate-50)' }}>
        <Field id="ws-invite-emails" label="Invite by email" hint="New people get an email and join this workspace when they sign up. People already in your organization are added right away.">
          <Input id="ws-invite-emails" value={inviteText} onChange={(e) => setInviteText(e.target.value)} placeholder="client@company.com, teammate@company.com" />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          <Field id="ws-invite-level" label="Access" style={{ flex: '1 1 140px' }}>
            <Select
              id="ws-invite-level"
              value={inviteLevel}
              onChange={(e) => setInviteLevel(e.target.value)}
              options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label, disabled: inviteRole === 'guest' && o.value === 'manage' }))}
            />
          </Field>
          <Field id="ws-invite-role" label="Joins as" style={{ flex: '1 1 140px' }}>
            <Select
              id="ws-invite-role"
              value={inviteRole}
              onChange={(e) => { const r = e.target.value; setInviteRole(r); if (r === 'guest' && inviteLevel === 'manage') setInviteLevel('comment'); }}
              options={[
                { value: 'member', label: 'Team member' },
                { value: 'guest', label: 'Guest (comments at most)' },
              ]}
            />
          </Field>
          <Button type="submit" variant="primary" loading={inviting} disabled={!inviteText.trim()}>Send invites</Button>
        </div>
        {invitations.length > 0 && (
          <ul className="m-0 p-0 list-none divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {invitations.map((inv) => (
              <li key={inv._id} className="flex items-center gap-2 px-3 py-2 text-ui">
                <span className="min-w-0 flex-1 truncate text-gray-700">{inv.email}</span>
                <Badge tone="changes">Pending · {ROLE_LABEL[inv.role] || inv.role}</Badge>
                <Button size="sm" variant="ghost" onClick={() => resendInvite(inv)}>Resend</Button>
                <Button size="sm" variant="ghost" onClick={() => cancelInvite(inv)}>Cancel invite</Button>
              </li>
            ))}
          </ul>
        )}
      </form>
      <div className="mb-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" aria-label="Search people" />
      </div>
      <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
        {loading ? (
          <p className="m-0 p-4 text-center text-ui text-gray-500">Loading people…</p>
        ) : shown.length === 0 ? (
          <p className="m-0 p-4 text-center text-ui text-gray-500">No one found. Invite people by email above.</p>
        ) : shown.map((p, i) => {
          const always = p.role === 'owner' || p.role === 'admin';
          return (
            <div key={p._id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar name={p.name || p.email} tone={p.tone} toneKey={p._id} index={i} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui font-medium text-gray-900">{p.name || p.email}</span>
                <span className="block truncate text-caption text-gray-500">{p.email} · {ROLE_LABEL[p.role] || p.role}</span>
              </span>
              {always ? (
                <span className="w-36 text-right text-caption text-gray-500">Manages all</span>
              ) : (
                <div className="w-36 shrink-0">
                  <Select
                    value={levels.get(p._id) || ''}
                    onChange={(e) => setLevel(p._id, e.target.value)}
                    aria-label={`Access for ${p.name || p.email}`}
                    options={[
                      { value: '', label: 'No access' },
                      ...LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label, disabled: p.role === 'guest' && o.value === 'manage' })),
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} disabled={loading} onClick={save}>Save changes</Button>
      </div>
    </Modal>
  );
}

/** One review link for every project in a workspace. */
export function WorkspaceShareDialog({ workspace, onClose, onSaved }) {
  const initial = workspace.shareSettings || {};
  const [share, setShare] = useState(initial.enabled ? initial : null);
  const [allowComments, setAllowComments] = useState(initial.allowComments !== false);
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt ? String(initial.expiresAt).slice(0, 10) : '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = share?.token ? `${window.location.origin}/review/w/${share.token}` : '';

  const run = async (fn, okMessage) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.data?.shareSettings) setShare(res.data.shareSettings);
      if (okMessage) toast.success(okMessage);
      onSaved?.();
      return res;
    } catch (err) {
      toastError(err, 'Could not update the review link.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = () => run(() => enableWorkspaceShareApi(workspace._id, { allowComments: true }), 'Review link created.');

  const save = () => {
    const data = { allowComments, expiresAt: expiresAt || null };
    if (password) data.password = password;
    else if (removePassword) data.password = null;
    return run(() => updateWorkspaceShareApi(workspace._id, data), 'Link settings saved.').then((res) => {
      if (res) { setPassword(''); setRemovePassword(false); }
    });
  };

  const turnOff = async () => {
    const ok = await confirmDialog({
      title: 'Turn off this review link?',
      message: 'People with the link lose access right away. Links of individual projects keep working.',
      confirmLabel: 'Turn off',
      danger: true,
    });
    if (!ok) return;
    const res = await run(() => disableWorkspaceShareApi(workspace._id), 'Review link turned off.');
    if (res) setShare(null);
  };

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  return (
    <Modal isOpen onClose={onClose} title={`Share ${workspace.name}`} size="md">
      {!share ? (
        <div>
          <p className="m-0 text-ui text-gray-600">
            Create one link for clients to review every project in this workspace. They pick a project and comment, with just a name
            and email. New projects show up automatically.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={create}>Create review link</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field id="ws-review-link" label="Review link">
            <div className="flex gap-2">
              <Input id="ws-review-link" readOnly value={url} onFocus={(e) => e.target.select()} style={{ background: 'var(--slate-50)' }} />
              <Button icon="copy" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
            </div>
          </Field>

          <Checkbox checked={allowComments} onChange={setAllowComments} label="Allow comments" description="Off makes the link view-only." />

          <Field id="ws-review-password" label={share.hasPassword ? 'Password (set)' : 'Password'}>
            <Input
              id="ws-review-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setRemovePassword(false); }}
              placeholder={share.hasPassword ? 'Enter a new password to change it' : 'Optional'}
              autoComplete="new-password"
            />
          </Field>
          {share.hasPassword && !password && (
            <Checkbox checked={removePassword} onChange={setRemovePassword} label="Remove the password" />
          )}

          <Field id="ws-review-expires" label="Expires on" hint={expiresAt ? null : 'Never, until you turn the link off.'}>
            <Input id="ws-review-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={{ maxWidth: 200 }} />
          </Field>

          {share.expiresAt && new Date(share.expiresAt) < new Date() && (
            <Banner tone="warning">This link has expired. Pick a new date or clear it.</Banner>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
            <Button variant="danger-quiet" disabled={busy} onClick={turnOff}>Turn off link</Button>
            <div className="flex gap-2">
              <Button onClick={onClose}>Close</Button>
              <Button variant="primary" loading={busy} onClick={save}>Save changes</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
