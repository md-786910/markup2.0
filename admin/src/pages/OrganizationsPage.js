import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizationsApi, lockOrganizationApi, unlockOrganizationApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import SearchInput from '../components/common/SearchInput';
import FilterDropdown from '../components/common/FilterDropdown';
import Badge from '../components/common/Badge';
import { formatDate } from '../utils/formatters';
import { PLAN_COLORS, PLAN_LABELS } from '../config/plans';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (plan) params.plan = plan;
      if (status) params.status = status;
      const { data } = await getOrganizationsApi(params);
      setOrgs(data.organizations);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {}
    setLoading(false);
  }, [page, search, plan, status]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleToggleLock = async (e, org) => {
    e.stopPropagation();
    try {
      if (org.isLocked) {
        await unlockOrganizationApi(org._id);
      } else {
        await lockOrganizationApi(org._id, 'Locked by admin');
      }
      fetchOrgs();
    } catch {}
  };

  const columns = [
    { key: 'name', label: 'Name', render: (row) => (
      <span className="font-medium text-gray-900">{row.name}</span>
    )},
    { key: 'owner', label: 'Owner', render: (row) => row.owner?.name || '—' },
    { key: 'plan', label: 'Plan', render: (row) => (
      <Badge label={PLAN_LABELS[row.plan] || row.plan} color={PLAN_COLORS[row.plan] || 'gray'} />
    )},
    { key: 'memberCount', label: 'Members' },
    { key: 'projectCount', label: 'Projects' },
    { key: 'status', label: 'Status', render: (row) => (
      <Badge label={row.isLocked ? 'Locked' : 'Active'} color={row.isLocked ? 'red' : 'green'} />
    )},
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
    { key: 'actions', label: '', render: (row) => (
      <button
        onClick={(e) => handleToggleLock(e, row)}
        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
          row.isLocked
            ? 'text-green-700 bg-green-50 hover:bg-green-100'
            : 'text-red-700 bg-red-50 hover:bg-red-100'
        }`}
      >
        {row.isLocked ? 'Unlock' : 'Lock'}
      </button>
    )},
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search organizations..." />
          </div>
          <FilterDropdown
            value={plan}
            onChange={(v) => { setPlan(v); setPage(1); }}
            placeholder="All plans"
            options={[
              { value: 'trial', label: 'Trial' },
              { value: 'free', label: 'Free' },
              { value: 'starter', label: 'Starter' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
          <FilterDropdown
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            placeholder="All status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'locked', label: 'Locked' },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          data={orgs}
          loading={loading}
          onRowClick={(row) => navigate(`/organizations/${row._id}`)}
          emptyMessage="No organizations found"
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
