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

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group">
      {/* Card body — click to open */}
      <div
        onClick={() => navigate(`/project/${project._id}`)}
        className="p-5 cursor-pointer"
      >
        {/* Top row: name + menu */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 leading-tight pr-2">
            {project.name}
          </h3>
          {canManage && (
            <div ref={menuRef} className="relative shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-8 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(project); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(`/project/${project._id}/members`); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Members
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(project); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {project.status === 'active' ? 'Archive' : 'Unarchive'}
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onConfirmDelete(project._id); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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

        {/* URL */}
        <p className="text-sm text-gray-500 truncate mb-4">
          <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {project.websiteUrl}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          {/* Member avatars */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m) => (
                <div
                  key={m._id}
                  title={m.name || m.email}
                  className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 border-2 border-white flex items-center justify-center text-[10px] font-bold"
                >
                  {(m.name || m.email || '?')[0].toUpperCase()}
                </div>
              ))}
              {members.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 border-2 border-white flex items-center justify-center text-[10px] font-medium">
                  +{members.length - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 ml-2">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">{timeAgo(project.createdAt)}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              project.status === 'active'
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {project.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
