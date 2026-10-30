import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Button, Card } from '../components/common/ui';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import Pagination from '../components/common/Pagination';
import FilterDropdown from '../components/common/FilterDropdown';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlanBadge, InvoiceStatusBadge } from '../components/common/StatusBadge';
import { getRevenueApi, getInvoicesApi, exportInvoicesApi } from '../services/adminService';
import { formatDate, formatMoney, formatUsd, relativeDays, timeAgo } from '../utils/formatters';
import { toastError } from '../utils/toast';

const PAGE_SIZE = 20;

export default function RevenuePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Invoices table state
  const [invoices, setInvoices] = useState([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoicePages, setInvoicePages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getRevenueApi()
      .then(({ data }) => setData(data))
      .catch((err) => toastError(err, 'Could not load revenue summary.'))
      .finally(() => setLoading(false));
  }, []);

  const fetchInvoices = (p = page) => {
    setInvoicesLoading(true);
    const q = { page: p, limit: PAGE_SIZE };
    if (statusFilter) q.status = statusFilter;
    if (currencyFilter) q.currency = currencyFilter;

    getInvoicesApi(q)
      .then(({ data }) => {
        setInvoices(data.invoices || []);
        setInvoiceTotal(data.total || 0);
        setInvoicePages(data.totalPages || 1);
      })
      .catch((err) => toastError(err, 'Could not load invoices.'))
      .finally(() => setInvoicesLoading(false));
  };

  useEffect(() => {
    fetchInvoices(page);
  }, [page, statusFilter, currencyFilter]);

  const handleExportInvoices = async () => {
    setExporting(true);
    try {
      const q = {};
      if (statusFilter) q.status = statusFilter;
      if (currencyFilter) q.currency = currencyFilter;
      const res = await exportInvoicesApi(q);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kommently-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err, 'Could not export invoices CSV.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const renewals = data?.upcomingRenewals || [];
  const unpaid = data?.unpaidInvoices || [];
  const cancellations = data?.scheduledCancellations || [];
  const payments = data?.recentPayments || [];
  const refunds = data?.recentRefunds || [];

  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice',
      render: (row) => (
        <span className="font-mono text-xs font-medium text-gray-900">
          {row.invoiceNumber || '—'}
        </span>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (row) => (
        <div>
          <Link
            to={`/organizations/${row.organization?._id}`}
            className="font-medium text-gray-900 hover:text-blue-600"
          >
            {row.organization?.name || '—'}
          </Link>
          {row.buyer?.name && (
            <p className="text-xs text-gray-500">{row.buyer.name}</p>
          )}
        </div>
      ),
    },
    { key: 'plan', label: 'Plan', render: (row) => <PlanBadge plan={row.plan} /> },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-gray-900">
          {formatMoney(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => <span className="text-xs text-gray-600">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'paidAt',
      label: 'Paid / Due',
      render: (row) => (
        <span className="text-xs text-gray-500">
          {row.paidAt ? formatDate(row.paidAt) : row.dueAt ? relativeDays(row.dueAt) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Revenue & Subscriptions"
        description="Monthly recurring revenue, upcoming renewals, unpaid invoices, and accounting exports"
        actions={
          <Button onClick={handleExportInvoices} disabled={exporting}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? 'Exporting…' : 'Export Invoices CSV'}
          </Button>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="USD Monthly Revenue"
          value={formatUsd(kpis.totalUsdMrr || 0)}
          hint={`${kpis.payingOrgsCount || 0} paying accounts`}
        />
        <StatCard
          label="INR Monthly Revenue"
          value={`₹${(kpis.totalInrMrr || 0).toLocaleString()}`}
          hint="Razorpay domestic subscriptions"
        />
        <StatCard
          label="New MRR (30 days)"
          value={formatUsd(kpis.newMrr30d?.usd || 0)}
          hint={`${kpis.newMrr30d?.count || 0} conversions / upgrades`}
          tone="default"
        />
        <StatCard
          label="Churned MRR (30 days)"
          value={formatUsd(kpis.churnedMrr30d?.usd || 0)}
          hint={`${kpis.churnedMrr30d?.count || 0} cancellations`}
          tone={kpis.churnedMrr30d?.usd > 0 ? 'warn' : 'default'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Renewals */}
        <Card
          title="Upcoming Renewals (Next 14 Days)"
          description="Subscriptions approaching their monthly anniversary"
          padded={false}
        >
          {renewals.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No renewals scheduled in the next 14 days.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {renewals.map((org) => (
                <Link
                  key={org._id}
                  to={`/organizations/${org._id}?tab=billing`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{org.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      Owner: {org.owner?.email || '—'} · Renews {relativeDays(org.subscription?.currentPeriodEnd)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PlanBadge plan={org.plan} />
                    {org.deal?.price != null && (
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                        Deal: {org.deal.currency === 'INR' ? '₹' : '$'}{org.deal.price}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Unpaid & Overdue Invoices */}
        <Card
          title="Unpaid & Failed Invoices"
          description="Invoices awaiting collection or grace period enforcement"
          padded={false}
        >
          {unpaid.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">All invoices are settled.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {unpaid.map((inv) => (
                <Link
                  key={inv._id}
                  to={`/organizations/${inv.organization?._id}?tab=billing`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{inv.organization?.name || 'Organization'}</p>
                    <p className="truncate text-xs text-gray-500">
                      Due {inv.dueAt ? relativeDays(inv.dueAt) : 'soon'} · {inv.provider || 'Gateway'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-gray-900">{formatMoney(inv.amount, inv.currency)}</span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions & Refunds */}
        <Card
          title="Recent Transactions & Refunds"
          description="Latest payments processed and refunded"
          padded={false}
        >
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {refunds.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between px-5 py-3 text-xs">
                <div>
                  <span className="font-medium text-gray-900">{inv.organization?.name || 'Organization'}</span>
                  <p className="text-gray-400">Refunded {timeAgo(inv.refundedAt || inv.updatedAt)}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-red-600">-{formatMoney(inv.refundAmount || inv.amount, inv.currency)}</span>
                  <InvoiceStatusBadge status="refunded" />
                </div>
              </div>
            ))}
            {payments.slice(0, 10).map((inv) => (
              <div key={inv._id} className="flex items-center justify-between px-5 py-3 text-xs">
                <div>
                  <span className="font-medium text-gray-900">{inv.organization?.name || 'Organization'}</span>
                  <p className="text-gray-400">Paid {timeAgo(inv.paidAt || inv.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-emerald-600">+{formatMoney(inv.amount, inv.currency)}</span>
                  <p className="font-mono text-[10px] text-gray-400">{inv.invoiceNumber}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Scheduled Cancellations */}
        <Card
          title="Scheduled Cancellations"
          description="Organizations downgrading at end of active period"
          padded={false}
        >
          {cancellations.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No cancellations pending period end.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {cancellations.map((org) => (
                <Link
                  key={org._id}
                  to={`/organizations/${org._id}?tab=billing`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{org.name}</p>
                    <p className="truncate text-xs text-amber-600">
                      Ends {formatDate(org.subscription?.currentPeriodEnd)} ({relativeDays(org.subscription?.currentPeriodEnd)})
                    </p>
                  </div>
                  <PlanBadge plan={org.plan} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Invoice Records Table & Filtering */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <div>
            <h3 className="font-medium text-gray-900">All Tax Invoices</h3>
            <p className="text-xs text-gray-500">{invoiceTotal} invoice records</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              placeholder="All statuses"
              options={[
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
                { value: 'void', label: 'Void' },
              ]}
            />
            <FilterDropdown
              value={currencyFilter}
              onChange={(v) => { setCurrencyFilter(v); setPage(1); }}
              placeholder="All currencies"
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'INR', label: 'INR (₹)' },
              ]}
            />
            {(statusFilter || currencyFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatusFilter(''); setCurrencyFilter(''); setPage(1); }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={invoiceColumns}
          data={invoices}
          loading={invoicesLoading}
          emptyMessage="No invoices match these filters"
        />

        <Pagination
          page={page}
          totalPages={invoicePages}
          total={invoiceTotal}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

