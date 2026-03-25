import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}


const avatarColors = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

function getAvatarColor(name) {
  const hash = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
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
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const isOwner = project.owner?._id === userId || project.owner === userId;
  const canManage = isAdmin || isOwner;
  const members = project.members || [];
  const domain = getDomain(project.websiteUrl);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 group overflow-hidden">
      {/* Thumbnail area */}
      <div
        onClick={() => navigate(`/project/${project._id}`)}
        className="relative cursor-pointer"
      >
        <div className="h-32 bg-gray-50 border-b border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Browser chrome mockup */}
          <div className="w-[80%] bg-white rounded-t-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border-b border-gray-100">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 mx-1.5">
                <div className="bg-white rounded px-2 py-0.5 text-[8px] text-gray-400 truncate border border-gray-100">
                  {domain}
                </div>
              </div>
            </div>
            <div className="px-2.5 py-2 space-y-1.5">
              <div className="h-1.5 bg-gray-100 rounded w-3/4"></div>
              <div className="h-1.5 bg-gray-100 rounded w-1/2"></div>
              <div className="h-1.5 bg-gray-50 rounded w-5/6"></div>
              <div className="h-1.5 bg-gray-50 rounded w-2/3"></div>
            </div>
          </div>

          {/* Status badge overlay */}
          {project.status === 'archived' && (
            <div className="absolute top-2.5 left-2.5">
              <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-gray-900/70 text-white backdrop-blur-sm">
                Archived
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div
        onClick={() => navigate(`/project/${project._id}`)}
        className="p-4 cursor-pointer"
      >
        {/* Top row: name + menu */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug pr-2 line-clamp-1">
            {project.name}
          </h3>
          {canManage && (
            <div ref={menuRef} className="relative shrink-0 -mt-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-8 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-10 animate-scale-in">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(project); }}
                    className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(`/project/${project._id}/members`); }}
                    className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Members
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(project); }}
                    className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {project.status === 'active' ? 'Archive' : 'Unarchive'}
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onConfirmDelete(project._id); }}
                    className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* URL + Updated */}
        <p className="text-xs text-gray-400 truncate mb-2">
          {domain} · Updated {timeAgo(project.updatedAt || project.createdAt)}
        </p>

        {/* Bottom row: avatars + meta */}
        <div className="flex items-center justify-between">
          {/* Member avatars */}
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
                    {(m.name || m.email || '?')[0].toUpperCase()}
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

          {/* Pin/comment counts */}
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex items-center gap-1" title="Tasks">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-[11px]">{project.pinCount || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Comments">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-[11px]">{project.commentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
