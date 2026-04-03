import React, { useState, useEffect, useCallback } from 'react';
import { getProjectsApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import FilterDropdown from '../components/common/FilterDropdown';
import Badge from '../components/common/Badge';
import { formatDate } from '../utils/formatters';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [type, setType] = useState(null);
  const [projectStatus, setProjectStatus] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status) params.status = status;
      if (type) params.type = type;
      if (projectStatus) params.projectStatus = projectStatus;
      const { data } = await getProjectsApi(params);
      setProjects(data.projects);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {}
    setLoading(false);
  }, [page, status, type, projectStatus]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const statusColors = {
    not_started: 'gray', in_progress: 'blue', in_review: 'yellow', approved: 'green', completed: 'purple',
  };

  const columns = [
    { key: 'name', label: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'url', label: 'URL', render: (row) => row.websiteUrl ? (
      <a href={row.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline text-xs max-w-[200px] truncate block">
        {row.websiteUrl.replace(/^https?:\/\//, '')}
      </a>
    ) : <span className="text-gray-400 text-xs">—</span> },
    { key: 'org', label: 'Organization', render: (row) => row.organization?.name || '—' },
    { key: 'type', label: 'Type', render: (row) => <Badge label={row.projectType} color={row.projectType === 'website' ? 'blue' : 'purple'} /> },
    { key: 'status', label: 'Status', render: (row) => <Badge label={row.status} color={row.status === 'active' ? 'green' : 'gray'} /> },
    { key: 'projectStatus', label: 'Progress', render: (row) => (
      <Badge label={row.projectStatus?.replace(/_/g, ' ')} color={statusColors[row.projectStatus] || 'gray'} />
    )},
    { key: 'pins', label: 'Pins', render: (row) => (
      <span className="text-xs">
        {row.pinStats?.total || 0} <span className="text-gray-400">/ {row.pinStats?.resolved || 0} resolved</span>
      </span>
    )},
    { key: 'members', label: 'Members', render: (row) => row.memberCount || 0 },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
          <FilterDropdown
            value={type}
            onChange={(v) => { setType(v); setPage(1); }}
            placeholder="All types"
            options={[
              { value: 'website', label: 'Website' },
              { value: 'document', label: 'Document' },
            ]}
          />
          <FilterDropdown
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            placeholder="All status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <FilterDropdown
            value={projectStatus}
            onChange={(v) => { setProjectStatus(v); setPage(1); }}
            placeholder="All progress"
            options={[
              { value: 'not_started', label: 'Not Started' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'in_review', label: 'In Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
        </div>

        <DataTable columns={columns} data={projects} loading={loading} emptyMessage="No projects found" />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
