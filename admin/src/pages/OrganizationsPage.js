import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getOrganizationsApi, exportOrganizationsApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import SearchInput from '../components/common/SearchInput';
import FilterDropdown from '../components/common/FilterDropdown';
import { Avatar, Button, PageHeader } from '../components/common/ui';
import { PlanBadge, StatusBadge, STATUS_OPTIONS } from '../components/common/StatusBadge';
import { formatDate, formatUsd, timeAgo } from '../utils/formatters';
import { PLAN_LABELS } from '../config/plans';
import { toastError } from '../utils/toast';

const PAGE_SIZE = 20;
const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'trial_end', label: 'Trial ends soonest' },
];

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const plan = params.get('plan');
  const status = params.get('status');
  const sort = params.get('sort');
  const page = Number(params.get('page')) || 1;

  const [orgs, setOrgs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters live in the URL so links from the overview land on a filtered list
  const setParam = (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  const query = useCallback(() => {
    const q = {};
    if (search) q.search = search;
    if (plan) q.plan = plan;
    if (status) q.status = status;
    if (sort) q.sort = sort;
    return q;
  }, [search, plan, status, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOrganizationsApi({ ...query(), page, limit: PAGE_SIZE })
      .then(({ data }) => {
        if (cancelled) return;
        setOrgs(data.organizations);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportOrganizationsApi(query());
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kommently-organizations-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err, 'Could not export the list.');
    }
    setExporting(false);
  };

  const hasFilters = Boolean(search || plan || status);

  const columns = [
    {
      key: 'name',
      label: 'Organization',
      render: (row) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <Avatar name={row.name} square />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{row.name}</p>
            <p className="truncate text-xs text-gray-500">{row.owner?.email || 'No owner'}</p>
          </div>
        </div>
      ),
    },
    { key: 'plan', label: 'Plan', render: (row) => <PlanBadge plan={row.plan} /> },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={row.status} trialEndsAt={row.trialEndsAt} />
          {row.hasUnpaidInvoice && <span className="text-xs font-medium text-red-600">Unpaid invoice</span>}
        </div>
      ),
    },
    {
      key: 'members',
      label: 'Members',
      align: 'right',
      render: (row) => (
        <span title={`${row.activeMembers7d} active in the last 7 days`}>
          {row.memberCount}
          <span className="text-gray-400"> · {row.activeMembers7d} active</span>
        </span>
      ),
    },
    { key: 'projects', label: 'Projects', align: 'right', render: (row) => row.projectCount },
    { key: 'mrr', label: 'MRR', align: 'right', render: (row) => (row.mrr ? formatUsd(row.mrr) : <span className="text-gray-400">—</span>) },
    { key: 'lastActive', label: 'Last active', render: (row) => <span className="whitespace-nowrap">{timeAgo(row.lastActiveAt)}</span> },
    { key: 'createdAt', label: 'Created', render: (row) => <span className="whitespace-nowrap text-gray-500">{formatDate(row.createdAt)}</span> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Organizations"
        description={`${total} ${total === 1 ? 'organization' : 'organizations'}${hasFilters ? ' match these filters' : ''}`}
        actions={
          <Button onClick={handleExport} disabled={exporting || !total}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
          <div className="min-w-[220px] flex-1">
            <SearchInput value={search} onChange={(v) => setParam('search', v)} placeholder="Search by name, owner or email" />
          </div>
          <FilterDropdown
            value={plan}
            onChange={(v) => setParam('plan', v)}
            placeholder="All plans"
            options={Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FilterDropdown
            value={status}
            onChange={(v) => setParam('status', v)}
            placeholder="Any status"
            options={[...STATUS_OPTIONS, { value: 'unpaid', label: 'Unpaid invoice' }]}
          />
          <FilterDropdown value={sort} onChange={(v) => setParam('sort', v)} placeholder="Newest first" label="Sort" options={SORT_OPTIONS} />
          {hasFilters && (
            <Button variant="ghost" onClick={() => setParams({})}>Clear</Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={orgs}
          loading={loading}
          onRowClick={(row) => navigate(`/organizations/${row._id}`)}
          emptyMessage={hasFilters ? 'No organizations match these filters' : 'No organizations yet'}
          emptyDescription={hasFilters ? 'Try another search or clear the filters.' : 'Organizations appear here when people sign up.'}
        />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setParam('page', p > 1 ? String(p) : null)} />
      </div>
    </div>
  );
}
