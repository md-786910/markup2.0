import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSupportTicketsApi, getSupportStatsApi } from '../services/adminService';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import SearchInput from '../components/common/SearchInput';
import FilterDropdown from '../components/common/FilterDropdown';
import { Avatar, PageHeader, Tabs } from '../components/common/ui';
import { PlanBadge } from '../components/common/StatusBadge';
import { timeAgo } from '../utils/formatters';
import { PriorityPill, TicketStatusPill, dueLabel } from '../components/support/supportBadges';

const PAGE_SIZE = 25;

export default function SupportInboxPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'open';
  const priority = params.get('priority');
  const assignee = params.get('assignee');
  const overdue = params.get('overdue');
  const search = params.get('search') || '';
  const page = Number(params.get('page')) || 1;

  const [data, setData] = useState({ tickets: [], total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
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
    const q = { view, page, limit: PAGE_SIZE };
    if (priority) q.priority = priority;
    if (assignee) q.assignee = assignee;
    if (overdue) q.overdue = overdue;
    if (search) q.search = search;
    getSupportTicketsApi(q)
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    getSupportStatsApi().then(({ data: s }) => { if (!cancelled) setStats(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [view, priority, assignee, overdue, search, page]);

  const columns = [
    {
      key: 'subject',
      label: 'Request',
      render: (row) => (
        <div className="min-w-[240px]">
          <p className="truncate font-medium text-gray-900">{row.subject}</p>
          <p className="truncate text-xs text-gray-500">#{row.number} · {row.requester?.name || 'Deleted user'} · {timeAgo(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'org',
      label: 'Organization',
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="max-w-[160px] truncate">{row.organization?.name || '—'}</span>
          {row.organization?.plan && <PlanBadge plan={row.organization.plan} />}
        </span>
      ),
    },
    { key: 'priority', label: 'Priority', render: (row) => <PriorityPill priority={row.priority} /> },
    { key: 'status', label: 'Status', render: (row) => <TicketStatusPill status={row.status} /> },
    {
      key: 'due',
      label: view === 'resolved' ? 'Resolved' : 'First reply',
      render: (row) => {
        if (view === 'resolved') return <span className="whitespace-nowrap text-gray-500">{timeAgo(row.updatedAt)}</span>;
        const due = dueLabel(row);
        return <span className={`whitespace-nowrap ${due.tone}`}>{due.text}</span>;
      },
    },
    {
      key: 'assignee',
      label: 'Assignee',
      render: (row) => row.assignee ? (
        <span className="flex items-center gap-2"><Avatar name={row.assignee.name} size="sm" /><span className="truncate">{row.assignee.name}</span></span>
      ) : <span className="text-gray-400">Unassigned</span>,
    },
  ];

  const tabs = [
    { id: 'open', label: 'Open', count: stats?.open },
    { id: 'waiting', label: 'Waiting on customer', count: stats?.waiting },
    { id: 'resolved', label: 'Resolved' },
    { id: 'all', label: 'All' },
  ];
  const hasFilters = Boolean(priority || assignee || overdue || search);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Support"
        description={stats ? `${stats.open} open · ${stats.overdue} past the first-reply target · ${stats.mine} assigned to you` : 'Requests from customers in the app'}
      />

      <Tabs tabs={tabs} active={view} onChange={(v) => setParams(v === 'open' ? {} : { view: v })} />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
          <div className="min-w-[220px] flex-1">
            <SearchInput value={search} onChange={(v) => setParam('search', v)} placeholder="Search subject, #number or organization" />
          </div>
          <FilterDropdown value={priority} onChange={(v) => setParam('priority', v)} placeholder="Any priority" options={[{ value: 'urgent', label: 'Urgent' }, { value: 'high', label: 'High' }, { value: 'normal', label: 'Normal' }]} />
          <FilterDropdown value={assignee} onChange={(v) => setParam('assignee', v)} placeholder="Anyone" label="Assignee" options={[{ value: 'me', label: 'Assigned to me' }, { value: 'none', label: 'Unassigned' }]} />
          <label className="flex items-center gap-2 px-1 text-sm text-gray-700">
            <input type="checkbox" checked={overdue === '1'} onChange={(e) => setParam('overdue', e.target.checked ? '1' : null)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" />
            Overdue only
          </label>
        </div>
        <DataTable
          columns={columns}
          data={data.tickets}
          loading={loading}
          onRowClick={(row) => navigate(`/support/${row._id}`)}
          emptyMessage={hasFilters ? 'No requests match these filters' : view === 'open' ? 'No open requests. Nice.' : 'No requests here'}
        />
        <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={PAGE_SIZE} onPageChange={(p) => setParam('page', p > 1 ? String(p) : null)} />
      </div>
      {stats?.overdue > 0 && view === 'open' && !overdue && (
        <p className="mt-3 text-sm text-red-600">
          {stats.overdue} {stats.overdue === 1 ? 'request is' : 'requests are'} past the first-reply target. <button type="button" onClick={() => setParam('overdue', '1')} className="font-medium underline">Show them</button>
        </p>
      )}
      <p className="mt-3 text-xs text-gray-400">First-reply targets come from each plan: Starter 48 h, Pro and trial 24 h, Enterprise 8 h.</p>
    </div>
  );
}
