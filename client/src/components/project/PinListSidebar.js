import React, { useState, useEffect, useMemo } from 'react';
import { getCommentsApi, createCommentApi } from '../../services/commentService';

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

function getPagePath(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/' ? '/' : parsed.pathname;
  } catch {
    return url;
  }
}

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

export default function PinListSidebar({
  pins,
  selectedPinId,
  onPinClick,
  onStatusChange,
  onDelete,
  onCommentAdded,
  onEvent,
}) {
  const [expandedPinId, setExpandedPinId] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!expandedPinId) {
      setComments([]);
      return;
    }
    loadComments(expandedPinId);
  }, [expandedPinId]);

  // Real-time: new comment on expanded pin
  useEffect(() => {
    if (!onEvent || !expandedPinId) return;
    return onEvent('comment:created', (data) => {
      if (data.pinId === expandedPinId) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment._id)) return prev;
          return [...prev, data.comment];
        });
      }
    });
  }, [onEvent, expandedPinId]);

  // Real-time: comment deleted from expanded pin
  useEffect(() => {
    if (!onEvent || !expandedPinId) return;
    return onEvent('comment:deleted', (data) => {
      if (data.pinId === expandedPinId) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
      }
    });
  }, [onEvent, expandedPinId]);

  const loadComments = async (pinId) => {
    setLoadingComments(true);
    try {
      const res = await getCommentsApi(pinId);
      setComments(res.data.comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCardClick = (pin) => {
    onPinClick(pin);
    setExpandedPinId((prev) => (prev === pin._id ? null : pin._id));
    setReplyBody('');
    setConfirmDelete(null);
  };

  const handleReply = async (e, pinId) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSendingReply(true);
    try {
      const formData = new FormData();
      formData.append('body', replyBody);
      await createCommentApi(pinId, formData);
      setReplyBody('');
      await loadComments(pinId);
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  // Filter and search
  const filteredPins = useMemo(() => {
    let result = pins;
    if (filterStatus === 'open') result = result.filter((p) => p.status === 'pending');
    else if (filterStatus === 'resolved') result = result.filter((p) => p.status === 'resolved');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        (p.latestComment?.body || '').toLowerCase().includes(q) ||
        (p.createdBy?.name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [pins, filterStatus, searchQuery]);

  // Filter counts
  const openCount = pins.filter((p) => p.status === 'pending').length;
  const resolvedCount = pins.filter((p) => p.status === 'resolved').length;

  // Group by page
  const grouped = {};
  filteredPins.forEach((pin) => {
    const path = getPagePath(pin.pageUrl);
    if (!grouped[path]) grouped[path] = [];
    grouped[path].push(pin);
  });

  const isExpanded = (pinId) => expandedPinId === pinId;
  const isSelected = (pinId) => selectedPinId === pinId;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold text-gray-900">Comments</h3>
          <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
            {filteredPins.length}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-3">
          {FILTERS.map((f) => {
            const count = f.key === 'open' ? openCount : f.key === 'resolved' ? resolvedCount : pins.length;
            return (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
                  filterStatus === f.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
                <span className={`ml-1 ${filterStatus === f.key ? 'text-gray-400' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comments..."
            className="w-full text-[12px] pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white placeholder-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {filteredPins.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">
              {searchQuery ? 'No matching comments' : filterStatus === 'resolved' ? 'No resolved comments' : filterStatus === 'open' ? 'No open comments' : 'No comments yet'}
            </p>
            {!searchQuery && filterStatus === 'open' && pins.length === 0 && (
              <p className="text-xs text-gray-300 mt-1">Click Pin Mode to start</p>
            )}
          </div>
        )}

        {Object.entries(grouped).map(([path, pagePins]) => (
          <div key={path}>
            {/* Page section — subtle divider */}
            <div className="px-4 py-2 flex items-center gap-2 bg-gray-50/60">
              <span className="text-[10px] font-medium text-gray-400 truncate" title={path}>
                {path}
              </span>
              <span className="text-[10px] text-gray-300 ml-auto shrink-0">
                {pagePins.length}
              </span>
            </div>

            {/* Pin cards */}
            {pagePins.map((pin, idx) => (
              <div key={pin._id}>
                {/* Card */}
                <div
                  onClick={() => handleCardClick(pin)}
                  className={`cursor-pointer transition-colors border-l-2 ${
                    isSelected(pin._id)
                      ? 'border-l-blue-500 bg-blue-50/40'
                      : 'border-l-transparent hover:bg-gray-50/80'
                  }`}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    {/* Pin badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        pin.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {pin.pinNumber || (idx + 1)}
                      </span>
                      {pin.status === 'resolved' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {pin.latestComment ? (
                        <p className="text-[12px] text-gray-700 leading-relaxed truncate">
                          {pin.latestComment.body}
                        </p>
                      ) : (
                        <p className="text-[12px] text-gray-300 italic">No comments</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-medium text-gray-500 truncate">
                          {pin.createdBy?.name || 'Unknown'}
                        </span>
                        <span className="text-gray-300">&middot;</span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {timeAgo(pin.createdAt)}
                        </span>
                        {pin.commentsCount > 0 && (
                          <>
                            <span className="text-gray-300">&middot;</span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {pin.commentsCount} {pin.commentsCount === 1 ? 'reply' : 'replies'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <svg
                      className={`w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform duration-200 ${
                        isExpanded(pin._id) ? 'rotate-180 text-blue-400' : ''
                      }`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded thread */}
                {isExpanded(pin._id) && (
                  <div className="bg-gray-50/60 border-t border-gray-100">
                    {/* Comments thread */}
                    <div className="max-h-64 overflow-y-auto">
                      {loadingComments ? (
                        <div className="py-8 text-center">
                          <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-[11px] text-gray-400">No comments yet</p>
                        </div>
                      ) : (
                        <div className="px-4 py-2">
                          {comments.map((comment, ci) => (
                            <div key={comment._id} className={`py-2.5 flex gap-2.5 ${ci > 0 ? 'border-t border-gray-100' : ''}`}>
                              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {(comment.author?.name || '?')[0].toUpperCase()}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[12px] font-semibold text-gray-800">
                                    {comment.author?.name || 'Unknown'}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {timeAgo(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-[12px] text-gray-600 leading-relaxed break-words mt-0.5">
                                  {comment.body}
                                </p>
                                {comment.attachments?.length > 0 && (
                                  <div className="mt-2 flex gap-1.5 flex-wrap">
                                    {comment.attachments.map((att, i) => (
                                      <img
                                        key={i}
                                        src={`/${att.path}`}
                                        alt={att.originalName}
                                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors"
                                        onClick={() => window.open(`/${att.path}`, '_blank')}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reply input */}
                    <form
                      onSubmit={(e) => handleReply(e, pin._id)}
                      className="px-4 py-2.5 flex items-center gap-2 border-t border-gray-100 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 text-[12px] px-3 py-1.5 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white placeholder-gray-400 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyBody.trim()}
                        className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 shrink-0 transition-colors"
                      >
                        {sendingReply ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                          </svg>
                        )}
                      </button>
                    </form>

                    {/* Actions — subtle, at bottom */}
                    <div className="px-4 py-2 flex items-center gap-1 border-t border-gray-100 bg-gray-50/40" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onStatusChange(pin._id, pin.status === 'resolved' ? 'pending' : 'resolved')}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                          pin.status === 'resolved'
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {pin.status === 'resolved' ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reopen
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Resolve
                          </>
                        )}
                      </button>

                      <div className="ml-auto">
                        {confirmDelete === pin._id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-500">Delete?</span>
                            <button
                              onClick={() => { onDelete(pin._id); setConfirmDelete(null); setExpandedPinId(null); }}
                              className="text-[11px] px-2 py-0.5 rounded font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[11px] px-2 py-0.5 rounded font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(pin._id)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete pin"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Separator between cards */}
                <div className="border-b border-gray-100"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
