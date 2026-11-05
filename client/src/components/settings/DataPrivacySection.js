import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getMeApi,
  exportOrganizationApi,
  requestOrganizationDeletionApi,
  cancelOrganizationDeletionApi,
} from '../../services/authService';
import { toast, toastError } from '../../utils/toast';
import { Banner, Button, Field, Input, Row, Section } from '../kc';
import SettingsLayout, { Muted } from './SettingsLayout';

// Settings → Data and privacy: data export (owner/admin) and scheduled
// organization deletion (owner: password + name, 7-day grace, can be cancelled).
export default function DataPrivacySection() {
  const { user, isOwner, isAdmin, updateUser } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const scheduledAt = user?.orgDeletionScheduledAt ? new Date(user.orgDeletionScheduledAt) : null;
  const deletionDate = scheduledAt?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

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
      toastError(err, 'Could not export the organization data.');
    }
    setExporting(false);
  };

  const closeDelete = () => {
    setShowDelete(false);
    setPassword('');
    setConfirmName('');
    setError('');
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await requestOrganizationDeletionApi(password, confirmName);
      closeDelete();
      await refreshUser();
      toast.success('Organization scheduled for deletion.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not schedule the deletion.');
    }
    setBusy(false);
  };

  const handleCancelDeletion = async () => {
    setBusy(true);
    try {
      await cancelOrganizationDeletionApi();
      await refreshUser();
      toast.success('Deletion cancelled.');
    } catch (err) {
      toastError(err, 'Could not cancel the deletion.');
    }
    setBusy(false);
  };

  if (!isAdmin) {
    return (
      <SettingsLayout title="Data and privacy" subtitle="Export or delete your organization's data.">
        <Section title="Organization data" description="Exports and deletion are handled by the owner and admins.">
          <Muted>
            Ask an owner or admin of {user?.orgName || 'your organization'} for a data export. To close your own account, go to{' '}
            <Link to="/profile" className="kc-link">Profile</Link>.
          </Muted>
        </Section>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title="Data and privacy" subtitle="Export or delete your organization's data.">
      <Section title="Export" description="Download everything this organization stores.">
        <Row title="Organization data" description="Workspaces, projects, pins, comments, members and invoices as one JSON file.">
          <Button loading={exporting} onClick={handleExport} style={{ flexShrink: 0 }}>
            {exporting ? 'Preparing export' : 'Export data'}
          </Button>
        </Row>
      </Section>

      {isOwner && (
        <form onSubmit={handleDelete}>
          <Section
            tone="danger"
            title="Danger zone"
            description="Deleting the organization removes it for everyone."
            footer={showDelete && !scheduledAt ? (
              <>
                <Button onClick={closeDelete}>Keep organization</Button>
                <Button type="submit" variant="danger" loading={busy} disabled={confirmName !== user?.orgName || !password}>Delete in 7 days</Button>
              </>
            ) : null}
          >
            {scheduledAt ? (
              <Banner
                tone="danger"
                title={`Scheduled for deletion on ${deletionDate}`}
                action={<Button loading={busy} onClick={handleCancelDeletion}>Cancel deletion</Button>}
              >
                Everything is read-only until then.
              </Banner>
            ) : (
              <Row title="Delete organization" description="Removes every workspace, project, file and member after a 7-day grace period. Invoices are kept for tax records.">
                {!showDelete && <Button variant="danger-quiet" onClick={() => setShowDelete(true)} style={{ flexShrink: 0 }}>Delete organization</Button>}
              </Row>
            )}
            {showDelete && !scheduledAt && (
              <>
                <p className="m-0 text-ui text-gray-600">
                  All workspaces, projects, pins, comments, files and members are deleted after 7 days. Everything is read-only until then and you can still cancel.
                </p>
                <Field id="delete-org-name" label={`Type ${user?.orgName || ''} to confirm`}>
                  <Input id="delete-org-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
                </Field>
                <Field id="delete-org-password" label="Your password" error={error}>
                  <Input id="delete-org-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} autoComplete="current-password" />
                </Field>
              </>
            )}
          </Section>
        </form>
      )}
    </SettingsLayout>
  );
}
