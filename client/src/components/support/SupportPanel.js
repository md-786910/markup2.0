import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useEscape from '../../hooks/useEscape';
import {
  getSupportTicketsApi,
  createSupportTicketApi,
  getSupportTicketApi,
  replySupportTicketApi,
  resolveSupportTicketApi,
} from '../../services/supportService';
import { chatAvailable, openChat } from '../../utils/supportChat';
import { OPEN_SUPPORT_EVENT, SUPPORT_EMAIL } from '../../utils/supportPanel';
import { fileUrl } from '../../utils/uploadUrl';
import { toast, toastError } from '../../utils/toast';

const SITE_URL = process.env.REACT_APP_SITE_URL || 'https://kommently.app';

const CATEGORIES = [
  ['question', 'Question'],
  ['bug', 'Something is broken'],
  ['billing', 'Billing'],
  ['feature', 'Feature idea'],
  ['account', 'Account'],
];

const STATUS = {
  open: ['bg-blue-50 text-blue-700', 'Open'],
  waiting_on_customer: ['bg-amber-50 text-amber-700', 'Reply from support'],
  resolved: ['bg-emerald-50 text-emerald-700', 'Resolved'],
  closed: ['bg-gray-100 text-gray-600', 'Closed'],
};

const MAX_FILES = 3;
const MAX_FILE_MB = 5;

