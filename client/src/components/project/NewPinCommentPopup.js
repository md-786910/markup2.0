import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Mention, MentionBlot } from 'quill-mention';
import 'quill-mention/dist/quill.mention.css';
import { createCommentApi } from '../../services/commentService';
import { createPinApi, updatePinApi } from '../../services/pinService';
import useEscape from '../../hooks/useEscape';
import AttachmentChip from './AttachmentChip';
import { ACCEPTED_ATTACHMENT_TYPES } from '../../utils/attachmentHelpers';
import { toastError } from '../../utils/toast';

// Register mention module and blot with Quill
Quill.register({ 'blots/mention': MentionBlot, 'modules/mention': Mention });

export default function NewPinCommentPopup({ pinData, projectId, onClose, onPinSaved, onPinCreated, members = [] }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  // Task properties, saved on the new pin right after its first comment
  const [props, setProps] = useState({ status: 'open', priority: 'normal', assignee: '', dueAt: '', labels: [] });
  const [labelInput, setLabelInput] = useState('');
  const setProp = (key, value) => setProps((p) => ({ ...p, [key]: value }));
  const addLabel = () => {
    const val = labelInput.trim();
    if (val && !props.labels.includes(val)) setProp('labels', [...props.labels, val]);
    setLabelInput('');
  };
  const quillRef = useRef(null);
  const savedPinRef = useRef(null);
  useEscape(() => { if (!loading) onClose(); });
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
        avatar.style.cssText = 'width:24px;height:24px;border-radius:50%;background:#dbe5ff;color:#0031d1;display:flex;align-items:center;justify-content:center;font-size:var(--text-caption);font-weight:600;flex-shrink:0';
        avatar.textContent = (item.value || '?')[0].toUpperCase();
        var name = document.createElement('span');
        name.style.cssText = 'font-size:var(--text-body-sm);color:#111827';
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
      // A retry after a failed comment reuses the pin that was already saved
      let newPin = savedPinRef.current;
      if (!newPin) {
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
        if (pinData.context) pinFormData.append('context', JSON.stringify(pinData.context));
        pinFormData.append('initialComment', 'true');

        // Posting never waits for the capture: without a screenshot yet, the
        // parent uploads it to the pin when it arrives (onPinSaved)
        let sentScreenshot = false;
        if (pinData.screenshot) {
          try {
            const res = await fetch(pinData.screenshot);
            const blob = await res.blob();
            pinFormData.append('screenshot', blob, 'screenshot.jpg');
            sentScreenshot = true;
          } catch (screenshotErr) {
            console.warn('Failed to attach screenshot:', screenshotErr);
          }
        }

        const pinRes = await createPinApi(projectId, pinFormData);
        newPin = pinRes.data.pin;
        savedPinRef.current = newPin;
        if (onPinSaved) onPinSaved(newPin._id, sentScreenshot);
      }

      const commentFormData = new FormData();
      commentFormData.append('body', body);
      files.forEach((f) => commentFormData.append('attachments', f));
      await createCommentApi(newPin._id, commentFormData);

      // Only what was changed from the defaults (same endpoint as the sidebar)
      const patch = {};
      if (props.status !== 'open') patch.status = props.status;
      if (props.priority !== 'normal') patch.priority = props.priority;
      if (props.assignee) patch.assignee = props.assignee;
      if (props.dueAt) patch.dueAt = new Date(props.dueAt).toISOString();
      if (props.labels.length) patch.labels = props.labels;
      if (Object.keys(patch).length) {
        try {
          await updatePinApi(projectId, newPin._id, patch);
        } catch (propErr) {
          toastError(propErr, 'Pin posted, but its properties could not be saved.');
        }
      }
      if (onPinCreated) onPinCreated(newPin._id);
    } catch (err) {
      toastError(err, 'Could not post your comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Same look as the comment sidebar's property fields
  const fieldCls =
    'w-full h-8 appearance-none rounded-md border border-gray-200 bg-white pr-7 text-label transition-colors hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15';
  const chevron = (
    <svg className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
  const STATUS_DOT = { open: 'bg-blue-600', in_progress: 'bg-amber-500', in_review: 'bg-sky-500', resolved: 'bg-emerald-500' };
  const PRIORITY_DOT = { low: 'bg-gray-300', normal: 'bg-gray-400', high: 'bg-amber-500', urgent: 'bg-red-500' };
  const assigneeName = members.find((m) => m._id === props.assignee)?.name || members.find((m) => m._id === props.assignee)?.email || '';
  const row = 'grid min-h-8 grid-cols-[72px_minmax(0,1fr)] items-center gap-x-2';
  const rowLabel = 'text-body-sm text-gray-500';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New comment"
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative flex max-h-[calc(100vh-2rem)] w-[760px] max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] sm:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: the comment */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Screenshot preview strip */}
            {pinData.screenshot && (
              <div className="relative h-16 shrink-0 overflow-hidden bg-gray-100">
                <img src={pinData.screenshot} alt="" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/60" />
              </div>
            )}

            {/* Toolbar — Quill binds to this via modules.toolbar.container */}
            <div className="shrink-0 border-b border-gray-100">
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
              </div>
            </div>

            {/* Rich text editor */}
            <div className="markup-quill-wrapper markup-quill-tall min-h-0 flex-1">
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
                  <AttachmentChip
                    key={i}
                    file={f}
                    onRemove={() => setFiles(files.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            )}

            {/* Bottom bar */}
            <div className="flex shrink-0 items-center gap-1 border-t border-gray-100 px-3 py-2">
              <label className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Attach files">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <span className="sr-only">Attach files</span>
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_ATTACHMENT_TYPES}
                  className="hidden"
                  onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)])}
                />
              </label>
              {!pinData.screenshot && !pinData.captureFailed && (
                <div className="flex items-center gap-1.5 text-caption text-gray-400 ml-1">
                  <div className="w-2.5 h-2.5 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  Capturing...
                </div>
              )}
              {pinData.captureFailed && (
                <div className="text-caption text-amber-600/90 ml-1">
                  Screenshot skipped
                </div>
              )}
            </div>
          </div>

          {/* Right: task properties and Post */}
          <div className="flex w-full shrink-0 flex-col border-t border-gray-100 bg-gray-50 sm:w-[288px] sm:border-l sm:border-t-0">
            <div className="flex h-12 shrink-0 items-center justify-between pl-4 pr-2">
              <span className="text-label text-gray-900">Details</span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
              <div className={row}>
                <span className={rowLabel}>Status</span>
                <div className="relative">
                  <span className={`pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${STATUS_DOT[props.status]}`} />
                  <select value={props.status} onChange={(e) => setProp('status', e.target.value)} className={`${fieldCls} pl-7 text-gray-900`} aria-label="Status">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  {chevron}
                </div>
              </div>

              <div className={row}>
                <span className={rowLabel}>Priority</span>
                <div className="relative">
                  <span className={`pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${PRIORITY_DOT[props.priority]}`} />
                  <select value={props.priority} onChange={(e) => setProp('priority', e.target.value)} className={`${fieldCls} pl-7 text-gray-900`} aria-label="Priority">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  {chevron}
                </div>
              </div>

              <div className={row}>
                <span className={rowLabel}>Assignee</span>
                <div className="relative">
                  {assigneeName ? (
                    <span className="pointer-events-none absolute left-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-blue-100 text-caption font-semibold text-blue-700">
                      {assigneeName[0].toUpperCase()}
                    </span>
                  ) : (
                    <span className="pointer-events-none absolute left-1.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-dashed border-gray-300" />
                  )}
                  <select
                    value={props.assignee}
                    onChange={(e) => setProp('assignee', e.target.value)}
                    className={`${fieldCls} truncate pl-8 ${assigneeName ? 'text-gray-900' : 'text-gray-500'}`}
                    aria-label="Assignee"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id} value={m._id}>{m.name || m.email}</option>
                    ))}
                  </select>
                  {chevron}
                </div>
              </div>

              <div className={row}>
                <span className={rowLabel}>Due date</span>
                <input
                  type="date"
                  value={props.dueAt}
                  onChange={(e) => setProp('dueAt', e.target.value)}
                  className={`${fieldCls} px-2 ${props.dueAt ? 'text-gray-900' : 'text-gray-400'}`}
                  aria-label="Due date"
                />
              </div>

              <div className="grid min-h-8 grid-cols-[72px_minmax(0,1fr)] items-start gap-x-2">
                <span className={`${rowLabel} pt-1.5`}>Labels</span>
                <div className="flex min-h-8 flex-wrap items-center gap-1 py-0.5">
                  {props.labels.map((label, idx) => (
                    <span key={label} className="inline-flex h-6 items-center gap-1 rounded-md bg-gray-200/70 pl-2 pr-1 text-caption font-medium text-gray-700">
                      {label}
                      <button
                        type="button"
                        onClick={() => setProp('labels', props.labels.filter((_, i) => i !== idx))}
                        className="inline-flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-gray-300 hover:text-gray-700"
                        aria-label={`Remove label ${label}`}
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLabel();
                      }
                    }}
                    onBlur={addLabel}
                    placeholder={props.labels.length ? 'Add…' : 'Add a label…'}
                    className="h-7 min-w-[96px] flex-1 rounded-md border border-gray-200 bg-white px-2 text-body-sm text-gray-900 placeholder:text-gray-400 transition-colors hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                    aria-label="Add a label, then press Enter"
                    title="Type a label and press Enter"
                  />
                </div>
              </div>
            </div>

            {/* Post */}
            <div className="shrink-0 border-t border-gray-200/80 p-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || isBodyEmpty()}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-label text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting...
                  </>
                ) : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
