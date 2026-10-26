import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getMeApi,
  exportOrganizationApi,
  requestOrganizationDeletionApi,
  cancelOrganizationDeletionApi,
} from '../../services/authService';

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

  return (
    <div className="mb-10 rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-base font-semibold text-gray-900">Your data</h3>
      <p className="text-sm text-gray-500 mt-1 mb-5">Download everything this organization stores, or delete it permanently.</p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={handleExport} disabled={exporting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          {exporting ? 'Preparing export…' : 'Export data (JSON)'}
        </button>
      </div>

      {isOwner && scheduledAt && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800 font-medium">
            This organization will be permanently deleted on {scheduledAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}. It is read-only until then.
          </p>
          <button onClick={handleCancelDeletion} disabled={busy} className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-100 disabled:opacity-50">
            Cancel deletion
          </button>
        </div>
      )}

      {isOwner && !scheduledAt && !showDelete && (
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-5">
          <div>
            <p className="text-sm font-medium text-gray-900">Delete organization</p>
            <p className="text-sm text-gray-500">Removes every workspace, project, feedback, file, and member after a 7-day grace period.</p>
          </div>
          <button onClick={() => setShowDelete(true)} className="shrink-0 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
            Delete…
          </button>
        </div>
      )}

      {isOwner && !scheduledAt && showDelete && (
        <form onSubmit={handleDelete} className="rounded-xl border border-red-200 p-4 max-w-md">
          <p className="text-sm text-gray-700 mb-3">
            All workspaces, projects, pins, comments, files and members are deleted after 7 days. Everything is read-only until then and you can cancel. Invoices are kept for tax records.
          </p>
          <label className="block text-xs font-medium text-gray-600 mb-3">
            Type <strong>{user?.orgName}</strong> to confirm
            <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </label>
          <label className="block text-xs font-medium text-gray-600 mb-4">
            Your password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Keep organization</button>
            <button type="submit" disabled={busy || confirmName !== user?.orgName || !password} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
              Delete organization in 7 days
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
