import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  getGuestProjectApi,
  getGuestPinsApi,
  getGuestCommentsApi,
  createGuestPinApi,
  createGuestCommentApi,
} from '../services/guestService';

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id) {
  let hash = 0;
  const str = id || '';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const TABS = [
  { key: 'open', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

export default function GuestProjectPage() {
  const { shareToken } = useParams();
  const [project, setProject] = useState(null);
  const [pins, setPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');

  // Guest identity
  const [guestName, setGuestName] = useState(() => sessionStorage.getItem('guest_name') || '');
  const [guestEmail, setGuestEmail] = useState(() => sessionStorage.getItem('guest_email') || '');
  const [showIdentityForm, setShowIdentityForm] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New state for redesign
  const [filterStatus, setFilterStatus] = useState('open');
  const [detailView, setDetailView] = useState(false);

  // Derived data
  const filteredPins = useMemo(() => {
    if (filterStatus === 'open') return pins.filter((p) => p.status === 'pending');
    if (filterStatus === 'resolved') return pins.filter((p) => p.status === 'resolved');
    return pins;
  }, [pins, filterStatus]);

  const openCount = pins.filter((p) => p.status === 'pending').length;
  const resolvedCount = pins.filter((p) => p.status === 'resolved').length;

  const loadProject = useCallback(async (pwd) => {
    try {
      setLoading(true);
      setError('');
      const res = await getGuestProjectApi(shareToken, pwd);
      setProject(res.data.project);
      setRequiresPassword(false);
    } catch (err) {
      if (err.response?.data?.requiresPassword) {
        setRequiresPassword(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Load pins when project loads
  useEffect(() => {
    if (!project) return;
    getGuestPinsApi(shareToken)
      .then((res) => setPins(res.data.pins))
      .catch(() => {});
  }, [project, shareToken]);

  // Load comments when a pin is selected
  useEffect(() => {
    if (!selectedPin) {
      setComments([]);
      return;
    }
    getGuestCommentsApi(shareToken, selectedPin._id)
      .then((res) => setComments(res.data.comments))
      .catch(() => {});
  }, [selectedPin, shareToken]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    loadProject(password);
  };

  const saveGuestIdentity = () => {
    sessionStorage.setItem('guest_name', guestName);
    sessionStorage.setItem('guest_email', guestEmail);
    setShowIdentityForm(false);
  };

  const handleAddComment = async () => {
    if (!commentBody.trim() || !selectedPin) return;
    if (!guestName || !guestEmail) {
      setShowIdentityForm(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createGuestCommentApi(shareToken, selectedPin._id, {
        guestName,
        guestEmail,
        body: commentBody,
      });
      setComments((prev) => [...prev, res.data.comment]);
      setCommentBody('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinClick = (pin) => {
    setSelectedPin(pin);
    setDetailView(true);
  };

  const handleBackToList = () => {
    setDetailView(false);
    setTimeout(() => setSelectedPin(null), 300);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Password required
  if (requiresPassword) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">Password Required</h2>
          <p className="text-sm text-gray-500 text-center mb-5">Enter the password to access this review.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-3"
            autoFocus
          />
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Access Review
          </button>
        </form>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Unable to Load</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const guestColor = getAvatarColor(guestEmail || guestName);
  const hasIdentity = guestName && guestEmail;

  // Guest identity modal
  const identityModal = showIdentityForm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h3>
        <p className="text-sm text-gray-500 mb-4">Enter your name and email to leave feedback.</p>
        <div className="space-y-3 mb-5">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
          />
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowIdentityForm(false)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={saveGuestIdentity}
            disabled={!guestName.trim() || !guestEmail.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      {/* ─── Toolbar ─── */}
      <div className="bg-white border-b border-gray-200/80 px-4 h-14 flex items-center justify-between relative shrink-0">
        {/* Left: Brand + Project + URL */}
        <div className="flex items-center gap-3 min-w-0 z-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div className="w-px h-6 bg-gray-200/80 shrink-0" />
          <h2 className="font-semibold text-gray-900 shrink-0 text-[14px] tracking-tight">{project.name}</h2>
          {project.projectType === 'website' && project.websiteUrl && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50/80 pl-2 pr-2.5 py-1.5 rounded-lg truncate max-w-md border border-gray-100/80 cursor-default" title={project.websiteUrl}>
              <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              <span className="truncate">{project.websiteUrl}</span>
            </div>
          )}
        </div>

        {/* Right: Guest badge + identity */}
        <div className="flex items-center gap-3 z-10">
          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/50">
            Guest Review
          </span>
          {hasIdentity && (
            <>
              <div className="w-px h-6 bg-gray-200/80" />
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full ${guestColor.bg} ${guestColor.text} flex items-center justify-center text-[10px] font-bold`}>
                  {getInitials(guestName)}
                </div>
                <span className="text-[13px] font-medium text-gray-700">{guestName}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden relative shrink-0">
          {/* Detail view — slides in from right */}
          <div
            className="absolute inset-0 z-10 bg-white transition-transform duration-300 ease-in-out"
            style={{
              transform: detailView && selectedPin ? 'translateX(0)' : 'translateX(100%)',
              pointerEvents: detailView && selectedPin ? 'auto' : 'none',
            }}
          >
            {selectedPin && (
              <div className="flex flex-col h-full">
                {/* Detail header */}
                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-3 shrink-0">
                  <button
                    onClick={handleBackToList}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${
                      selectedPin.status === 'resolved' ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}>
                      {selectedPin.pinNumber}
                    </span>
                    <span className="text-[14px] font-semibold text-gray-900">Pin #{selectedPin.pinNumber}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      selectedPin.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {selectedPin.status === 'resolved' ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                </div>

                {/* Pin meta */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const authorName = selectedPin.createdBy?.name || selectedPin.createdByGuest?.name || 'Guest';
                      const authorId = selectedPin.createdBy?._id || selectedPin.createdByGuest?.email || authorName;
                      const color = getAvatarColor(authorId);
                      return (
                        <>
                          <div className={`w-6 h-6 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-[9px] font-bold`}>
                            {getInitials(authorName)}
                          </div>
                          <span className="text-[13px] font-medium text-gray-700">{authorName}</span>
                          {!selectedPin.createdBy && selectedPin.createdByGuest && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">(guest)</span>
                          )}
                        </>
                      );
                    })()}
                    <span className="text-[11px] text-gray-400">{timeAgo(selectedPin.createdAt)}</span>
                  </div>
                </div>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
                  {comments.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </div>
                      <p className="text-[13px] text-gray-400">No comments yet</p>
                      <p className="text-[11px] text-gray-300 mt-0.5">Be the first to leave feedback</p>
                    </div>
                  )}
                  {comments.map((comment) => {
                    const authorName = comment.author?.name || comment.authorGuest?.name || 'Guest';
                    const authorId = comment.author?._id || comment.authorGuest?.email || authorName;
                    const isGuest = !comment.author && comment.authorGuest;
                    const color = getAvatarColor(authorId);
                    return (
                      <div key={comment._id} className="py-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5`}>
                            {getInitials(authorName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[13px] font-semibold text-gray-700">{authorName}</span>
                              {isGuest && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">(guest)</span>
                              )}
                              <span className="text-[11px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-[13px] text-gray-600 leading-relaxed">{comment.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comment input */}
                {project.allowComments && (
                  <div className="px-4 py-3 border-t border-gray-100 shrink-0">
                    {!hasIdentity ? (
                      /* Inline identity prompt */
                      <div>
                        <p className="text-[13px] text-gray-500 mb-2.5">Enter your details to leave feedback</p>
                        <div className="space-y-2 mb-2.5">
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Your name"
                            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <button
                          onClick={saveGuestIdentity}
                          disabled={!guestName.trim() || !guestEmail.trim()}
                          className="w-full py-2 text-[13px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          Continue
                        </button>
                      </div>
                    ) : (
                      /* Comment textarea */
                      <div>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-full ${guestColor.bg} ${guestColor.text} flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5`}>
                            {getInitials(guestName)}
                          </div>
                          <textarea
                            value={commentBody}
                            onChange={(e) => setCommentBody(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            rows={2}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment();
                              }
                            }}
                          />
                        </div>
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={handleAddComment}
                            disabled={!commentBody.trim() || submitting}
                            className="px-4 py-1.5 text-[13px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {submitting ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pin list view */}
          <div className="flex flex-col h-full">
            {/* Filter tabs */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-4">
                {TABS.map((t) => {
                  const count = t.key === 'open' ? openCount : resolvedCount;
                  const isActive = filterStatus === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setFilterStatus(t.key)}
                      className={`text-[13px] pb-1 transition-all ${
                        isActive
                          ? 'font-semibold text-gray-900 border-b-2 border-gray-800'
                          : 'font-medium text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
                      }`}
                    >
                      {count} {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable pin list */}
            <div className="flex-1 overflow-y-auto">
              {filteredPins.length === 0 && (
                <div className="text-center py-16 px-6">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-400">
                    {filterStatus === 'resolved'
                      ? 'No resolved feedback'
                      : filterStatus === 'open'
                      ? 'No active feedback'
                      : 'No feedback yet'}
                  </p>
                  {filterStatus === 'open' && pins.length === 0 && (
                    <p className="text-xs text-gray-300 mt-1">Feedback will appear here</p>
                  )}
                </div>
              )}

              {filteredPins.map((pin) => {
                const authorName = pin.createdBy?.name || pin.createdByGuest?.name || 'Guest';
                const isSelected = selectedPin?._id === pin._id;
                return (
                  <div key={pin._id}>
                    <div
                      onClick={() => handlePinClick(pin)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="px-4 pt-4 pb-3">
                        {/* Top row: pin badge */}
                        <div className="flex items-start justify-between mb-2">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 ${
                            pin.status === 'resolved' ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}>
                            {pin.pinNumber}
                          </span>
                          {/* Comment count */}
                          <div className="flex items-center gap-1 text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <span className="text-[11px]">{pin.commentsCount || 0}</span>
                          </div>
                        </div>

                        {/* Author */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-semibold text-gray-900">{authorName}</span>
                          {!pin.createdBy && pin.createdByGuest && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">(guest)</span>
                          )}
                        </div>

                        {/* Time */}
                        <p className="text-[11px] text-gray-400 mb-1.5">{timeAgo(pin.createdAt)}</p>

                        {/* Comment preview */}
                        {pin.firstComment ? (
                          <p className="text-[13px] text-gray-700 leading-snug line-clamp-2">{pin.firstComment.body}</p>
                        ) : (
                          <p className="text-[12px] text-gray-300 italic">No comments</p>
                        )}

                        {/* Reply count */}
                        {pin.commentsCount > 1 && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            {pin.commentsCount - 1} {pin.commentsCount - 1 === 1 ? 'reply' : 'replies'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="border-b border-gray-100 mx-4" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Main content area ─── */}
        <div className="flex-1 relative bg-gray-50">
          {project.projectType === 'website' && (
            <iframe
              src={`${process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api'}/proxy?url=${encodeURIComponent(project.websiteUrl)}&projectId=${project._id}&guest=true`}
              className="w-full h-full border-0"
              title="Guest Review"
            />
          )}
        </div>
      </div>

      {identityModal}
    </div>
  );
}
