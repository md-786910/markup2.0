import React, { useEffect, useId, useRef, useState } from 'react';
import { inviteMemberApi } from '../../services/projectService';
import { inviteToWorkspaceApi } from '../../services/workspaceService';
import { toast } from '../../utils/toast';
import Modal from '../common/Modal';
import { Button, Checkbox, Field, Icon, Select } from '../kc';
import { EMAIL_RE, ROLES, parseEmailList } from './teamUtils';

// Invite by email to whole workspaces and/or single projects. People already
// in the organization are added at once; everyone else gets a sign-up link.
export default function InviteDialog({ isOpen, onClose, activeProjects, workspaces, onInvited, initialRole = 'member' }) {
  const [emails, setEmails] = useState([]);
  const [draft, setDraft] = useState('');
  const [role, setRole] = useState(initialRole);
  const [projectIds, setProjectIds] = useState([]);
  const [workspaceIds, setWorkspaceIds] = useState([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const ids = useId();
  const emailId = `${ids}-emails`;
  const roleId = `${ids}-role`;

  const accessLevel = role === 'guest' ? 'view' : 'comment';

  useEffect(() => {
    if (!isOpen) return;
    setEmails([]);
    setDraft('');
    setRole(initialRole);
    setProjectIds([]);
    setWorkspaceIds([]);
    setError('');
  }, [isOpen, initialRole]);

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
  const accessCount = chosenWorkspaces.length + projectIds.filter((id) => activeProjects.some((p) => p._id === id)).length;
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
      const projectResults = await Promise.allSettled(
        projectIds.flatMap((pid) => uniqueEmails.map((m) => inviteMemberApi(pid, m, role, accessLevel)))
      );
      const wsResults = await Promise.allSettled(
        chosenWorkspaces.map((w) => inviteToWorkspaceApi(w._id, uniqueEmails, role, accessLevel))
      );
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

  const roleInfo = ROLES.find((r) => r.value === role);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite people" size="lg">
      <form onSubmit={send} className="space-y-4">
        <p className="text-ui text-slate-500">People already in your organization are added at once. Everyone else gets an email with a sign-up link.</p>

        <Field id={emailId} label="Email addresses" hint="Press Enter or a comma after each address. You can paste a list.">
          <div
            className="kc-input flex flex-wrap items-center gap-1.5 py-1 px-2"
            style={{ height: 'auto', minHeight: 36 }}
            onClick={() => inputRef.current?.focus()}
          >
            {emails.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-md bg-slate-100 pl-2 pr-1 py-0.5 text-ui text-slate-700">
                <span className="max-w-[200px] truncate">{m}</span>
                <button
                  type="button"
                  aria-label={`Remove ${m}`}
                  onClick={(ev) => { ev.stopPropagation(); setEmails((p) => p.filter((x) => x !== m)); }}
                  className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                >
                  <Icon name="x" size={12} />
                </button>
              </span>
            ))}
            <input
              id={emailId}
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
              className="min-w-[160px] flex-1 border-0 bg-transparent px-1 py-0.5 text-ui text-slate-900 outline-none placeholder:text-slate-500"
            />
          </div>
        </Field>

        <Field id={roleId} label="Role" hint={role === 'guest' ? 'Outside collaborator, view only.' : roleInfo?.description}>
          <Select id={roleId} value={role} onChange={(e) => setRole(e.target.value)} options={ROLES.map(({ value, label }) => ({ value, label }))} />
        </Field>

        <Field label="Access" hint={role === 'admin' ? 'Admins see every workspace; pick a project to send the invitation from.' : 'A whole workspace includes its future projects.'}>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 p-3 space-y-3" role="group" aria-label="Access">
            {role !== 'admin' && (
              <div className="space-y-2">
                <p className="text-micro text-slate-500">Whole workspace</p>
                {workspaces.map((w) => (
                  <div key={w._id} className="flex items-center justify-between gap-3">
                    <Checkbox label={w.name} checked={workspaceIds.includes(w._id)} onChange={() => toggle(setWorkspaceIds, w._id)} />
                    <span className="shrink-0 text-caption text-slate-500">{w.projectCount} {w.projectCount === 1 ? 'project' : 'projects'}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-micro text-slate-500">Single projects</p>
              {activeProjects.length === 0 ? (
                <p className="text-ui text-slate-500">No active projects yet.</p>
              ) : activeProjects.map((p) => (
                <div key={p._id}>
                  <Checkbox label={p.name} checked={projectIds.includes(p._id)} onChange={() => toggle(setProjectIds, p._id)} />
                </div>
              ))}
            </div>
          </div>
        </Field>

        {error && <p role="alert" className="text-ui text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={sending} disabled={!canSend}>
            {uniqueEmails.length === 1 ? 'Send invitation' : 'Send invitations'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
