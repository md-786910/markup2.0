import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getCommentsApi, createCommentApi, updateCommentApi, deleteCommentApi } from '../../services/commentService';
import { useAuth } from '../../hooks/useAuth';
import MentionInput from './MentionInput';
import { stripHtmlForEdit } from '../../utils/htmlUtils';

function renderCommentBody(body) {
  if (!body) return null;
  // If body contains HTML tags, render as rich HTML
  if (/<[a-z][\s\S]*>/i.test(body)) {
    // Process @mentions inside HTML
    const processed = body.replace(
      /@\[([^\]]+)\]\(([a-fA-F\d]+)\)/g,
      '<span class="text-blue-600 font-medium bg-blue-50 rounded px-0.5">@$1</span>'
    );
    return <div className="comment-rich-content" dangerouslySetInnerHTML={{ __html: processed }} />;
  }
  // Plain text fallback — handle @mentions
  const MENTION_REGEX = /@\[([^\]]+)\]\(([a-fA-F\d]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = MENTION_REGEX.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, ${time}`;
}

export default function CommentSidebar({ pin, pins = [], onClose, onBack, onStatusChange, onDelete, onNavigate, onEvent, members = [] }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [confirmDeletePin, setConfirmDeletePin] = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [lightboxExpanded, setLightboxExpanded] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const { user } = useAuth();

  const handleDownload = (src) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `screenshot-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = async (src) => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy screenshot:', err);
    }
  };
  const mentionRef = useRef(null);
  const editMentionRef = useRef(null);

  useEffect(() => {
    if (!pin) return;
    let cancelled = false;
    setCommentsLoading(true);
    getCommentsApi(pin._id)
      .then((res) => {
        if (!cancelled) setComments(res.data.comments);
      })
      .catch((err) => console.error('Failed to load comments:', err))
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => { cancelled = true; };
  }, [pin?._id]);

  useEffect(() => {
    if (!onEvent || !pin?._id) return;
    const cleanup1 = onEvent('comment:created', (data) => {
      if (data.pinId === pin._id) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment._id)) return prev;
          return [...prev, data.comment];
        });
      }
    });
    const cleanup2 = onEvent('comment:deleted', (data) => {
      if (data.pinId === pin._id) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
      }
    });
    const cleanup3 = onEvent('comment:updated', (data) => {
      if (data.pinId === pin._id) {
        setComments((prev) => prev.map((c) => c._id === data.comment._id ? data.comment : c));
      }
    });
    return () => { cleanup1(); cleanup2(); cleanup3(); };
  }, [onEvent, pin?._id]);

  const loadComments = async () => {
    try {
      const res = await getCommentsApi(pin._id);
      setComments(res.data.comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      const encodedBody = mentionRef.current?.getEncodedValue() ?? body;
      formData.append('body', encodedBody);
      files.forEach((f) => formData.append('attachments', f));
      await createCommentApi(pin._id, formData);
      setBody('');
      setFiles([]);
      loadComments();
    } catch (err) {
      console.error('Failed to create comment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteCommentApi(pin._id, commentId);
      loadComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editBody.trim()) return;
    try {
      const encodedBody = editMentionRef.current?.getEncodedValue() ?? editBody;
      await updateCommentApi(pin._id, commentId, { body: encodedBody });
      setEditingComment(null);
      setEditBody('');
      loadComments();
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  if (!pin) return null;

  const currentIndex = pins.findIndex((p) => p._id === pin._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pins.length - 1 && currentIndex !== -1;

  return (
    <div className={onBack
      ? "w-full bg-white flex flex-col h-full"
      : "absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col h-full z-20 shadow-lg"
    }>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: back + title */}
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors -ml-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span className="text-sm font-bold text-gray-900">
              #{pin.pinNumber || (currentIndex + 1)}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${
              pin.status === 'resolved' ? 'bg-green-500' : 'bg-amber-500'
            }`}></span>
            <span className="text-[12px] text-gray-400">
              {pin.createdBy?.name || 'Unknown'} &middot; {formatDateTime(pin.createdAt)}
            </span>
          </div>
          {/* Right: action icons */}
          <div className="flex items-center gap-0.5">
            {/* Resolve/Reopen */}
            <button
              onClick={() => onStatusChange(pin._id, pin.status === 'resolved' ? 'pending' : 'resolved')}
              className={`p-1.5 rounded-md transition-colors ${
                pin.status === 'resolved'
                  ? 'text-amber-500 hover:bg-amber-50'
                  : 'text-green-600 hover:bg-green-50'
              }`}
              title={pin.status === 'resolved' ? 'Reopen' : 'Resolve'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {pin.status === 'resolved' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                ) : (
                  <><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-5"/></>
                )}
              </svg>
            </button>
            {/* Delete */}
            {confirmDeletePin ? (
              <span className="inline-flex items-center gap-1 ml-1">
                <button
                  onClick={() => { onDelete(pin._id); setConfirmDeletePin(false); }}
                  className="text-[11px] px-1.5 py-0.5 rounded font-medium text-white bg-red-600 hover:bg-red-700"
                >Yes</button>
                <button
                  onClick={() => setConfirmDeletePin(false)}
                  className="text-[11px] px-1.5 py-0.5 rounded font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                >No</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDeletePin(true)}
                className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            {!onBack && (
              <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot */}
      {pin.screenshot?.path && (
        <div className="px-3 py-2 border-b border-gray-200 shrink-0">
          <p className="text-[11px] text-gray-400 mb-1.5 font-medium">Screenshot</p>
          <div className="group/ss rounded-lg overflow-hidden border border-gray-200 bg-gray-50 relative cursor-pointer" style={{ maxHeight: '160px' }}
            onClick={() => setLightbox({ src: `/${pin.screenshot.path}`, pin })}
          >
            <div className="relative">
              <img
                src={`/${pin.screenshot.path}`}
                alt=""
                className="w-full block"
                loading="lazy"
              />
              {pin.viewportXPercent != null && pin.viewportYPercent != null && (
                <div
                  className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"
                  style={{
                    left: `${pin.viewportXPercent}%`,
                    top: `${pin.viewportYPercent}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
            </div>
            {/* Hover action buttons */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/ss:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox({ src: `/${pin.screenshot.path}`, pin }); }}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-black/60 text-white/90 hover:bg-black/80 transition-colors"
                title="View"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(`/${pin.screenshot.path}`); }}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-black/60 text-white/90 hover:bg-black/80 transition-colors"
                title="Download"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(`/${pin.screenshot.path}`); }}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-black/60 text-white/90 hover:bg-black/80 transition-colors"
                title="Copy"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {commentsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No comments yet</p>
            <p className="text-xs text-gray-300 mt-1">Add the first comment below</p>
          </div>
        ) : null}
        {!commentsLoading && comments.map((comment) => (
          <div key={comment._id} className="group">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium shrink-0">
                {(comment.author?.name || '?')[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-800 truncate">
                {comment.author?.name || 'Unknown'}
              </span>
              <span className="text-[11px] text-gray-400 shrink-0">
                {formatDateTime(comment.createdAt)}
              </span>
              {/* Edit / Delete actions */}
              <span className="inline-flex items-center gap-1 ml-auto shrink-0">
                {comment.author?._id === user?.id && editingComment !== comment._id && (
                  <button
                    onClick={() => { setEditingComment(comment._id); setEditBody(stripHtmlForEdit(comment.body)); }}
                    className="text-[11px] text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >Edit</button>
                )}
                {comment.author?._id === user?.id && (
                  confirmDeleteComment === comment._id ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => { handleDelete(comment._id); setConfirmDeleteComment(null); }}
                        className="text-[11px] px-1.5 py-0.5 rounded font-medium text-white bg-red-600 hover:bg-red-700"
                      >Yes</button>
                      <button
                        onClick={() => setConfirmDeleteComment(null)}
                        className="text-[11px] px-1.5 py-0.5 rounded font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                      >No</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteComment(comment._id)}
                      className="text-[11px] text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >Delete</button>
                  )
                )}
              </span>
            </div>
            <div className="ml-8">
              {editingComment === comment._id ? (
                <div>
                  <MentionInput
                    ref={editMentionRef}
                    value={editBody}
                    onChange={setEditBody}
                    members={members}
                    placeholder="Edit comment... (@ to mention)"
                    multiline={true}
                    rows={3}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => handleEdit(comment._id)}
                      disabled={!editBody.trim()}
                      className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >Save</button>
                    <button
                      onClick={() => { setEditingComment(null); setEditBody(''); }}
                      className="px-2.5 py-1 text-gray-600 text-[11px] font-medium rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">{renderCommentBody(comment.body)}</p>
              )}
              {comment.attachments?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {comment.attachments.map((att, i) => (
                    <img
                      key={i}
                      src={`/${att.path}`}
                      alt={att.originalName}
                      className="w-16 h-16 object-cover rounded-md border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => setLightbox({ src: `/${att.path}` })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
        <MentionInput
          ref={mentionRef}
          value={body}
          onChange={setBody}
          members={members}
          placeholder="Write a comment... (@ to mention)"
          multiline={true}
          rows={3}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
        />
        <div className="flex items-center justify-between mt-2">
          <label className="cursor-pointer text-xs text-gray-500 hover:text-blue-600 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files))}
            />
            {files.length > 0 ? `${files.length} file(s)` : 'Attach'}
          </label>
          <button
            type="submit"
            disabled={loading || !body.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Sending...' : 'Comment'}
          </button>
        </div>
      </form>

      {/* Prev / Next Navigation */}
      {pins.length > 1 && (
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            disabled={!hasPrev}
            onClick={() => hasPrev && onNavigate(pins[currentIndex - 1])}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          <span className="text-[11px] text-gray-400">
            {currentIndex + 1} / {pins.length}
          </span>
          <button
            disabled={!hasNext}
            onClick={() => hasNext && onNavigate(pins[currentIndex + 1])}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Lightbox — portaled to body to escape transform context */}
      {lightbox && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          onClick={() => { setLightbox(null); setLightboxExpanded(false); }}
        >
          {/* Toolbar */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleDownload(lightbox.src)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={() => handleCopy(lightbox.src)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
              title="Copy to clipboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setLightboxExpanded((prev) => !prev)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
              title={lightboxExpanded ? 'Shrink' : 'Expand'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {lightboxExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                )}
              </svg>
            </button>
            <button
              onClick={() => { setLightbox(null); setLightboxExpanded(false); }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.src}
              alt=""
              className={`rounded-lg transition-all duration-200 ${lightboxExpanded ? 'max-w-[98vw] max-h-[96vh]' : 'max-w-[90vw] max-h-[90vh]'}`}
            />
            {lightbox.pin?.viewportXPercent != null && lightbox.pin?.viewportYPercent != null && (
              <div
                className="absolute w-5 h-5 rounded-full bg-red-500 border-[3px] border-white shadow-lg"
                style={{
                  left: `${lightbox.pin.viewportXPercent}%`,
                  top: `${lightbox.pin.viewportYPercent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}
          </div>
          {/* Copy toast */}
          {copyToast && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-lg shadow-lg text-sm font-medium text-gray-800">
              Copied to clipboard
            </div>
          )}
        </div>,
        document.body
      )}
      {/* Copy toast (outside lightbox) */}
      {copyToast && !lightbox && createPortal(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-white rounded-lg shadow-lg text-sm font-medium text-gray-800">
          Copied to clipboard
        </div>,
        document.body
      )}
    </div>
  );
}
