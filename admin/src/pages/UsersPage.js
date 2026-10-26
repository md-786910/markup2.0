import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getUsersApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import SearchInput from '../components/common/SearchInput';
import FilterDropdown from '../components/common/FilterDropdown';
import { Avatar, PageHeader } from '../components/common/ui';
import { PlanBadge, RoleBadge } from '../components/common/StatusBadge';
import { formatDate, timeAgo, formatLocation } from '../utils/formatters';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const role = params.get('role');
  const page = Number(params.get('page')) || 1;

  const [users, setUsers] = useState([]);
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
    if (search) q.search = search;
    if (role) q.role = role;
    getUsersApi(q)
      .then(({ data }) => {
        if (cancelled) return;
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, role]);

  const columns = [
    {
      key: 'name',
      label: 'Person',
      render: (row) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{row.name}</p>
            <p className="truncate text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'org',
      label: 'Organization',
      render: (row) => row.organization ? (
        <span className="flex items-center gap-2">
          <span className="max-w-[180px] truncate">{row.organization.name}</span>
          <PlanBadge plan={row.organization.plan} />
        </span>
      ) : <span className="text-gray-400">—</span>,
    },
    { key: 'role', label: 'Role', render: (row) => <RoleBadge role={row.role} /> },
    { key: 'lastSeen', label: 'Last active', render: (row) => <span className="whitespace-nowrap">{timeAgo(row.lastSeen)}</span> },
    { key: 'location', label: 'Location', render: (row) => formatLocation(row.lastLoginLocation) },
    { key: 'createdAt', label: 'Joined', render: (row) => <span className="whitespace-nowrap text-gray-500">{formatDate(row.createdAt)}</span> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="People" description={`${total} ${total === 1 ? 'person' : 'people'} across all organizations`} />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
          <div className="min-w-[220px] flex-1">
            <SearchInput value={search} onChange={(v) => setParam('search', v)} placeholder="Search by name or email" />
          </div>
          <FilterDropdown
            value={role}
            onChange={(v) => setParam('role', v)}
            placeholder="All roles"
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'admin', label: 'Admin' },
              { value: 'member', label: 'Member' },
              { value: 'guest', label: 'Guest' },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          onRowClick={(row) => navigate(`/users/${row._id}`)}
          emptyMessage={search || role ? 'Nobody matches these filters' : 'Nobody has signed up yet'}
        />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={(p) => setParam('page', p > 1 ? String(p) : null)} />
      </div>
    </div>
  );
}
