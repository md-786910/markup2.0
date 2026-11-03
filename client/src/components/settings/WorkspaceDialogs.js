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
import { Avatar, Badge, Button, Checkbox, Field, Input, SelectMenu, inputClass } from '../ui';

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
      <p className="-mt-1 mb-4 text-sm text-gray-500">
        People with access here get it on every project in this workspace, including new ones. Owners and admins can manage
        everything; guests can comment at most.
      </p>
      <form onSubmit={invite} className="mb-5 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <Field label="Invite by email" hint="New people get an email and join this workspace when they sign up. People already in your organization are added right away.">
          <Input value={inviteText} onChange={(e) => setInviteText(e.target.value)} placeholder="client@company.com, teammate@company.com" aria-label="Email addresses" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SelectMenu
              value={inviteLevel}
              onChange={setInviteLevel}
              ariaLabel="Access"
              className="h-9"
              options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label, description: o.hint, disabled: inviteRole === 'guest' && o.value === 'manage' }))}
            />
            <SelectMenu
              value={inviteRole}
              onChange={(r) => { setInviteRole(r); if (r === 'guest' && inviteLevel === 'manage') setInviteLevel('comment'); }}
              ariaLabel="Joins as"
              className="h-9"
              options={[
                { value: 'member', label: 'Team member', description: 'Joins your organization' },
                { value: 'guest', label: 'Guest', description: 'Outside collaborator, can comment at most' },
              ]}
            />
            <Button type="submit" variant="primary" loading={inviting} disabled={!inviteText.trim()} className="ml-auto">Invite</Button>
          </div>
        </Field>
        {invitations.length > 0 && (
          <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {invitations.map((inv) => (
              <li key={inv._id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-gray-700">{inv.email}</span>
                <Badge tone="amber" dot>Pending · {ROLE_LABEL[inv.role] || inv.role}</Badge>
                <Button size="sm" variant="ghost" onClick={() => resendInvite(inv)}>Resend</Button>
                <Button size="sm" variant="ghost" className="hover:text-red-600 hover:bg-red-50" onClick={() => cancelInvite(inv)}>Cancel</Button>
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
          <p className="p-4 text-center text-sm text-gray-400">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">No one found. Invite people from the Team page first.</p>
        ) : shown.map((p) => {
          const always = p.role === 'owner' || p.role === 'admin';
          return (
            <div key={p._id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar name={p.name || p.email} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{p.name || p.email}</span>
                <span className="block truncate text-xs text-gray-500">{p.email}</span>
              </span>
              <span className="text-xs text-gray-400">{ROLE_LABEL[p.role] || p.role}</span>
              {always ? (
                <span className="w-36 text-right text-xs text-gray-500">Manages all</span>
              ) : (
                <div className="w-36 flex justify-end">
                  <SelectMenu
                    value={levels.get(p._id) || ''}
                    onChange={(v) => setLevel(p._id, v)}
                    ariaLabel={`Access for ${p.name || p.email}`}
                    align="right"
                    options={[
                      { value: '', label: 'No access' },
                      ...LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label, description: o.hint, disabled: p.role === 'guest' && o.value === 'manage' })),
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} disabled={loading} onClick={save}>Save</Button>
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
          <p className="text-sm leading-6 text-gray-600">
            Create one link for clients to review every project in this workspace. They pick a project and comment, with just a name
            and email. New projects show up automatically.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={create}>Create review link</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Review link">
            <div className="flex gap-2">
              <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Review link" className={`${inputClass} bg-gray-50 text-gray-700`} />
              <Button variant="secondary" onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
            </div>
          </Field>

          <Checkbox checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} label="Allow comments" description="Off makes the link view-only." />

          <Field label={<>Password {share.hasPassword && <span className="font-normal text-gray-500">(set)</span>}</>}>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setRemovePassword(false); }}
              placeholder={share.hasPassword ? 'Enter a new password to change it' : 'Optional'}
              aria-label="Password"
            />
            {share.hasPassword && !password && (
              <div className="mt-2">
                <Checkbox checked={removePassword} onChange={(e) => setRemovePassword(e.target.checked)} label="Remove the password" />
              </div>
            )}
          </Field>

          <Field label="Expires on" hint={expiresAt ? null : 'Never, until you turn the link off.'}>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="max-w-[200px]" aria-label="Expires on" />
          </Field>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={busy} onClick={turnOff}>Turn off link</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button variant="primary" loading={busy} onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
