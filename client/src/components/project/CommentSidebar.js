import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  getCommentsApi,
  createCommentApi,
  updateCommentApi,
  deleteCommentApi,
} from "../../services/commentService";
import { useAuth } from "../../hooks/useAuth";
import MentionInput from "./MentionInput";
import { stripHtmlForEdit } from "../../utils/htmlUtils";
import renderCommentBody from "../../utils/renderCommentBody";
import AttachmentChip from "./AttachmentChip";
import AttachmentItem from "./AttachmentItem";
import { fileUrl } from "../../utils/uploadUrl";
import { ACCEPTED_ATTACHMENT_TYPES } from "../../utils/attachmentHelpers";
import { formatFullTimestamp } from "../../utils/formatTimestamp";
import { toastError } from '../../utils/toast';
import TechnicalDetails from './TechnicalDetails';
import { getAvatarColor } from "../../utils/avatarColors";

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return m === 1 ? "1 min ago" : `${m} mins ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return h === 1 ? "1 hr ago" : `${h} hrs ago`;
  }
  if (diff < 7 * 86400) {
    const day = Math.floor(diff / 86400);
    return day === 1 ? "yesterday" : `${day} days ago`;
  }
  const month = d.toLocaleString("en-US", { month: "short" });
  const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${month} ${d.getDate()}, ${time}`;
}

