import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminsApi,
  inviteAdminApi,
  resendAdminInviteApi,
  setAdminStatusApi,
  removeAdminApi,
  resetAdminTwoFactorApi,
} from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { Avatar, Button, Card, Field, PageHeader, inputClass } from '../components/common/ui';
import { Pill } from '../components/common/StatusBadge';
import { formatDate, formatDateTime, timeAgo } from '../utils/formatters';
import { toast, toastError } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';

const STATUS = {
  active: ['green', 'Active'],
  invited: ['amber', 'Invited'],
  disabled: ['gray', 'Disabled'],
};

function InviteDialog({ onClose, onInvited }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await inviteAdminApi({ name: name.trim(), email: email.trim() });
      toast.success(`Invitation sent to ${email.trim()}.`);
      onInvited();
    } catch (err) {
      toastError(err, 'Could not send the invitation.');
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Add an admin" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-500">
          They get an email to set a password (valid for 72 hours), then turn on two-step sign-in. Admins can see and change every customer account.
        </p>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={80} className={inputClass} />
        </Field>
        <Field label="Work email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="name@company.com" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy || !name.trim() || !email.trim()}>{busy ? 'Sending…' : 'Send invitation'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getAdminsApi();
      setAdmins(data.admins);
    } catch (err) {
      toastError(err, 'Could not load the admin team.');
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Confirms, runs, reports and reloads
  const act = async ({ title, message, confirmLabel, danger, run, done }) => {
    if (!(await confirmDialog({ title, message, confirmLabel, danger }))) return;
    try {
      await run();
      toast.success(done);
      load();
    } catch (err) {
      toastError(err, 'That did not work.');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Admin',
      render: (row) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">
              {row.name}
              {row.isYou && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}
            </p>
            <p className="truncate text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (row) => <Pill tone={STATUS[row.status][0]} dot>{STATUS[row.status][1]}</Pill> },
    {
      key: '2fa',
      label: 'Two-step sign-in',
      render: (row) => row.status === 'invited'
        ? <span className="text-gray-400">—</span>
        : row.twoFactorEnabled ? <Pill tone="green">On</Pill> : <Pill tone="red">Off</Pill>,
    },
    {
      key: 'lastLogin',
      label: 'Last sign-in',
      render: (row) => <span className="whitespace-nowrap" title={formatDateTime(row.lastLoginAt)}>{row.lastLoginAt ? timeAgo(row.lastLoginAt) : 'Never'}</span>,
    },
    {
      key: 'added',
      label: 'Added',
      render: (row) => (
        <span className="whitespace-nowrap text-gray-500">
          {formatDate(row.createdAt)}
          {row.invitedBy && <span className="block text-xs">by {row.invitedBy}</span>}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => row.isYou ? null : (
        <div className="flex justify-end gap-1">
          {row.status === 'invited' && (
            <Button size="sm" variant="ghost" onClick={() => act({
              title: `Send the invitation to ${row.email} again?`,
              message: 'The earlier link stops working.',
              confirmLabel: 'Send again',
              run: () => resendAdminInviteApi(row.id),
              done: 'Invitation sent again.',
            })}>Resend</Button>
          )}
          {row.twoFactorEnabled && row.status === 'active' && (
            <Button size="sm" variant="ghost" onClick={() => act({
              title: `Reset two-step sign-in for ${row.name}?`,
              message: 'Only if they lost their phone and recovery codes. They are signed out and set it up again at their next sign-in. Confirm who is asking before you do this.',
              confirmLabel: 'Reset',
              danger: true,
              run: () => resetAdminTwoFactorApi(row.id),
              done: `Two-step sign-in reset for ${row.name}.`,
            })}>Reset 2FA</Button>
          )}
          {row.status === 'active' && (
            <Button size="sm" variant="ghost" onClick={() => act({
              title: `Disable ${row.name}?`,
              message: 'They are signed out at once and cannot sign in until you turn their account back on.',
              confirmLabel: 'Disable',
              danger: true,
              run: () => setAdminStatusApi(row.id, 'disabled'),
              done: `${row.name} is disabled.`,
            })}>Disable</Button>
          )}
          {row.status === 'disabled' && (
            <Button size="sm" variant="ghost" onClick={() => act({
              title: `Turn ${row.name}'s account back on?`,
              confirmLabel: 'Turn on',
              run: () => setAdminStatusApi(row.id, 'active'),
              done: `${row.name} can sign in again.`,
            })}>Turn on</Button>
          )}
          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => act({
            title: `Remove ${row.name} from the admin team?`,
            message: 'Their admin account is deleted. Their past actions stay in the action log.',
            confirmLabel: 'Remove',
            danger: true,
            run: () => removeAdminApi(row.id),
            done: `${row.name} was removed.`,
          })}>Remove</Button>
        </div>
      ),
    },
  ];

  const without2fa = admins.filter((a) => a.status === 'active' && !a.twoFactorEnabled).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Admin team"
        description="People who can sign in to this admin panel. Admin accounts are separate from customer accounts."
        actions={<Button variant="primary" onClick={() => setInviting(true)}>Add admin</Button>}
      />
      {without2fa > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {without2fa} active {without2fa === 1 ? 'admin has' : 'admins have'} not turned on two-step sign-in yet. They are asked to at their next sign-in.
        </div>
      )}
      <Card padded={false}>
        <DataTable columns={columns} data={admins} loading={loading} emptyMessage="No admins yet" />
      </Card>
      {inviting && <InviteDialog onClose={() => setInviting(false)} onInvited={() => { setInviting(false); load(); }} />}
    </div>
  );
}
