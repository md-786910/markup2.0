import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Mention, MentionBlot } from 'quill-mention';
import 'quill-mention/dist/quill.mention.css';
import { createCommentApi } from '../../services/commentService';
import { createPinApi } from '../../services/pinService';

// Register mention module and blot with Quill
Quill.register({ 'blots/mention': MentionBlot, 'modules/mention': Mention });

export default function NewPinCommentPopup({ pinData, projectId, onClose, onPinCreated, members = [] }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const quillRef = useRef(null);
  const membersRef = useRef(members);
  membersRef.current = members;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    setTimeout(() => quillRef.current?.getEditor()?.focus(), 150);
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: '#markup-comment-toolbar',
    },
    mention: {
      allowedChars: /^[a-zA-Z0-9_ ]*$/,
      mentionDenotationChars: ['@'],
      source: function (searchTerm, renderList) {
        const matches = membersRef.current
          .filter((m) =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 6)
          .map((m) => ({ id: m._id, value: m.name }));
        renderList(matches, searchTerm);
      },
      renderItem: function (item) {
        var div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:2px 0';
        var avatar = document.createElement('span');
        avatar.style.cssText = 'width:24px;height:24px;border-radius:50%;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0';
        avatar.textContent = (item.value || '?')[0].toUpperCase();
        var name = document.createElement('span');
        name.style.cssText = 'font-size:13px;color:#111827';
        name.textContent = item.value;
        div.appendChild(avatar);
        div.appendChild(name);
        return div;
      },
    },
  }), []);

  const formats = ['bold', 'italic', 'underline', 'code', 'blockquote', 'list', 'link', 'mention'];

  // Strip HTML to check if content is empty
  const isBodyEmpty = () => {
    const text = body.replace(/<[^>]*>/g, '').trim();
    return text.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBodyEmpty()) return;
    setLoading(true);
    try {
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
      pinFormData.append('initialComment', 'true');

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
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[460px] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Screenshot preview strip */}
          {pinData.screenshot && (
            <div className="relative h-16 overflow-hidden bg-gray-100">
              <img src={pinData.screenshot} alt="" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/60" />
            </div>
          )}

          {/* Toolbar — Quill binds to this via modules.toolbar.container */}
          <div className="border-b border-gray-100">
            <div id="markup-comment-toolbar" className="flex items-center gap-0.5 px-3 py-1.5 !border-none">
              <span className="ql-formats !mr-0">
                <button className="ql-bold" title="Bold" />
                <button className="ql-italic" title="Italic" />
                <button className="ql-underline" title="Underline" />
                <button className="ql-code" title="Code" />
              </span>
              <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
              <span className="ql-formats !mr-0">
                <button className="ql-list" value="ordered" title="Numbered list" />
                <button className="ql-list" value="bullet" title="Bullet list" />
                <button className="ql-blockquote" title="Quote" />
                <button className="ql-link" title="Link" />
              </span>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Rich text editor */}
          <div className="markup-quill-wrapper">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={body}
              onChange={setBody}
              modules={modules}
              formats={formats}
              placeholder="Leave a comment..."
            />
          </div>

          {/* File previews */}
          {files.length > 0 && (
            <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <label className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)])}
                />
              </label>
              {!pinData.screenshot && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 ml-1">
                  <div className="w-2.5 h-2.5 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  Capturing...
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isBodyEmpty()}
              className="px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-full hover:bg-blue-700 disabled:opacity-40 shadow-sm shadow-blue-600/20 transition-all hover:shadow-md"
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting...
                </div>
              ) : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
