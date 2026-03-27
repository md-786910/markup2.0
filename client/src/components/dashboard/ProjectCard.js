import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PROJECT_STATUSES } from "../../utils/projectConstants";

const API_BASE = (process.env.REACT_APP_BASE_URL || "http://localhost:5000/api").replace(/\/api$/, "");

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

const avatarColors = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
];

function getAvatarColor(name) {
  const hash = (name || "")
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}


function getStatusInfo(status) {
  return (
    PROJECT_STATUSES.find((s) => s.value === status) || PROJECT_STATUSES[0]
  );
}

export default function ProjectCard({
  project,
  isAdmin,
  userId,
  confirmDelete,
  onEdit,
  onArchive,
  onDelete,
  onConfirmDelete,
  onManageMembers,
  onStatusChange,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      setStatusOpen(false);
      return;
    }
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isOwner = project.owner?._id === userId || project.owner === userId;
  const canManage = isAdmin || isOwner;
  const members = project.members || [];
  const isDocProject = project.projectType === 'document';
  const domain = isDocProject
    ? (project.documents?.[0]?.mimetype === 'application/pdf' ? 'PDF Document' : 'Image')
    : getDomain(project.websiteUrl);
  const statusInfo = getStatusInfo(project.projectStatus);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 group relative">
      {/* Three-dot menu — positioned on card root to avoid overflow clipping */}
      {canManage && (
        <div ref={menuRef} className="absolute top-2 right-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
              setStatusOpen(false);
            }}
            className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white shadow-sm border border-gray-200/60 opacity-0 group-hover:opacity-100 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 animate-scale-in">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit(project);
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
              {/* <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(`/project/${project._id}/members`); }}
                className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Members
              </button> */}

              <div className="border-t border-gray-100 my-1" />

              {/* Status submenu */}
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusOpen(!statusOpen);
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${statusInfo.dot}`}
                    />
                    Status
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${statusOpen ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                {statusOpen && (
                  <div className="mx-2 mb-1 bg-gray-50 rounded-lg py-1 border border-gray-100">
                    {PROJECT_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          setStatusOpen(false);
                          if (onStatusChange) onStatusChange(project, s.value);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-white flex items-center gap-2 transition-colors rounded"
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${s.dot} shrink-0`}
                        />
                        <span className="flex-1">{s.label}</span>
                        {(project.projectStatus || "not_started") ===
                          s.value && (
                          <svg
                            className="w-3.5 h-3.5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onArchive(project);
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                {project.status === "active" ? "Archive" : "Unarchive"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onConfirmDelete(project._id);
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Thumbnail area */}
      <div
        onClick={() => navigate(`/project/${project._id}`)}
        className="cursor-pointer"
      >
        <div className="h-40 bg-gray-50 border-b border-gray-100 relative rounded-t-xl overflow-hidden">
          {isDocProject ? (
            /* Document thumbnail */
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              {project.documents?.[0]?.mimetype?.startsWith('image/') ? (
                <img
                  src={`${API_BASE}/${project.documents[0].path}`}
                  alt={project.documents[0].originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-xs font-medium">{project.documents[0]?.originalName}</span>
                  <span className="text-[10px]">{project.documents[0]?.pageCount || 1} page{(project.documents[0]?.pageCount || 1) > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          ) : (
            /* Live iframe preview */
            <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
              <iframe
                src={`${API_BASE}/api/proxy?url=${encodeURIComponent(project.websiteUrl)}&projectId=${project._id}`}
                title={project.name}
                loading="lazy"
                sandbox="allow-same-origin"
                style={{
                  width: '1440px',
                  height: '900px',
                  transform: 'scale(0.22)',
                  transformOrigin: 'top left',
                  border: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
          {/* Gradient overlay for clean bottom edge */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />

          {/* Status badges */}
          <div className="absolute top-2 left-2 flex gap-1.5 z-10">
            {project.status === "archived" && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-900/70 text-white backdrop-blur-sm">
                Archived
              </span>
            )}
            {project.projectStatus &&
              project.projectStatus !== "not_started" && (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${statusInfo.badge}`}
                >
                  {statusInfo.label}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div
        onClick={() => navigate(`/project/${project._id}`)}
        className="p-4 cursor-pointer"
      >
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1 mb-1 pr-6">
          {project.name}
        </h3>

        <p className="text-xs text-gray-400 truncate mb-3">
          {domain} · Updated {timeAgo(project.updatedAt || project.createdAt)}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex -space-x-1.5">
              {members.slice(0, 4).map((m) => {
                const color = getAvatarColor(m.name || m.email);
                return (
                  <div
                    key={m._id}
                    title={m.name || m.email}
                    className={`w-6 h-6 rounded-full ${color.bg} ${color.text} border-2 border-white flex items-center justify-center text-[9px] font-bold`}
                  >
                    {(m.name || m.email || "?")[0].toUpperCase()}
                  </div>
                );
              })}
              {members.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 border-2 border-white flex items-center justify-center text-[9px] font-medium">
                  +{members.length - 4}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex items-center gap-1" title="Tasks">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span className="text-[11px]">{project.pinCount || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Comments">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="text-[11px]">{project.commentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
