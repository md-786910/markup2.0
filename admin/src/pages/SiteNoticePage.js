import React, { useEffect, useState } from 'react';
import { getSiteNoticeApi, updateSiteNoticeApi } from '../services/adminService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Button, Card, Field, PageHeader, inputClass } from '../components/common/ui';
import { toast, toastError } from '../utils/toast';

// Same colours as the banner in the app (client SiteNoticeBanner)
const LEVELS = [
  ['info', 'Information', 'bg-blue-600 text-white'],
  ['warning', 'Warning', 'bg-amber-500 text-gray-900'],
  ['critical', 'Critical', 'bg-red-600 text-white'],
];

// "YYYY-MM-DDTHH:mm" in local time for a datetime-local input (read back as local)
const toLocalInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function SiteNoticePage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteNoticeApi()
      .then(({ data }) => {
        const n = data.notice || {};
        setForm({
          enabled: !!n.enabled,
          message: n.message || '',
          level: n.level || 'info',
          dismissible: n.dismissible !== false,
          link: n.link || '',
          linkText: n.linkText || '',
          startsAt: toLocalInput(n.startsAt),
          expiresAt: toLocalInput(n.expiresAt),
        });
      })
      .catch((err) => toastError(err, 'Could not load the notice.'));
  }, []);

  if (!form) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      await updateSiteNoticeApi({
        ...form,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      });
      toast.success(form.enabled ? 'The notice is saved and shown in the app.' : 'Saved. The notice is off.');
    } catch (err) {
      toastError(err, 'Could not save the notice.');
    }
    setSaving(false);
  };

  const tone = LEVELS.find(([value]) => value === form.level)?.[2] || LEVELS[0][2];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Site notice"
        description="A bar at the bottom of every page of the app, the sign-in pages and the client review pages, e.g. planned maintenance or an incident."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Notice" className="lg:col-span-2">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input type="checkbox" checked={form.enabled} onChange={set('enabled')} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              Show the notice
            </label>
            <Field label="Message" hint="Up to 500 characters, plain text.">
              <textarea value={form.message} onChange={set('message')} rows={3} maxLength={500} className={`${inputClass} h-auto py-2`} placeholder="e.g. Kommently is down for maintenance on Sunday 02:00–03:00 UTC." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <select value={form.level} onChange={set('level')} className={inputClass}>
                  {LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 pt-7 text-sm text-gray-700">
                <input type="checkbox" checked={form.dismissible} onChange={set('dismissible')} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                People can close it
              </label>
              <Field label="Link (optional)" hint="https://… or a path in the app, like /settings">
                <input value={form.link} onChange={set('link')} maxLength={300} className={inputClass} placeholder="https://status.kommently.app" />
              </Field>
              <Field label="Link text">
                <input value={form.linkText} onChange={set('linkText')} maxLength={60} className={inputClass} placeholder="Status page" />
              </Field>
              <Field label="Show from (optional)" hint="Your local time">
                <input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} className={inputClass} />
              </Field>
              <Field label="Show until (optional)" hint="Your local time">
                <input type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} className={inputClass} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={save} disabled={saving || (form.enabled && !form.message.trim())}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </Card>
        <Card title="Preview">
          {form.message.trim() ? (
            <div className={`rounded-xl px-4 py-2.5 text-sm shadow-lg ${tone}`}>
              {form.message}
              {form.link && <span className="ml-2 font-semibold underline">{form.linkText || 'Learn more'}</span>}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Write a message to see the banner.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
