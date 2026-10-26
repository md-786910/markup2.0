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
      <form onSubmit={invite} className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Invite by email</label>
        <input
            value={inviteText}
            onChange={(e) => setInviteText(e.target.value)}
            placeholder="client@company.com, teammate@company.com"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        <div className="mt-2 flex gap-2">
          <select
            value={inviteLevel}
            onChange={(e) => setInviteLevel(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-blue-600 focus:outline-none"
            aria-label="Access"
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={inviteRole === 'guest' && o.value === 'manage'}>{o.label}</option>
            ))}
          </select>
          <select
            value={inviteRole}
            onChange={(e) => { setInviteRole(e.target.value); if (e.target.value === 'guest' && inviteLevel === 'manage') setInviteLevel('comment'); }}
            className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm focus:border-blue-600 focus:outline-none"
            aria-label="Joins as"
            title="Team members join your organization; guests are outside collaborators"
          >
            <option value="member">Team member</option>
            <option value="guest">Guest</option>
          </select>
          <button type="submit" disabled={inviting || !inviteText.trim()} className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {inviting ? 'Sending…' : 'Invite'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">New people get an email and join this workspace when they sign up. People already in your organization are added right away.</p>
        {invitations.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {invitations.map((inv) => (
              <div key={inv._id} className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-gray-700">{inv.email}</span>
                <span className="text-xs text-gray-400">Pending · {ROLE_LABEL[inv.role] || inv.role}</span>
                <button type="button" onClick={() => resendInvite(inv)} className="text-xs font-medium text-blue-600 hover:text-blue-700">Resend</button>
                <button type="button" onClick={() => cancelInvite(inv)} className="text-xs font-medium text-gray-500 hover:text-red-600">Cancel</button>
              </div>
            ))}
          </div>
        )}
      </form>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people"
        className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
      />
      <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
        {loading ? (
          <p className="p-4 text-center text-sm text-gray-400">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">No one found. Invite people from the Team page first.</p>
        ) : shown.map((p) => {
          const always = p.role === 'owner' || p.role === 'admin';
          return (
            <div key={p._id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                {(p.name || p.email)[0].toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{p.name || p.email}</span>
                <span className="block truncate text-xs text-gray-500">{p.email}</span>
              </span>
              <span className="text-xs text-gray-400">{ROLE_LABEL[p.role] || p.role}</span>
              {always ? (
                <span className="w-32 text-right text-xs text-gray-500">Manages all</span>
              ) : (
                <select
                  value={levels.get(p._id) || ''}
                  onChange={(e) => setLevel(p._id, e.target.value)}
                  aria-label={`Access for ${p.name || p.email}`}
                  className={`w-32 rounded-md border px-2 py-1 text-xs focus:border-blue-600 focus:outline-none ${levels.has(p._id) ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-400'}`}
                >
                  <option value="">No access</option>
                  {LEVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} disabled={p.role === 'guest' && o.value === 'manage'}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
        <button type="button" onClick={save} disabled={saving || loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
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
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={create} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Creating…' : 'Create review link'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Review link</label>
            <div className="flex gap-2">
              <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
              <button type="button" onClick={copy} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-gray-900">Allow comments</span>
              <span className="block text-xs text-gray-500">Off makes the link view-only.</span>
            </span>
            <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          </label>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Password {share.hasPassword && <span className="font-normal text-gray-500">(set)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setRemovePassword(false); }}
              placeholder={share.hasPassword ? 'Enter a new password to change it' : 'Optional'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {share.hasPassword && !password && (
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={removePassword} onChange={(e) => setRemovePassword(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300" />
                Remove the password
              </label>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Expires on</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <span className="ml-2 text-xs text-gray-500">{expiresAt ? '' : 'Never'}</span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <button type="button" onClick={turnOff} disabled={busy} className="text-sm font-medium text-red-600 hover:text-red-700">
              Turn off link
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Close</button>
              <button type="button" onClick={save} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
