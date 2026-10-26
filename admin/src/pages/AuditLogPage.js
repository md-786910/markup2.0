import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAuditLogApi } from '../services/adminService';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Avatar, Card, EmptyState, PageHeader } from '../components/common/ui';
import { PlanBadge } from '../components/common/StatusBadge';
import { formatDateTime, timeAgo } from '../utils/formatters';
import { describeAction } from '../utils/actions';

const PAGE_SIZE = 30;

export default function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAuditLogApi({ page, limit: PAGE_SIZE })
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Action log"
        description="Every change an admin made to a customer: plans, trials, limits, locks and refunds."
      />
      <Card padded={false}>
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : !data?.entries.length ? (
          <EmptyState title="No admin actions yet" description="When an admin changes a plan, extends a trial, sets limits, locks an organization or issues a refund, it's recorded here." />
        ) : (
          <>
            <ol className="divide-y divide-gray-100">
              {data.entries.map((a) => (
                <li key={a._id} className="flex items-start gap-3 px-5 py-3.5">
                  <Avatar name={a.actor?.name || 'Admin'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{a.actor?.name || 'Admin'}</span> {describeAction(a)}
                    </p>
                    {a.organization && (
                      <Link to={`/organizations/${a.organization._id}`} className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-700">
                        {a.organization.name}
                        <PlanBadge plan={a.organization.plan} />
                      </Link>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400" title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ol>
            <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={PAGE_SIZE} onPageChange={(p) => setParams(p > 1 ? { page: String(p) } : {})} />
          </>
        )}
      </Card>
    </div>
  );
}
