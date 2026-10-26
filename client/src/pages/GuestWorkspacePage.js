import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BrandMark from '../components/common/BrandMark';
import { WorkspaceTile } from '../components/layout/WorkspaceSwitcher';
import { getGuestWorkspaceApi } from '../services/guestService';
import { uploadUrl } from '../utils/uploadUrl';
import SiteThumbnail from '../components/common/SiteThumbnail';

const API_BASE = (process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return url; }
}

// Public page behind a workspace review link: every project in the workspace,
// each opening on the normal guest review page.
export default function GuestWorkspacePage() {
  const { workspaceToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const load = useCallback(async (pwd) => {
    setLoading(true);
    try {
      const res = await getGuestWorkspaceApi(workspaceToken, pwd);
      setData(res.data);
      setNeedsPassword(false);
      setError('');
    } catch (err) {
      const body = err.response?.data || {};
      if (body.requiresPassword) {
        setNeedsPassword(true);
        setPasswordError(body.invalidPassword ? body.message : '');
      } else {
        setError(body.message || 'Could not load this review.');
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (data?.workspace?.name) document.title = `${data.workspace.name} · Review`;
  }, [data]);

  if (loading && !data && !needsPassword) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); if (password) load(password); }}
          className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8"
        >
          <BrandMark className="mx-auto mb-4 h-10 w-10" />
          <h1 className="text-center text-lg font-semibold text-gray-900">Password required</h1>
          <p className="mb-5 mt-1 text-center text-sm text-gray-500">Enter the password you were given to open this review.</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
            placeholder="Password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
          <button type="submit" className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            Open review
          </button>
        </form>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900">This review isn't available</h1>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { workspace, organization, projects } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          {organization.logo ? (
            <img src={uploadUrl(organization.logo)} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <BrandMark className="h-8 w-8" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{organization.name}</p>
            <p className="text-xs text-gray-500">Review</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <WorkspaceTile name={workspace.name} className="h-10 w-10 text-base" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{workspace.name}</h1>
            <p className="text-sm text-gray-500">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} shared with you by {organization.name}
            </p>
          </div>
        </div>

        {workspace.allowComments && projects.length > 0 && (
          <ol className="mt-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 sm:grid-cols-3">
            {['Open a project below', 'Switch to Comment and click the spot you mean', 'Write your note. Add your name once and you\'re done'].map((step, i) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        )}

        {projects.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Nothing to review yet. Check back soon.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p._id}
                to={`/review/${p.shareToken}`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-blue-300"
              >
                <div className="relative h-40 border-b border-gray-100 bg-gray-50">
                  {p.projectType === 'website' ? (
                    <SiteThumbnail
                      src={`${API_BASE}/api/proxy?url=${encodeURIComponent(p.websiteUrl)}&projectId=${p._id}&guest=true`}
                      title={p.name}
                    />
                  ) : p.cover?.mimetype?.startsWith('image/') ? (
                    <img src={`${API_BASE}/${p.cover.path}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-gray-400">
                      <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="max-w-[80%] truncate text-xs font-medium">{p.cover?.name}</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                    {p.projectType === 'document' ? 'Document' : 'Website'}
                  </span>
                  <span>Updated {timeAgo(p.updatedAt)}</span>
                </div>
                <h2 className="mt-3 truncate text-base font-semibold text-gray-900 group-hover:text-blue-700">{p.name}</h2>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {p.projectType === 'document'
                    ? `${p.documentCount} ${p.documentCount === 1 ? 'file' : 'files'}`
                    : hostOf(p.websiteUrl)}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className={p.openPinCount ? 'font-medium text-blue-700' : 'text-gray-400'}>
                    {p.openPinCount ? `${p.openPinCount} open ${p.openPinCount === 1 ? 'comment' : 'comments'}` : 'No open comments'}
                  </span>
                  <span className="font-medium text-blue-600">Open →</span>
                </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