export default function CommentSidebar({
  pin,
  pins = [],
  onClose,
  onBack,
  onStatusChange,
  onPinUpdate,
  onDelete,
  onNavigate,
  onEvent,
  resyncKey = 0,
  members = [],
  readOnly = false,
}) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [confirmDeletePin, setConfirmDeletePin] = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [lightboxExpanded, setLightboxExpanded] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState("");
  const { user } = useAuth();

  const handleDownload = (src) => {
    const a = document.createElement("a");
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
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch (err) {
      toastError(err, 'Could not copy the screenshot.');
    }
  };
  const mentionRef = useRef(null);
  const editMentionRef = useRef(null);

  const handleStatusSelect = (nextStatus) => {
    if (onPinUpdate) {
      onPinUpdate(pin._id, { status: nextStatus });
    } else if (onStatusChange) {
      onStatusChange(pin._id, nextStatus);
    }
  };

  const handlePrioritySelect = (priority) => {
    if (onPinUpdate) {
      onPinUpdate(pin._id, { priority });
    }
  };

  const handleAssigneeSelect = (assigneeId) => {
    if (onPinUpdate) {
      onPinUpdate(pin._id, { assignee: assigneeId || null });
    }
  };

  const handleDueDateSelect = (dueDateStr) => {
    if (onPinUpdate) {
      onPinUpdate(pin._id, { dueAt: dueDateStr ? new Date(dueDateStr).toISOString() : null });
    }
  };

  const handleRemoveLabel = (idx) => {
    const nextLabels = (pin.labels || []).filter((_, i) => i !== idx);
    if (onPinUpdate) {
      onPinUpdate(pin._id, { labels: nextLabels });
    }
  };

  const handleAddLabelKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = newLabelInput.trim();
      if (val && !(pin.labels || []).includes(val)) {
        const nextLabels = [...(pin.labels || []), val];
        if (onPinUpdate) {
          onPinUpdate(pin._id, { labels: nextLabels });
        }
      }
      setNewLabelInput("");
    }
  };

  useEffect(() => {
    if (!pin) return;
    let cancelled = false;
    setCommentsLoading(true);
    getCommentsApi(pin._id)
      .then((res) => {
        if (!cancelled) setComments(res.data.comments);
      })
      .catch((err) => toastError(err, 'Could not load comments.'))
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // resyncKey: reload the thread after a socket reconnect (comments may have been missed)
  }, [pin?._id, resyncKey]);

  useEffect(() => {
    if (!onEvent || !pin?._id) return;
    const cleanup1 = onEvent("comment:created", (data) => {
      if (data.pinId === pin._id) {
        setComments((prev) => {
          if (prev.some((c) => c._id === data.comment._id)) return prev;
          return [...prev, data.comment];
        });
      }
    });
    const cleanup2 = onEvent("comment:deleted", (data) => {
      if (data.pinId === pin._id) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
      }
    });
    const cleanup3 = onEvent("comment:updated", (data) => {
      if (data.pinId === pin._id) {
        setComments((prev) =>
          prev.map((c) => (c._id === data.comment._id ? data.comment : c)),
        );
      }
    });
    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
    };
  }, [onEvent, pin?._id]);

  const loadComments = async () => {
    try {
      const res = await getCommentsApi(pin._id);
      setComments(res.data.comments);
    } catch (err) {
      toastError(err, 'Could not load comments.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      const encodedBody = mentionRef.current?.getEncodedValue() ?? body;
      formData.append("body", encodedBody);
      files.forEach((f) => formData.append("attachments", f));
      await createCommentApi(pin._id, formData);
      setBody("");
      setFiles([]);
      loadComments();
    } catch (err) {
      toastError(err, 'Could not post your comment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteCommentApi(pin._id, commentId);
      loadComments();
    } catch (err) {
      toastError(err, 'Could not delete the comment.');
    }
  };

  const handleEdit = async (commentId) => {
    if (!editBody.trim()) return;
    try {
      const encodedBody = editMentionRef.current?.getEncodedValue() ?? editBody;
      await updateCommentApi(pin._id, commentId, { body: encodedBody });
      setEditingComment(null);
      setEditBody("");
      loadComments();
    } catch (err) {
      toastError(err, 'Could not save your edit.');
    }
  };

  if (!pin) return null;

  const currentIndex = pins.findIndex((p) => p._id === pin._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pins.length - 1 && currentIndex !== -1;

  const isResolved = pin.status === "resolved";
  const statusValue = pin.status === "pending" ? "open" : pin.status || "open";
  const assigneeId = pin.assignee?._id || pin.assignee || "";
  const assigneeName =
    members.find((m) => m._id === assigneeId)?.name ||
    members.find((m) => m._id === assigneeId)?.email ||
    pin.assignee?.name ||
    "";
  const dueValue = pin.dueAt ? String(pin.dueAt).slice(0, 10) : "";
  const isOverdue = Boolean(dueValue) && statusValue !== "resolved" && new Date(`${dueValue}T23:59:59`) < new Date();
  const authorName = pin.createdBy?.name || pin.createdByGuest?.name || "Unknown";

  const chevron = (
    <svg className="chev h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
  const STATUS_COLOR = { open: "var(--status-open)", in_progress: "var(--status-progress)", in_review: "var(--status-review)", resolved: "var(--status-resolved)" };
  const PRIORITY_COLOR = { low: "var(--priority-low)", normal: "var(--priority-normal)", high: "var(--priority-high)", urgent: "var(--priority-urgent)" };
  const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors";
  const assigneeColor = getAvatarColor(assigneeId || assigneeName);

  return (
    <div
      className={
        onBack
          ? "w-full bg-white flex flex-col h-full min-h-0"
          : "absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 flex flex-col h-full z-20 shadow-lg"
      }
    >
      {/* Header: back, pin, author and time, resolve, delete */}
      <div className="kr-dh">
        {onBack && (
          <button onClick={onBack} className={`${iconBtn} !h-7 !w-7 text-slate-500 hover:bg-slate-100 hover:text-slate-900`} title="Back to all pins" aria-label="Back to all pins">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className={`kr-pin sm ${isResolved ? "ok" : ""}`}>{pin.pinNumber || currentIndex + 1}</span>
        <div className="who">
          <b>{authorName}</b>
          <small title={formatFullTimestamp(pin.createdAt)}>{formatDateTime(pin.createdAt)}</small>
        </div>

        {/* View-only access: no resolve or delete */}
        {!readOnly && (confirmDeletePin ? (
          <span className="flex shrink-0 items-center gap-1">
            <span className="text-ui-label text-slate-500">Delete?</span>
            <button
              onClick={() => {
                onDelete(pin._id);
                setConfirmDeletePin(false);
              }}
              className="inline-flex h-7 items-center rounded-lg bg-red-600 px-2.5 text-ui-label text-white hover:bg-red-700"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDeletePin(false)}
              className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-2.5 text-ui-label text-slate-600 hover:bg-slate-200"
            >
              No
            </button>
          </span>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onStatusChange(pin._id, isResolved ? "open" : "resolved")}
              className={`kr-resolve ${isResolved ? "done" : ""}`}
              title={isResolved ? "Resolved: click to reopen" : "Mark as resolved"}
              aria-label={isResolved ? "Reopen this pin" : "Mark as resolved"}
              aria-pressed={isResolved}
            >
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
            <button
              onClick={() => setConfirmDeletePin(true)}
              className={`${iconBtn} !h-7 !w-7 text-slate-500 hover:bg-red-50 hover:text-red-600`}
              title="Delete pin"
              aria-label="Delete pin"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
        {!onBack && (
          <button onClick={onClose} className={`${iconBtn} text-slate-500 hover:bg-slate-100 hover:text-slate-600`} title="Close" aria-label="Close">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Fields and comments scroll; the composer block and pager stay at the bottom */}
      <div className="kr-dscroll scrollbar-thin">
        <div className="kr-fields">
          <span>Status</span>
          <div className="kr-sel dot">
            <i className="lead" style={{ background: STATUS_COLOR[statusValue] || STATUS_COLOR.open }} />
            <select disabled={readOnly} value={statusValue} onChange={(e) => handleStatusSelect(e.target.value)} aria-label="Status">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
            </select>
            {!readOnly && chevron}
          </div>

          <span>Priority</span>
          <div className="kr-sel dot">
            <i className="lead" style={{ background: PRIORITY_COLOR[pin.priority || "normal"] || PRIORITY_COLOR.normal }} />
            <select disabled={readOnly} value={pin.priority || "normal"} onChange={(e) => handlePrioritySelect(e.target.value)} aria-label="Priority">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            {!readOnly && chevron}
          </div>

          <span>Assignee</span>
          <div className={`kr-sel av ${assigneeName ? "" : "empty"}`}>
            {assigneeName ? (
              <span className={`lead flex h-5 w-5 items-center justify-center rounded-full ${assigneeColor.bg} ${assigneeColor.text} text-micro`} style={{ left: 8 }}>
                {assigneeName[0].toUpperCase()}
              </span>
            ) : (
              <span className="lead h-5 w-5 rounded-full border border-dashed border-slate-300" style={{ left: 8 }} />
            )}
            <select
              disabled={readOnly}
              value={assigneeId}
              onChange={(e) => handleAssigneeSelect(e.target.value)}
              aria-label="Assignee"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
            {!readOnly && chevron}
          </div>

          <span>Due date</span>
          <div className={`kr-sel ${isOverdue ? "over" : ""} ${dueValue ? "" : "empty"}`}>
            <input
              type="date"
              disabled={readOnly}
              value={dueValue}
              onChange={(e) => handleDueDateSelect(e.target.value)}
              aria-label="Due date"
              title={isOverdue ? "Overdue" : undefined}
            />
          </div>

          <span className="self-start pt-1.5">Labels</span>
          <div className={`kr-chips ${readOnly ? "ro" : ""}`}>
            {(pin.labels || []).map((label, idx) => (
              <span key={idx} className="kr-chip">
                {label}
                {!readOnly && (
                  <button type="button" onClick={() => handleRemoveLabel(idx)} aria-label={`Remove label ${label}`}>
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
            {!readOnly && (
              <input
                type="text"
                placeholder={(pin.labels || []).length ? "Add…" : "Add a label…"}
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                onKeyDown={handleAddLabelKeyDown}
                aria-label="Add a label, then press Enter"
                title="Type a label and press Enter"
              />
            )}
            {readOnly && !(pin.labels || []).length && <span className="text-ui text-slate-500">None</span>}
          </div>
        </div>

        {/* Conversation */}
        <div className="kr-cm">
          <h4>
            Comments
            {!commentsLoading && comments.length > 0 && <span className="n">{comments.length}</span>}
          </h4>

          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center">
              <p className="text-ui font-medium text-slate-600">No comments yet</p>
              <p className="mt-0.5 text-micro font-normal text-slate-500">{readOnly ? "Nobody has replied to this pin." : "Start the conversation below."}</p>
            </div>
          ) : (
            comments.map((comment) => {
              const name = comment.author?.name || comment.authorGuest?.name || "Unknown";
              const isMine = comment.author?._id === user?.id;
              const authorColor = getAvatarColor(comment.author?._id || name);
              return (
                <div key={comment._id} className="kr-c">
                  <div className={`flex h-[26px] w-[26px] items-center justify-center rounded-full ${authorColor.bg} ${authorColor.text} text-micro`}>
                    {(name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="hd">
                      <b>{name}</b>
                      {!comment.author && comment.authorGuest?.name && comment.authorGuest.name !== "Deleted user" && (
                        <span className="shrink-0 rounded bg-slate-100 px-1 text-micro text-slate-500">Guest</span>
                      )}
                      <small title={formatFullTimestamp(comment.createdAt)}>{formatDateTime(comment.createdAt)}</small>
                      {isMine && (
                        confirmDeleteComment === comment._id ? (
                          <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => {
                                handleDelete(comment._id);
                                setConfirmDeleteComment(null);
                              }}
                              className="inline-flex h-6 items-center rounded-md bg-red-600 px-2 text-caption font-medium text-white hover:bg-red-700"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteComment(null)}
                              className="inline-flex h-6 items-center rounded-md bg-gray-100 px-2 text-caption font-medium text-slate-600 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          editingComment !== comment._id && (
                            <span className="acts">
                              <button
                                onClick={() => {
                                  setEditingComment(comment._id);
                                  setEditBody(stripHtmlForEdit(comment.body));
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-gray-100 hover:text-slate-600"
                                title="Edit comment"
                                aria-label="Edit comment"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteComment(comment._id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
                                title="Delete comment"
                                aria-label="Delete comment"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </span>
                          )
                        )
                      )}
                    </div>
                    {editingComment === comment._id ? (
                      <div className="mt-1">
                        <MentionInput
                          ref={editMentionRef}
                          value={editBody}
                          onChange={setEditBody}
                          members={members}
                          placeholder="Edit comment... (@ to mention)"
                          multiline={true}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-body focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingComment(null);
                              setEditBody("");
                            }}
                            className="inline-flex h-8 items-center rounded-lg px-3 text-label text-slate-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEdit(comment._id)}
                            disabled={!editBody.trim()}
                            className="inline-flex h-8 items-center rounded-lg bg-blue-600 px-3 text-label text-white hover:bg-blue-700 disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="body">{renderCommentBody(comment.body)}</div>
                    )}
                    {comment.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {comment.attachments.map((att, i) => (
                          <AttachmentItem key={i} attachment={att} onImageClick={(src) => setLightbox({ src })} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Bottom of the panel: composer, screenshot, technical details */}
      <div className="kr-dfoot">
        {/* Composer */}
        {readOnly ? (
          <p className="kr-ro">You can view this project but not comment.</p>
        ) : (
          <form onSubmit={handleSubmit} className="kr-composer">
            <MentionInput
              ref={mentionRef}
              value={body}
              onChange={setBody}
              members={members}
              placeholder="Write a comment… (@ to mention)"
              multiline={true}
              rows={2}
              disabled={loading}
              className="block w-full resize-none border-0 bg-transparent p-0 text-ui text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0"
            />
            {files.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {files.map((f, i) => (
                  <AttachmentChip key={i} file={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}
            <div className="row">
              <label className={`${iconBtn} -ml-1.5 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-600`} title="Attach files">
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_ATTACHMENT_TYPES}
                  className="hidden"
                  onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)])}
                />
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <span className="sr-only">Attach files</span>
              </label>
              <button
                type="submit"
                disabled={loading || !body.trim()}
                className="kc-btn pri disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Sending…" : "Comment"}
              </button>
            </div>
          </form>
        )}

        {/* Screenshot */}
        {pin.screenshot?.path ? (
          <>
            <div className="kr-sec-l">Screenshot</div>
            <button type="button" className="kr-row" onClick={() => setLightbox({ src: fileUrl(pin.screenshot.path), pin })}>
              <span className="th"><img src={fileUrl(pin.screenshot.path)} alt="" /></span>
              <span className="truncate">View screenshot</span>
              <span className="sp" />
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </>
        ) : (pin?.pageUrl && !pin.pageUrl.startsWith('doc:') ? (
          <>
            <div className="kr-sec-l">Screenshot</div>
            <div className="kr-row muted"><span>Not available</span></div>
          </>
        ) : null)}

        {/* Technical reproduction details */}
        <div className="kr-tech">
          <TechnicalDetails
            context={pin.context}
            pageUrl={pin.pageUrl}
            deviceMode={pin.deviceMode}
          />
        </div>
      </div>

      {/* Prev / Next */}
      {pins.length > 1 && (
        <div className="kr-pager">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => hasPrev && onNavigate(pins[currentIndex - 1])}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <span className="of">{currentIndex + 1} of {pins.length}</span>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => hasNext && onNavigate(pins[currentIndex + 1])}
          >
            Next
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Lightbox — portaled to body to escape transform context */}
      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
            onClick={() => {
              setLightbox(null);
              setLightboxExpanded(false);
            }}
          >
            {/* Toolbar */}
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleDownload(lightbox.src)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
                title="Download"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleCopy(lightbox.src)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
                title="Copy to clipboard"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setLightboxExpanded((prev) => !prev)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
                title={lightboxExpanded ? "Shrink" : "Expand"}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  {lightboxExpanded ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                    />
                  )}
                </svg>
              </button>
              <button
                onClick={() => {
                  setLightbox(null);
                  setLightboxExpanded(false);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors backdrop-blur-sm"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div
              className="relative inline-flex"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.src}
                alt=""
                className={`rounded-lg transition-all duration-200 ${lightboxExpanded ? "max-w-[98vw] max-h-[96vh]" : "max-w-[90vw] max-h-[90vh]"}`}
              />
              {lightbox.pin?.viewportXPercent != null &&
                lightbox.pin?.viewportYPercent != null && (
                  <div
                    className="absolute w-5 h-5 rounded-full bg-blue-600 border-[3px] border-white shadow-lg"
                    style={{
                      left: `${lightbox.pin.viewportXPercent}%`,
                      top: `${lightbox.pin.viewportYPercent}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                )}
            </div>
            {/* Copy toast */}
            {copyToast && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-lg shadow-lg text-body-sm font-medium text-slate-900">
                Copied to clipboard
              </div>
            )}
          </div>,
          document.body,
        )}
      {/* Copy toast (outside lightbox) */}
      {copyToast &&
        !lightbox &&
        createPortal(
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-white rounded-lg shadow-lg text-body-sm font-medium text-slate-900">
            Copied to clipboard
          </div>,
          document.body,
        )}
    </div>
  );
}
