import React, { useEffect, useState } from 'react';

// Site-wide notice from the admin panel (maintenance, incidents), on every page
// of the app and the review pages. A closed notice stays closed until it changes.
const API = process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api';
const DISMISSED_KEY = 'kommently.notice.dismissed';
const TONES = {
  info: 'bg-blue-600 text-white',
  warning: 'bg-amber-500 text-gray-900',
  critical: 'bg-red-600 text-white',
};
const REFRESH_MS = 5 * 60 * 1000;

const readDismissed = () => { try { return localStorage.getItem(DISMISSED_KEY); } catch { return null; } };

export default function SiteNoticeBanner() {
  const [notice, setNotice] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let stop = false;
    const load = () => fetch(`${API}/site-notice`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!stop) setNotice(data?.notice || null); })
      .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { stop = true; clearInterval(timer); };
  }, []);

  if (!notice) return null;
  const id = String(notice.updatedAt || notice.message);
  if (notice.dismissible && dismissed === id) return null;
  const close = () => {
    try { localStorage.setItem(DISMISSED_KEY, id); } catch { /* still hide it for now */ }
    setDismissed(id);
  };

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <div className={`pointer-events-auto flex max-w-2xl items-start gap-3 rounded-xl px-4 py-2.5 text-sm shadow-lg ${TONES[notice.level] || TONES.info}`}>
        <p className="min-w-0 flex-1">
          {notice.message}
          {notice.link && (
            <a href={notice.link} target={notice.link.startsWith('/') ? undefined : '_blank'} rel="noreferrer" className="ml-2 font-semibold underline underline-offset-2">
              {notice.linkText || 'Learn more'}
            </a>
          )}
        </p>
        {notice.dismissible && (
          <button type="button" onClick={close} aria-label="Close notice" className="-mr-1 shrink-0 rounded p-0.5 opacity-80 hover:opacity-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
