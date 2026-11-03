import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getMeApi,
  exportOrganizationApi,
  requestOrganizationDeletionApi,
  cancelOrganizationDeletionApi,
} from '../../services/authService';
import { Button, Card, Field, Input, Notice, SettingRow } from '../ui';

// Workspace data export (owner/admin) and scheduled workspace deletion (owner).
export default function DataPrivacySection() {
  const { user, isOwner, isAdmin, updateUser } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isAdmin) return null;
  const scheduledAt = user?.orgDeletionScheduledAt ? new Date(user.orgDeletionScheduledAt) : null;

  const refreshUser = async () => {
    const res = await getMeApi();
    updateUser(res.data.user);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportOrganizationApi();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Could not export workspace data.');
    }
    setExporting(false);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await requestOrganizationDeletionApi(password, confirmName);
      setShowDelete(false);
      setPassword('');
      setConfirmName('');
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not schedule deletion.');
    }
    setBusy(false);
  };

  const handleCancelDeletion = async () => {
    setBusy(true);
    setError('');
    try {
      await cancelOrganizationDeletionApi();
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel deletion.');
    }
    setBusy(false);
  };

  const deletionDate = scheduledAt?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Card title="Your data" description="Download everything this organization stores, or delete it for good.">
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <SettingRow label="Export" hint="Workspaces, projects, pins, comments, members and invoices as one JSON file." last={!isOwner}>
        <Button variant="secondary" loading={exporting} onClick={handleExport}>{exporting ? 'Preparing export…' : 'Export data (JSON)'}</Button>
      </SettingRow>

      {isOwner && (
        <SettingRow label="Delete organization" hint="Removes every workspace, project, file and member after a 7-day grace period." last>
          {scheduledAt ? (
            <Notice tone="red" action={<Button variant="danger-soft" size="sm" loading={busy} onClick={handleCancelDeletion}>Cancel deletion</Button>}>
              Scheduled for deletion on <span className="font-semibold">{deletionDate}</span>. Everything is read-only until then.
            </Notice>
          ) : !showDelete ? (
            <Button variant="danger-soft" onClick={() => setShowDelete(true)}>Delete organization…</Button>
          ) : (
            <form onSubmit={handleDelete} className="max-w-md space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-4">
              <p className="text-sm text-gray-700">
                All workspaces, projects, pins, comments, files and members are deleted after 7 days. Everything is read-only until then and you can still cancel. Invoices are kept for tax records.
              </p>
              <Field label={<>Type <span className="font-semibold text-gray-900">{user?.orgName}</span> to confirm</>}>
                <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} aria-label="Organization name" />
              </Field>
              <Field label="Your password">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-label="Your password" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setShowDelete(false)}>Keep organization</Button>
                <Button type="submit" variant="danger" loading={busy} disabled={confirmName !== user?.orgName || !password}>Delete in 7 days</Button>
              </div>
            </form>
          )}
        </SettingRow>
      )}
    </Card>
  );
}