function StatusPill({ status }) {
  const [tone, label] = STATUS[status] || STATUS.open;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

function timeAgo(date) {
  const min = Math.floor((Date.now() - new Date(date)) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

// What the plan includes, in one line
function planLine(support) {
  if (!support?.tickets) return null;
  if (support.replyHours <= 8) return 'Your plan includes priority support. We reply the same business day.';
  if (support.replyHours <= 24) return 'Your plan includes priority support. We reply within 1 business day.';
  return 'Your plan includes in-app support. We reply within 2 business days.';
}

// Files picked for a request or reply: images and PDFs, 3 at most, 5 MB each
function FilePicker({ files, setFiles }) {
  const inputRef = useRef(null);
  const add = (list) => {
    const next = [...files];
    for (const f of list) {
      if (next.length >= MAX_FILES) { toast.error(`Attach up to ${MAX_FILES} files.`); break; }
      if (!/^image\/|^application\/pdf$/.test(f.type)) { toast.error(`${f.name}: attach images or PDFs.`); continue; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`${f.name} is larger than ${MAX_FILE_MB} MB.`); continue; }
      next.push(f);
    }
    setFiles(next);
  };
  return (
    <div>
      <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { add([...e.target.files]); e.target.value = ''; }} />
      <div className="flex flex-wrap items-center gap-2">
        {files.map((f, i) => (
          <span key={`${f.name}-${i}`} className="inline-flex max-w-[200px] items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
            <span className="truncate">{f.name}</span>
            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-700" aria-label={`Remove ${f.name}`}>×</button>
          </span>
        ))}
        {files.length < MAX_FILES && (
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
            Attach screenshot or PDF
          </button>
        )}
      </div>
    </div>
  );
}

function HomeView({ support, tickets, loading, onNew, onOpen, onChat }) {
  const unread = tickets.filter((t) => t.unread).length;
  return (
    <div className="space-y-6 p-5">
      {support?.tickets ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{planLine(support)}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onNew} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">New request</button>
            {support.chat && chatAvailable ? (
              <button type="button" onClick={onChat} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Chat with us</button>
            ) : (
              <a href={`mailto:${SUPPORT_EMAIL}`} className="rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Email us</a>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-900">Email us</p>
          <p className="mt-1 text-sm text-gray-600">
            Write to <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-blue-600 hover:text-blue-700">{SUPPORT_EMAIL}</a> and we'll get back to you.
          </p>
          <p className="mt-3 text-xs text-gray-500">In-app requests with reply times start on the Starter plan; Pro adds live chat.</p>
        </div>
      )}

      <a href={`${SITE_URL}/support`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm hover:bg-gray-50">
        <span>
          <span className="block font-medium text-gray-900">Help center</span>
          <span className="block text-gray-500">Quick answers to common questions</span>
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
      </a>

      {support?.tickets && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Your requests</h3>
            {unread > 0 && <span className="rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">{unread} new</span>}
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500">No requests yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {tickets.map((t) => (
                <li key={t._id}>
                  <button type="button" onClick={() => onOpen(t._id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.unread ? 'bg-blue-600' : 'bg-transparent'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{t.subject}</span>
                      <span className="block text-xs text-gray-500">#{t.number} · {timeAgo(t.updatedAt)}{t.requester?.name ? ` · ${t.requester.name}` : ''}</span>
                    </span>
                    <StatusPill status={t.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NewRequestView({ onCreated, onCancel }) {
  const location = useLocation();
  const [category, setCategory] = useState('question');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const form = new FormData();
    form.append('category', category);
    form.append('subject', subject.trim());
    form.append('body', body.trim());
    const projectMatch = location.pathname.match(/^\/project\/([a-f0-9]{24})/);
    form.append('context', JSON.stringify({
      url: window.location.origin + location.pathname,
      project: projectMatch ? projectMatch[1] : null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      appVersion: process.env.REACT_APP_VERSION || '',
    }));
    files.forEach((f) => form.append('attachments', f));
    try {
      const { data } = await createSupportTicketApi(form);
      toast.success(`Request #${data.ticket.number} sent. We'll reply here and by email.`);
      onCreated(data.ticket._id);
    } catch (err) {
      toastError(err, 'Could not send your request.');
      setBusy(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20';
  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">What is it about?</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} bg-white`}>
          {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} required autoFocus placeholder="e.g. Pins don't save on the pricing page" className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Details</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={10000} required placeholder="What were you trying to do, and what happened instead?" className={`${inputCls} resize-y`} />
      </label>
      <FilePicker files={files} setFiles={setFiles} />
      <p className="text-xs text-gray-500">We include the page you're on and your browser, so you don't have to describe them.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={busy || subject.trim().length < 3 || body.trim().length < 10} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </form>
  );
}

function ThreadView({ ticketId, onChanged }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getSupportTicketApi(ticketId);
      setTicket(data.ticket);
      onChanged();
    } catch (err) {
      toastError(err, 'Could not open this request.');
    }
  }, [ticketId, onChanged]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [ticket?.messages?.length]);

  const reply = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const form = new FormData();
    form.append('body', body.trim());
    files.forEach((f) => form.append('attachments', f));
    try {
      const { data } = await replySupportTicketApi(ticketId, form);
      setTicket(data.ticket);
      setBody(''); setFiles([]);
      onChanged();
    } catch (err) {
      toastError(err, 'Could not send your reply.');
    }
    setBusy(false);
  };

  const resolve = async () => {
    try {
      const { data } = await resolveSupportTicketApi(ticketId);
      setTicket(data.ticket);
      toast.success('Marked as resolved. Reply any time to open it again.');
      onChanged();
    } catch (err) {
      toastError(err, 'Could not update the request.');
    }
  };

  if (!ticket) return <p className="p-8 text-center text-sm text-gray-400">Loading…</p>;
  const isOpen = ['open', 'waiting_on_customer'].includes(ticket.status);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-semibold text-gray-900">{ticket.subject}</p>
          <StatusPill status={ticket.status} />
        </div>
        <p className="mt-0.5 text-xs text-gray-500">#{ticket.number} · opened {timeAgo(ticket.createdAt)}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
        {ticket.messages.map((m) => {
          const mine = m.authorType === 'customer';
          return (
            <div key={m._id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md bg-gray-100 text-gray-800'}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.attachments?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.attachments.map((a) => (
                      <a key={a.filename} href={fileUrl(a.path)} target="_blank" rel="noreferrer" className={`max-w-[180px] truncate rounded-md px-2 py-1 text-xs underline ${mine ? 'bg-white/15' : 'bg-white'}`}>
                        {a.originalName || 'Attachment'}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1 text-[11px] text-gray-400">{mine ? (m.authorName === user?.name ? 'You' : m.authorName) : m.authorName} · {timeAgo(m.createdAt)}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={reply} className="space-y-2 border-t border-gray-100 p-4">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={10000} placeholder={isOpen ? 'Write a reply…' : 'Reply to open this request again…'} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilePicker files={files} setFiles={setFiles} />
          <div className="flex items-center gap-2">
            {isOpen && <button type="button" onClick={resolve} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Mark resolved</button>}
            <button type="submit" disabled={busy || !body.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Sending…' : 'Send'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Help & support drawer, mounted once for signed-in users (App.js)
export default function SupportPanel() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('home'); // home | new | thread
  const [ticketId, setTicketId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const support = user?.orgSupport;

  const refresh = useCallback(async () => {
    if (!support?.tickets) return;
    setLoading(true);
    try {
      const { data } = await getSupportTicketsApi();
      setTickets(data.tickets);
    } catch { /* the home view just shows no requests */ }
    setLoading(false);
  }, [support?.tickets]);

  useEffect(() => {
    const onOpen = (e) => {
      const detail = e.detail || {};
      setTicketId(detail.ticketId || null);
      setView(detail.ticketId ? 'thread' : detail.view || 'home');
      setOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, []);

  // Email links land on /dashboard?support=<ticketId>
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('support');
    if (!id || !user) return;
    setTicketId(/^[a-f0-9]{24}$/.test(id) ? id : null);
    setView(/^[a-f0-9]{24}$/.test(id) ? 'thread' : 'home');
    setOpen(true);
    params.delete('support');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.search, location.pathname, navigate, user]);

  useEffect(() => { if (open && view === 'home') refresh(); }, [open, view, refresh]);
  useEscape(() => setOpen(false), open);

  if (!user || !open) return null;

  const title = view === 'new' ? 'New request' : view === 'thread' ? 'Your request' : 'Help & support';
  const startChat = async () => {
    try {
      const ok = await openChat({ email: user.email, name: user.name, data: { organization: user.orgName, plan: user.orgPlan } });
      if (ok) setOpen(false);
    } catch {
      toast.error('Chat is not available right now. Send a request instead.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20" onClick={() => setOpen(false)} />
      <aside role="dialog" aria-label={title} className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[440px] flex-col bg-white shadow-xl animate-slide-in-right">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
          {view !== 'home' && (
            <button type="button" onClick={() => setView('home')} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Back">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
          )}
          <h2 className="flex-1 text-base font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {view === 'home' && (
            <HomeView
              support={support}
              tickets={tickets}
              loading={loading}
              onNew={() => setView('new')}
              onOpen={(id) => { setTicketId(id); setView('thread'); }}
              onChat={startChat}
            />
          )}
          {view === 'new' && support?.tickets && (
            <NewRequestView onCreated={(id) => { setTicketId(id); setView('thread'); }} onCancel={() => setView('home')} />
          )}
          {view === 'thread' && ticketId && <ThreadView ticketId={ticketId} onChanged={refresh} />}
        </div>
      </aside>
    </>
  );
}
