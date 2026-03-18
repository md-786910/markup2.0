import React, { useState, useEffect } from 'react';
import { getCommentsApi, createCommentApi, deleteCommentApi } from '../../services/commentService';
import { useAuth } from '../../hooks/useAuth';

export default function CommentSidebar({ pin, onClose, onStatusChange, onDelete, onEvent }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDeletePin, setConfirmDeletePin] = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (pin) {
      loadComments();
    }
  }, [pin?._id]);

  // Real-time comment updates
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
    return () => { cleanup1(); cleanup2(); };
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
      formData.append('body', body);
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

  if (!pin) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              pin.status === 'resolved'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                pin.status === 'resolved' ? 'bg-green-500' : 'bg-amber-500'
              }`}></span>
              {pin.status === 'resolved' ? 'Resolved' : 'Open'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onStatusChange(pin._id, pin.status === 'resolved' ? 'pending' : 'resolved')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              pin.status === 'resolved'
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {pin.status === 'resolved' ? 'Reopen' : 'Resolve'}
          </button>
          {confirmDeletePin ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Delete pin?</span>
              <button
                onClick={() => { onDelete(pin._id); setConfirmDeletePin(false); }}
                className="text-xs px-2 py-0.5 rounded font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDeletePin(false)}
                className="text-xs px-2 py-0.5 rounded font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                No
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDeletePin(true)}
              className="text-xs px-2.5 py-1 rounded-md font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No comments yet</p>
            <p className="text-xs text-gray-300 mt-1">Add the first comment below</p>
          </div>
        )}
        {comments.map((comment) => (
          <div key={comment._id} className="group">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium shrink-0">
                {(comment.author?.name || '?')[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-800 truncate">
                {comment.author?.name || 'Unknown'}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
              {(comment.author?._id === user?.id || isAdmin) && (
                confirmDeleteComment === comment._id ? (
                  <span className="inline-flex items-center gap-1 ml-auto shrink-0">
                    <button
                      onClick={() => { handleDelete(comment._id); setConfirmDeleteComment(null); }}
                      className="text-xs px-1.5 py-0.5 rounded font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteComment(null)}
                      className="text-xs px-1.5 py-0.5 rounded font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteComment(comment._id)}
                    className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                  >
                    Delete
                  </button>
                )
              )}
            </div>
            <div className="ml-8">
              <p className="text-sm text-gray-600 leading-relaxed">{comment.body}</p>
              {comment.attachments?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {comment.attachments.map((att, i) => (
                    <img
                      key={i}
                      src={`/${att.path}`}
                      alt={att.originalName}
                      className="w-16 h-16 object-cover rounded-md border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => window.open(`/${att.path}`, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-gray-50">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
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
            {files.length > 0 ? `${files.length} file(s) selected` : 'Attach'}
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
    </div>
  );
}
