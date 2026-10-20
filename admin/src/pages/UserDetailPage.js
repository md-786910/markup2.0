import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserDetailApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatLocation } from '../utils/formatters';

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserDetailApi(id)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!data) return <p className="text-gray-500 py-10 text-center">User not found.</p>;

  const { user, projects } = data;
  const roleColors = { owner: 'purple', admin: 'blue', member: 'gray', guest: 'yellow' };

  const projectColumns = [
    { key: 'name', label: 'Project', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'url', label: 'URL', render: (row) => row.websiteUrl ? (
      <a href={row.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline text-xs max-w-[200px] truncate block">
        {row.websiteUrl.replace(/^https?:\/\//, '')}
      </a>
    ) : <span className="text-gray-400 text-xs">—</span> },
    { key: 'org', label: 'Organization', render: (row) => row.organization?.name || '—' },
    { key: 'projectType', label: 'Type', render: (row) => <Badge label={row.projectType} color={row.projectType === 'website' ? 'blue' : 'purple'} /> },
    { key: 'status', label: 'Status', render: (row) => <Badge label={row.status} color={row.status === 'active' ? 'green' : 'gray'} /> },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/users')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Back to Users
      </button>

      {/* User Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <Badge label={user.role} color={roleColors[user.role] || 'gray'} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            <p className="text-sm text-gray-500">
              Organization: {user.organization?.name || 'None'}
              {user.organization?.plan && <> &middot; <Badge label={user.organization.plan} color="blue" /></>}
            </p>
            <p className="text-xs text-gray-400 mt-1">Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>

        {/* Location Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Signup Location</p>
            <p className="text-sm text-gray-900">{formatLocation(user.signupLocation)}</p>
            {user.signupIp && <p className="text-xs text-gray-400 mt-0.5">IP: {user.signupIp}</p>}
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Last Login Location</p>
            <p className="text-sm text-gray-900">{formatLocation(user.lastLoginLocation)}</p>
            {user.lastLoginIp && <p className="text-xs text-gray-400 mt-0.5">IP: {user.lastLoginIp}</p>}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Project Memberships ({projects.length})</h2>
        <DataTable columns={projectColumns} data={projects} emptyMessage="No project memberships" />
      </div>
    </div>
  );
}
