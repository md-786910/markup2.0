import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrganizationDetailApi, lockOrganizationApi, unlockOrganizationApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, timeAgo } from '../utils/formatters';
import { PLAN_COLORS, PLAN_LABELS } from '../config/plans';

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockModal, setLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getOrganizationDetailApi(id);
      setData(res.data);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLock = async () => {
    setActionLoading(true);
    try {
      await lockOrganizationApi(id, lockReason);
      setLockModal(false);
      setLockReason('');
      fetchData();
    } catch {}
    setActionLoading(false);
  };

  const handleUnlock = async () => {
    setActionLoading(true);
    try {
      await unlockOrganizationApi(id);
      fetchData();
    } catch {}
    setActionLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!data) return <p className="text-gray-500 py-10 text-center">Organization not found.</p>;

  const { organization: org, members, projects, pinStats } = data;

  const memberColumns = [
    { key: 'name', label: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (row) => <Badge label={row.role} color={row.role === 'owner' ? 'purple' : row.role === 'admin' ? 'blue' : 'gray'} /> },
    { key: 'lastSeen', label: 'Last Seen', render: (row) => timeAgo(row.lastSeen) },
  ];

  const projectColumns = [
    { key: 'name', label: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'url', label: 'URL', render: (row) => row.websiteUrl ? (
      <a href={row.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline text-xs max-w-[200px] truncate block">
        {row.websiteUrl.replace(/^https?:\/\//, '')}
      </a>
    ) : <span className="text-gray-400 text-xs">—</span> },
    { key: 'projectType', label: 'Type', render: (row) => <Badge label={row.projectType} color={row.projectType === 'website' ? 'blue' : 'purple'} /> },
    { key: 'status', label: 'Status', render: (row) => <Badge label={row.status} color={row.status === 'active' ? 'green' : 'gray'} /> },
    { key: 'members', label: 'Members', render: (row) => row.members?.length || 0 },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/organizations')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Back to Organizations
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
              <Badge label={PLAN_LABELS[org.plan] || org.plan} color={PLAN_COLORS[org.plan] || 'gray'} />
              <Badge label={org.isLocked ? 'Locked' : 'Active'} color={org.isLocked ? 'red' : 'green'} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Owner: {org.owner?.name} ({org.owner?.email}) &middot; Created {formatDate(org.createdAt)}
            </p>
            {org.isLocked && org.lockedReason && (
              <p className="text-sm text-red-600 mt-1">Locked: {org.lockedReason}</p>
            )}
          </div>
          <div>
            {org.isLocked ? (
              <button onClick={handleUnlock} disabled={actionLoading} className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50">
                Unlock
              </button>
            ) : (
              <button onClick={() => setLockModal(true)} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100">
                Lock
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{members.length}</p>
            <p className="text-xs text-gray-500">Members</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{projects.length}</p>
            <p className="text-xs text-gray-500">Projects</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{pinStats.total}</p>
            <p className="text-xs text-gray-500">Total Pins</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{pinStats.resolved}</p>
            <p className="text-xs text-gray-500">Resolved</p>
          </div>
        </div>

        {org.subscription?.status && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Subscription: <Badge label={org.subscription.status} color={org.subscription.status === 'active' ? 'green' : 'red'} />
              {org.subscription.currentPeriodEnd && <span className="ml-2">Period ends: {formatDate(org.subscription.currentPeriodEnd)}</span>}
            </p>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Members ({members.length})</h2>
        <DataTable columns={memberColumns} data={members} emptyMessage="No members" />
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Projects ({projects.length})</h2>
        <DataTable columns={projectColumns} data={projects} emptyMessage="No projects" />
      </div>

      {/* Lock Modal */}
      <Modal isOpen={lockModal} onClose={() => setLockModal(false)} title="Lock Organization">
        <p className="text-sm text-gray-600 mb-3">This will prevent all members from creating or modifying content.</p>
        <textarea
          value={lockReason}
          onChange={(e) => setLockReason(e.target.value)}
          placeholder="Reason for locking (optional)"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={() => setLockModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={handleLock} disabled={actionLoading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {actionLoading ? 'Locking...' : 'Lock Organization'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
