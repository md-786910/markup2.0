import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getGuestProjectApi,
  getGuestPinsApi,
  getGuestCommentsApi,
  createGuestPinApi,
  createGuestCommentApi,
} from '../services/guestService';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <h1 className="font-semibold text-gray-900 text-sm">{project.name}</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Guest Review</span>
        </div>
        {guestName && (
          <span className="text-xs text-gray-500">
            Reviewing as <span className="font-medium text-gray-700">{guestName}</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Pin list sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Feedback ({pins.length})
            </p>
          </div>
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-sm">No feedback yet</p>
            </div>
          ) : (
            pins.map((pin) => (
              <button
                key={pin._id}
                onClick={() => setSelectedPin(pin)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedPin?._id === pin._id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      pin.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {pin.pinNumber}
                    </span>
                    <span className="text-sm text-gray-700">
                      Pin #{pin.pinNumber}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{pin.commentsCount || 0}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {pin.createdBy?.name || pin.createdByGuest?.name || 'Unknown'} - {timeAgo(pin.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex">
          {/* Website iframe */}
          {project.projectType === 'website' && (
            <div className="flex-1 relative">
              <iframe
                src={`${process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api'}/proxy?url=${encodeURIComponent(project.websiteUrl)}&projectId=${project._id}&guest=true`}
                className="w-full h-full border-0"
                title="Guest Review"
              />
            </div>
          )}

          {/* Comment panel */}
          {selectedPin && (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
              {/* Pin header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Pin #{selectedPin.pinNumber}</h3>
                <button
                  onClick={() => setSelectedPin(null)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {comments.map((comment) => {
                  const authorName = comment.author?.name || comment.authorGuest?.name || 'Guest';
                  const isGuest = !comment.author && comment.authorGuest;
                  return (
                    <div key={comment._id} className="group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{authorName}</span>
                        {isGuest && <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded">(guest)</span>}
                        <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{comment.body}</p>
                    </div>
                  );
                })}
              </div>

              {/* Add comment */}
              {project.allowComments && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentBody.trim() || submitting}
                    className="mt-2 w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {identityModal}
    </div>
  );
}
