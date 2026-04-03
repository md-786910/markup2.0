import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsersApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import SearchInput from '../components/common/SearchInput';
import FilterDropdown from '../components/common/FilterDropdown';
import Badge from '../components/common/Badge';
import { formatDate, timeAgo, formatLocation } from '../utils/formatters';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (role) params.role = role;
      const { data } = await getUsersApi(params);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {}
    setLoading(false);
  }, [page, search, role]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const roleColors = { owner: 'purple', admin: 'blue', member: 'gray', guest: 'yellow' };

  const columns = [
    { key: 'name', label: 'Name', render: (row) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
          {row.name?.charAt(0)?.toUpperCase()}
        </div>
        <span className="font-medium text-gray-900">{row.name}</span>
      </div>
    )},
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (row) => <Badge label={row.role} color={roleColors[row.role] || 'gray'} /> },
    { key: 'org', label: 'Organization', render: (row) => row.organization?.name || '—' },
    { key: 'lastSeen', label: 'Last Seen', render: (row) => timeAgo(row.lastSeen) },
    { key: 'location', label: 'Location', render: (row) => formatLocation(row.lastLoginLocation) },
    { key: 'createdAt', label: 'Joined', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search users..." />
          </div>
          <FilterDropdown
            value={role}
            onChange={(v) => { setRole(v); setPage(1); }}
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
          emptyMessage="No users found"
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
