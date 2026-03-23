import React, { useState, useEffect } from 'react';
import { createCommentApi } from '../../services/commentService';
import { createPinApi } from '../../services/pinService';

export default function NewPinCommentPopup({ pinData, projectId, onClose, onPinCreated }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      // Build FormData for pin creation (to include screenshot file)
      const pinFormData = new FormData();
      pinFormData.append('xPercent', pinData.xPercent);
      pinFormData.append('yPercent', pinData.yPercent);
      pinFormData.append('pageUrl', pinData.pageUrl);
      if (pinData.selector) pinFormData.append('selector', pinData.selector);
      if (pinData.elementOffsetX != null) pinFormData.append('elementOffsetX', pinData.elementOffsetX);
      if (pinData.elementOffsetY != null) pinFormData.append('elementOffsetY', pinData.elementOffsetY);
      if (pinData.documentWidth != null) pinFormData.append('documentWidth', pinData.documentWidth);
      if (pinData.documentHeight != null) pinFormData.append('documentHeight', pinData.documentHeight);
      if (pinData.deviceMode) pinFormData.append('deviceMode', pinData.deviceMode);
      if (pinData.viewportXPercent != null) pinFormData.append('viewportXPercent', pinData.viewportXPercent);
      if (pinData.viewportYPercent != null) pinFormData.append('viewportYPercent', pinData.viewportYPercent);

      // Attach screenshot if available (convert base64 data URL to blob)
      if (pinData.screenshot) {
        try {
          const res = await fetch(pinData.screenshot);
          const blob = await res.blob();
          pinFormData.append('screenshot', blob, 'screenshot.jpg');
        } catch (screenshotErr) {
          console.warn('Failed to attach screenshot:', screenshotErr);
        }
      }

      const pinRes = await createPinApi(projectId, pinFormData);
      const newPin = pinRes.data.pin;

      // Create comment with attachments
      const commentFormData = new FormData();
      commentFormData.append('body', body);
      files.forEach((f) => commentFormData.append('attachments', f));
      await createCommentApi(newPin._id, commentFormData);
      if (onPinCreated) onPinCreated(newPin._id);
    } catch (err) {
      console.error('Failed to create pin/comment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[380px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
              +
            </span>
            <span className="text-sm font-semibold text-gray-800">Add a comment</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Screenshot preview */}
        <div className="px-4 pt-3">
          {pinData.screenshot ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mb-2" style={{ maxHeight: '80px' }}>
              <img src={pinData.screenshot} alt="" className="w-full block" />
              <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">Screenshot captured</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
              <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              Capturing screenshot...
            </div>
          )}
        </div>

        {/* Comment form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-4 py-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your comment..."
              rows={3}
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white placeholder-gray-400"
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <label className="cursor-pointer text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
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
              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Sending...' : 'Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
