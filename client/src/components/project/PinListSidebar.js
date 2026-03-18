import React, { useState, useEffect } from 'react';
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

  const handleToggleExpand = (e, pinId) => {
    e.stopPropagation();
    setExpandedPinId((prev) => (prev === pinId ? null : pinId));
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

  const grouped = {};
  pins.forEach((pin) => {
    const path = getPagePath(pin.pageUrl);
    if (!grouped[path]) grouped[path] = [];
    grouped[path].push(pin);
  });

  const isExpanded = (pinId) => expandedPinId === pinId;
  const isSelected = (pinId) => selectedPinId === pinId;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Comments</h3>
          <span className="text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-semibold">
            {pins.length}
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {pins.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-400 mt-1">Click Pin Mode to add your first pin</p>
          </div>
        )}

        {Object.entries(grouped).map(([path, pagePins]) => (
          <div key={path}>
            {/* Page section header */}
            <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[11px] font-semibold text-gray-500 truncate" title={path}>
                {path}
              </span>
              <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                {pagePins.length} {pagePins.length === 1 ? 'pin' : 'pins'}
              </span>
            </div>

            {/* Pin items */}
            {pagePins.map((pin, idx) => (
              <div
                key={pin._id}
                className={`border-b border-gray-100 transition-colors ${
                  isSelected(pin._id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Pin row */}
                <div
                  onClick={() => onPinClick(pin)}
                  className="px-4 py-3 cursor-pointer flex items-start gap-3"
                >
                  {/* Pin number badge */}
                  <div className="relative shrink-0 mt-0.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                      pin.status === 'resolved'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {pin.pinNumber || (idx + 1)}
                    </span>
                    {pin.status === 'resolved' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">
                        {pin.createdBy?.name || 'Unknown'}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {timeAgo(pin.createdAt)}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-700 font-bold">
                      Pin #{pin.pinNumber || (idx + 1)}
                    </span>
                    {pin.latestComment ? (
                      <p className="text-[12px] text-gray-500 mt-1 truncate leading-relaxed">
                        {pin.latestComment.body}
                      </p>
                    ) : (
                      <p className="text-[12px] text-gray-300 mt-1 italic">No comments</p>
                    )}
                    {pin.commentsCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-1.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {pin.commentsCount} {pin.commentsCount === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={(e) => handleToggleExpand(e, pin._id)}
                    className={`p-1.5 rounded-md transition-colors shrink-0 mt-0.5 ${
                      isExpanded(pin._id)
                        ? 'text-blue-500 bg-blue-50'
                        : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded(pin._id) ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded section */}
                {isExpanded(pin._id) && (
                  <div className="bg-gray-50/80">
                    {/* Actions bar */}
                    <div className="px-4 py-2 flex items-center gap-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onStatusChange(pin._id, pin.status === 'resolved' ? 'pending' : 'resolved')}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                          pin.status === 'resolved'
                            ? 'text-amber-700 hover:bg-amber-100'
                            : 'text-emerald-700 hover:bg-emerald-100'
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
                              className="text-[11px] px-2 py-1 rounded-md font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[11px] px-2 py-1 rounded-md font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(pin._id)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete pin"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Comments thread */}
                    <div className="max-h-60 overflow-y-auto border-t border-gray-100">
                      {loadingComments ? (
                        <div className="px-4 py-8 text-center">
                          <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-xs text-gray-400">No comments yet</p>
                        </div>
                      ) : (
                        <div className="py-1">
                          {comments.map((comment, ci) => (
                            <div key={comment._id} className={`px-4 py-2.5 flex gap-2.5 ${ci > 0 ? 'border-t border-gray-100/80' : ''}`}>
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
                      className="px-4 py-3 flex items-center gap-2 border-t border-gray-100 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 text-[12px] px-3.5 py-2 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white placeholder-gray-400 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyBody.trim()}
                        className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 shrink-0 transition-colors"
                      >
                        {sendingReply ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                          </svg>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
