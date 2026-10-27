import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupportTicketApi, replySupportTicketApi, updateSupportTicketApi } from '../services/adminService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Avatar, Button, Card, DefinitionList, PageHeader, inputClass } from '../components/common/ui';
import { PlanBadge } from '../components/common/StatusBadge';
import { CATEGORY_LABELS, PriorityPill, TicketStatusPill, dueLabel } from '../components/support/supportBadges';
import { formatDateTime, timeAgo } from '../utils/formatters';
import { toast, toastError } from '../utils/toast';

const SERVER_URL = (process.env.REACT_APP_SERVER_URL || 'http://localhost:5000').replace(/\/+$/, '');

function Message({ m }) {
  const fromCustomer = m.authorType === 'customer';
  const tone = m.internal ? 'border-amber-200 bg-amber-50' : fromCustomer ? 'border-gray-200 bg-white' : 'border-blue-100 bg-blue-50/60';
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <Avatar name={m.authorName || '?'} size="sm" />
        <span className="font-medium text-gray-900">{m.authorName}</span>
        {!fromCustomer && <span className="text-xs text-gray-500">{m.internal ? 'Internal note' : 'Kommently'}</span>}
        <span className="ml-auto text-xs text-gray-400" title={formatDateTime(m.createdAt)}>{timeAgo(m.createdAt)}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{m.body}</p>
      {m.attachments?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.attachments.map((a) => (
            <a key={a.filename} href={`${SERVER_URL}/${a.path}`} target="_blank" rel="noreferrer" className="max-w-[220px] truncate rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-blue-700 hover:underline">
              {a.originalName || 'Attachment'}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupportTicketPage() {
  const { ticketId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data: d } = await getSupportTicketApi(ticketId);
      setData(d);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [ticketId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [data?.ticket?.messages?.length]);

  const send = async (status) => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await replySupportTicketApi(ticketId, { body: body.trim(), internal, ...(status && !internal ? { status } : {}) });
      setBody('');
      toast.success(internal ? 'Note added.' : status === 'resolved' ? 'Reply sent and request resolved.' : 'Reply sent to the customer.');
      await load();
    } catch (err) {
      toastError(err, 'Could not send.');
    }
    setBusy(false);
  };

  const update = async (patch, message) => {
    try {
      await updateSupportTicketApi(ticketId, patch);
      if (message) toast.success(message);
      await load();
    } catch (err) {
      toastError(err, 'Could not update the request.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!data) return <p className="py-10 text-center text-gray-500">Request not found.</p>;

  const { ticket: t, customer, admins } = data;
  const org = t.organization;
  const due = dueLabel(t);
  const isOpen = ['open', 'waiting_on_customer'].includes(t.status);

  return (
    <div className="animate-fade-in">
      <PageHeader
        back={{ to: '/support', label: 'Support' }}
        title={t.subject}
        actions={isOpen
          ? <Button onClick={() => update({ status: 'resolved' }, 'Request resolved. The customer was told by email.')}>Mark resolved</Button>
          : <Button onClick={() => update({ status: 'open' }, 'Request reopened.')}>Reopen</Button>}
      >
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>#{t.number}</span>
          <TicketStatusPill status={t.status} />
          <PriorityPill priority={t.priority} />
          <span>{CATEGORY_LABELS[t.category] || t.category}</span>
          <span>· opened {timeAgo(t.createdAt)}</span>
          {isOpen && <span className={due.tone}>· {due.text}</span>}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {t.messages.map((m) => <Message key={m._id} m={m} />)}
          <div ref={endRef} />

          <Card padded>
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
              {[[false, 'Reply to customer'], [true, 'Internal note']].map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setInternal(value)}
                  className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${internal === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={10000}
              placeholder={internal ? 'Only admins see this.' : `Write to ${t.requester?.name?.split(' ')[0] || 'the customer'}. They get it in the app and by email.`}
              className={`${inputClass} h-auto py-2 ${internal ? 'border-amber-200 bg-amber-50/40' : ''}`}
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {internal ? (
                <Button variant="primary" disabled={busy || !body.trim()} onClick={() => send()}>{busy ? 'Saving…' : 'Add note'}</Button>
              ) : (
                <>
                  <Button disabled={busy || !body.trim()} onClick={() => send('resolved')}>Send and resolve</Button>
                  <Button variant="primary" disabled={busy || !body.trim()} onClick={() => send()}>{busy ? 'Sending…' : 'Send reply'}</Button>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Request">
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block text-gray-500">Assignee</span>
                <select value={t.assignee?._id || ''} onChange={(e) => update({ assignee: e.target.value || null })} className={inputClass}>
                  <option value="">Unassigned</option>
                  {admins.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-gray-500">Priority</span>
                <select value={t.priority} onChange={(e) => update({ priority: e.target.value })} className={inputClass}>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-gray-500">Status</span>
                <select value={t.status} onChange={(e) => update({ status: e.target.value })} className={inputClass}>
                  <option value="open">Open</option>
                  <option value="waiting_on_customer">Waiting on customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
          </Card>

          <Card title="Customer">
            {org ? (
              <Link to={`/organizations/${org._id}`} className="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                <Avatar name={org.name} square />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{org.name}</span>
                  {org.isLocked && <span className="text-xs font-medium text-red-600">Locked</span>}
                </span>
                <PlanBadge plan={org.plan} />
              </Link>
            ) : <p className="mb-3 text-sm text-gray-500">Organization deleted.</p>}
            <DefinitionList
              items={[
                ['From', t.requester ? <Link to={`/users/${t.requester._id}`} className="hover:text-blue-700">{t.requester.name}</Link> : '—'],
                ['Email', t.requester?.email],
                ['Role', t.requester?.role],
                ['Last active', timeAgo(customer.lastActiveAt)],
                ['Members', customer.members],
                ['Open pins', customer.openPins],
              ]}
            />
          </Card>

          <Card title="Context">
            <DefinitionList
              items={[
                t.context?.url && ['Page', <span className="break-all text-xs">{t.context.url}</span>],
                t.context?.project && ['Project', t.context.project.name],
                ['Plan then', t.context?.plan || '—'],
                t.context?.viewport && ['Window', t.context.viewport],
                t.context?.userAgent && ['Browser', <span className="text-xs">{t.context.userAgent.slice(0, 80)}</span>],
              ]}
            />
          </Card>

          {customer.otherTickets?.length > 0 && (
            <Card title="Earlier requests" padded={false}>
              <ul className="divide-y divide-gray-100">
                {customer.otherTickets.map((o) => (
                  <li key={o._id}>
                    <Link to={`/support/${o._id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-gray-50">
                      <span className="min-w-0 truncate">#{o.number} {o.subject}</span>
                      <TicketStatusPill status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
