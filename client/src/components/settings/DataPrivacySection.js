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
import Modal from '../common/Modal';
import { Banner, Button, Field, Input, Row, Section } from '../kc';
import SettingsLayout, { Muted } from './SettingsLayout';

// Settings → Data and privacy: data export (owner/admin) and scheduled
// organization deletion (owner/admin: password + name/email, 7-day grace period, can be cancelled).
export default function DataPrivacySection() {
  const { user, isOwner, isAdmin, updateUser } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
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
    } finally {
      setExporting(false);
    }
  };

  const closeDelete = () => {
    setShowDeleteModal(false);
    setPassword('');
    setConfirmValue('');
    setError('');
  };

  const trimmed = confirmValue.trim().toLowerCase();
  const orgNameLower = (user?.orgName || '').trim().toLowerCase();
  const userEmailLower = (user?.email || '').trim().toLowerCase();
  const isMatch = (orgNameLower && trimmed === orgNameLower) || (userEmailLower && trimmed === userEmailLower);
  const canSubmit = isMatch && password.length > 0;

  const handleDelete = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError('');
    try {
      const res = await requestOrganizationDeletionApi(password, confirmValue);
      if (res.data?.user) updateUser(res.data.user);
      closeDelete();
      await refreshUser();
      toast.success('Organization scheduled for deletion.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not schedule the deletion.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelDeletion = async () => {
    setBusy(true);
    try {
      const res = await cancelOrganizationDeletionApi();
      if (res.data?.user) updateUser(res.data.user);
      await refreshUser();
      toast.success('Deletion cancelled.');
    } catch (err) {
      toastError(err, 'Could not cancel the deletion.');
    } finally {
      setBusy(false);
    }
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
        <Row title="Organization data" description="Workspaces, projects, pins, comments, members and invoices as one JSON file." last>
          <Button loading={exporting} onClick={handleExport} style={{ flexShrink: 0 }}>
            {exporting ? 'Preparing export' : 'Export data'}
          </Button>
        </Row>
      </Section>

      {(isOwner || isAdmin) && (
        <>
          <Section
            tone="danger"
            title="Danger zone"
            description="Deleting the organization removes it for everyone."
          >
            {scheduledAt ? (
              <Banner
                tone="danger"
                title={`Scheduled for deletion on ${deletionDate}`}
                action={<Button loading={busy} onClick={handleCancelDeletion}>Cancel deletion</Button>}
              >
                Everything is read-only until then. You can cancel the scheduled deletion anytime before this date.
              </Banner>
            ) : (
              <Row
                title="Delete organization"
                description="Removes every workspace, project, file and member after a 7-day grace period. Invoices are kept for tax records."
                last
              >
                <Button
                  variant="danger-quiet"
                  onClick={() => setShowDeleteModal(true)}
                  style={{ flexShrink: 0 }}
                >
                  Delete organization
                </Button>
              </Row>
            )}
          </Section>

          <Modal
            isOpen={showDeleteModal}
            onClose={busy ? undefined : closeDelete}
            title="Delete Organization"
            size="md"
          >
            <form onSubmit={handleDelete}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Banner tone="danger" title="Warning: This action will schedule organization deletion">
                  Deleting <strong>{user?.orgName || 'this organization'}</strong> will remove every workspace, project, pin, comment, file, and member after a <strong>7-day grace period</strong>.
                </Banner>

                <p className="m-0 text-ui text-gray-600" style={{ fontSize: 13, lineHeight: '20px' }}>
                  During the 7-day grace period, all workspaces and projects remain in <strong>read-only mode</strong>. You can cancel this scheduled deletion anytime before the grace period ends. Invoices are kept for tax records.
                </p>

                <Field
                  id="delete-org-confirm"
                  label={
                    <span>
                      Type <strong>{user?.orgName || 'organization name'}</strong> or your email to confirm
                    </span>
                  }
                >
                  <Input
                    id="delete-org-confirm"
                    value={confirmValue}
                    onChange={(e) => {
                      setConfirmValue(e.target.value);
                      setError('');
                    }}
                    placeholder={user?.orgName || user?.email || ''}
                    autoComplete="off"
                  />
                </Field>

                <Field id="delete-org-password" label="Your password" error={error}>
                  <Input
                    id="delete-org-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your account password"
                    autoComplete="current-password"
                  />
                </Field>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <Button type="button" onClick={closeDelete} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    loading={busy}
                    disabled={!canSubmit}
                  >
                    Confirm Deletion
                  </Button>
                </div>
              </div>
            </form>
          </Modal>
        </>
      )}
    </SettingsLayout>
  );
}
