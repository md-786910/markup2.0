import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProjectsApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import FilterDropdown from '../components/common/FilterDropdown';
import { Button, PageHeader } from '../components/common/ui';
import { PlanBadge, Pill } from '../components/common/StatusBadge';
import { formatDate } from '../utils/formatters';

const PAGE_SIZE = 20;
const PROGRESS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  in_review: 'In review',
  approved: 'Approved',
  completed: 'Completed',
};

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type');
  const status = params.get('status');
  const projectStatus = params.get('progress');
  const page = Number(params.get('page')) || 1;

  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const setParam = (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = { page, limit: PAGE_SIZE };
    if (status) q.status = status;
    if (type) q.type = type;
    if (projectStatus) q.projectStatus = projectStatus;
    getProjectsApi(q)
      .then(({ data }) => {
        if (cancelled) return;
        setProjects(data.projects);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, status, type, projectStatus]);

  const columns = [
    {
      key: 'name',
      label: 'Project',
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.websiteUrl ? (
            <a href={row.websiteUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[240px] truncate text-xs text-gray-500 hover:text-blue-700">
              {row.websiteUrl.replace(/^https?:\/\//, '')}
            </a>
          ) : <p className="text-xs text-gray-500">Document</p>}
        </div>
      ),
    },
    {
      key: 'org',
      label: 'Organization',
      render: (row) => row.organization ? (
        <Link to={`/organizations/${row.organization._id}`} className="flex items-center gap-2 hover:text-blue-700">
          <span className="max-w-[160px] truncate">{row.organization.name}</span>
          <PlanBadge plan={row.organization.plan} />
        </Link>
      ) : '—',
    },
    { key: 'status', label: 'Status', render: (row) => <Pill tone={row.status === 'active' ? 'green' : 'gray'}>{row.status === 'active' ? 'Active' : 'Archived'}</Pill> },
    { key: 'progress', label: 'Progress', render: (row) => PROGRESS[row.projectStatus] || '—' },
    {
      key: 'pins',
      label: 'Pins',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap">
          {row.pinStats?.total || 0}
          <span className="text-gray-400"> · {row.pinStats?.resolved || 0} resolved</span>
        </span>
      ),
    },
    { key: 'members', label: 'Members', align: 'right', render: (row) => row.memberCount || 0 },
    { key: 'createdAt', label: 'Created', render: (row) => <span className="whitespace-nowrap text-gray-500">{formatDate(row.createdAt)}</span> },
  ];

  const hasFilters = Boolean(type || status || projectStatus);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Projects" description={`${total} ${total === 1 ? 'project' : 'projects'} across all organizations`} />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
          <FilterDropdown value={type} onChange={(v) => setParam('type', v)} placeholder="All types" options={[{ value: 'website', label: 'Website' }, { value: 'document', label: 'Document' }]} />
          <FilterDropdown value={status} onChange={(v) => setParam('status', v)} placeholder="Active and archived" options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]} />
          <FilterDropdown value={projectStatus} onChange={(v) => setParam('progress', v)} placeholder="Any progress" options={Object.entries(PROGRESS).map(([value, label]) => ({ value, label }))} />
          {hasFilters && <Button variant="ghost" onClick={() => setParams({})}>Clear</Button>}
        </div>
        <DataTable columns={columns} data={projects} loading={loading} emptyMessage={hasFilters ? 'No projects match these filters' : 'No projects yet'} />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setParam('page', p > 1 ? String(p) : null)} />
      </div>
    </div>
  );
}
