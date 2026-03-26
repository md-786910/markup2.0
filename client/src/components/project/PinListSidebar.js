import { useState, useEffect, useMemo, useRef } from 'react';
import CommentSidebar from './CommentSidebar';
import { useAuth } from '../../hooks/useAuth';

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

function getPagePath(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/' ? '/' : parsed.pathname;
  } catch {
    return url;
  }
}

function getGroupLabel(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return parsed.hostname + path;
  } catch {
    return url;
  }
}

function getReadPins(userId) {
  if (!userId) return new Set();
  try {
    const stored = localStorage.getItem(`markup_read_pins_${userId}`);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch { return new Set(); }
}

function markPinRead(pinId, userId) {
  if (!userId) return;
  const readPins = getReadPins(userId);
  readPins.add(pinId);
  localStorage.setItem(`markup_read_pins_${userId}`, JSON.stringify([...readPins]));
}

function getReadComments(userId) {
  if (!userId) return {};
  try {
    const stored = localStorage.getItem(`markup_read_comments_${userId}`);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function markCommentsRead(pinId, userId) {
  if (!userId) return;
  const map = getReadComments(userId);
  map[pinId] = Date.now();
  localStorage.setItem(`markup_read_comments_${userId}`, JSON.stringify(map));
}

// Renders comment body with highlighted @mentions (supports both HTML and plain text)
function renderCommentBody(body) {
  if (!body) return null;
  // If body contains HTML tags, render as rich HTML
  if (/<[a-z][\s\S]*>/i.test(body)) {
    // Strip tags for preview text, keep it short
    const text = body.replace(/<[^>]*>/g, '').trim();
    if (!text) return null;
    return <span className="comment-rich-content" dangerouslySetInnerHTML={{ __html: body }} />;
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

const TABS = [
  { key: 'open', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

export default function PinListSidebar({
  pins,
  selectedPinId,
  selectedPin,
  onPinClick,
  onClosePin,
  onDeletePin,
  onNavigatePin,
  onStatusChange,
  onEvent,
  members = [],
  projectId,
}) {
  const { user } = useAuth();
  const [readPins, setReadPins] = useState(() => getReadPins(user?.id));
  const [readComments, setReadComments] = useState(() => getReadComments(user?.id));
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState('page'); // 'page' | 'pin_order' | 'latest_activity'
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOption, setFilterOption] = useState(null); // null | 'on_this_page' | 'mentions'
  const [filterOpen, setFilterOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const sortRef = useRef(null);
  const filterRef = useRef(null);

  const handleCardClick = (pin) => {
    onPinClick(pin);
    setConfirmDelete(null);
    markPinRead(pin._id, user?.id);
    setReadPins((prev) => new Set([...prev, pin._id]));
    markCommentsRead(pin._id, user?.id);
    setReadComments((prev) => ({ ...prev, [pin._id]: Date.now() }));
  };

  const toggleGroup = (path) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen]);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // Close pin action menu on outside click
  useEffect(() => {
    if (!confirmDelete) return;
    const handler = (e) => {
      if (!e.target.closest('[data-pin-menu]')) setConfirmDelete(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmDelete]);

  // Filter, search, and sort
  const filteredPins = useMemo(() => {
    let result = pins;

    // Status tab filter
    if (filterStatus === 'open') result = result.filter((p) => p.status === 'pending');
    else if (filterStatus === 'resolved') result = result.filter((p) => p.status === 'resolved');

    // Filter option
    if (filterOption === 'on_this_page') {
      // Show only pins that share the same page path as the first pin
      // (mirrors "On this page" — filter to the most common or first page)
      const pages = [...new Set(result.map((p) => getPagePath(p.pageUrl)))];
      if (pages.length > 0) result = result.filter((p) => getPagePath(p.pageUrl) === pages[0]);
    } else if (filterOption === 'mentions') {
      // Show only pins whose comments mention the viewer — for now show pins with any mentions array
      result = result.filter((p) => p.commentsCount > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        (p.firstComment?.body || '').toLowerCase().includes(q) ||
        (p.latestComment?.body || '').toLowerCase().includes(q) ||
        (p.createdBy?.name || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result];
    if (sortBy === 'pin_order') {
      result.sort((a, b) => (a.pinNumber || 0) - (b.pinNumber || 0));
    } else if (sortBy === 'latest_activity') {
      result.sort((a, b) => new Date(b.latestComment?.createdAt || b.createdAt) - new Date(a.latestComment?.createdAt || a.createdAt));
    }

    return result;
  }, [pins, filterStatus, searchQuery, sortBy, filterOption]);

  // Filter counts
  const openCount = pins.filter((p) => p.status === 'pending').length;
  const resolvedCount = pins.filter((p) => p.status === 'resolved').length;

  // Group by page (only when sortBy === 'page'; otherwise flat list)
  const grouped = {};
  filteredPins.forEach((pin) => {
    const path = sortBy === 'page' ? getPagePath(pin.pageUrl) : '__all__';
    if (!grouped[path]) grouped[path] = [];
    grouped[path].push(pin);
  });

  const isSelected = (pinId) => selectedPinId === pinId;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden relative">
      {/* Detail view — slides in from right */}
      <div
        className="absolute inset-0 z-10 transition-transform duration-300 ease-in-out"
        style={{
          transform: selectedPin ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: selectedPin ? 'auto' : 'none',
        }}
      >
        {selectedPin && (
          <CommentSidebar
            pin={selectedPin}
            pins={filteredPins}
            onBack={onClosePin}
            onClose={onClosePin}
            onStatusChange={onStatusChange}
            onDelete={onDeletePin}
            onNavigate={onNavigatePin}
            onEvent={onEvent}
            members={members}
          />
        )}
      </div>

      {/* Pin list view */}
      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        {/* Tabs row + icon buttons */}
        <div className="flex items-center">
          {/* Tabs */}
          <div className="flex items-center gap-4 flex-1">
            {TABS.map((t) => {
              const count = t.key === 'open' ? openCount : resolvedCount;
              const isActive = filterStatus === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setFilterStatus(t.key)}
                  className={`text-[13px] pb-1 transition-all ${
                    isActive
                      ? 'font-semibold text-gray-900 border-b-2 border-gray-800'
                      : 'font-medium text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
                  }`}
                >
                  {count} {t.label}
                </button>
              );
            })}
          </div>

          {/* Icon buttons */}
          <div className="flex items-center gap-1">
            {/* Sort dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen((v) => !v)}
                className={`p-1.5 rounded transition-colors ${sortOpen ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title="Sort"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {[
                    { key: 'page', label: 'Page' },
                    { key: 'pin_order', label: 'Pin order' },
                    { key: 'latest_activity', label: 'Latest activity' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        sortBy === opt.key ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {sortBy === opt.key && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-[13px] ${sortBy === opt.key ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`p-1.5 rounded transition-colors ${filterOpen || filterOption ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title="Filter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-7 8.5V19l-4-2v-4.5L3 4z" />
                </svg>
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {[
                    { key: 'on_this_page', label: 'On this page' },
                    { key: 'mentions', label: 'Mentions' },
                    { key: 'priority', label: 'Priority', hasArrow: true },
                  ].map((opt) => {
                    const isActive = filterOption === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => {
                          if (!opt.hasArrow) {
                            setFilterOption(isActive ? null : opt.key);
                            setFilterOpen(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isActive ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        }`}>
                          {isActive && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-[13px] flex-1 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {opt.label}
                        </span>
                        {opt.hasArrow && (
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Search toggle */}
            <button
              onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearchQuery(''); }}
              className={`p-1.5 rounded transition-colors ${searchOpen ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title="Search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar — only shown when searchOpen */}
        {searchOpen && (
          <div className="relative mt-2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments..."
              className="w-full text-[12px] pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white placeholder-gray-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {filteredPins.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">
              {searchQuery
                ? 'No matching comments'
                : filterOption === 'mentions'
                ? 'No mentions found'
                : filterOption === 'on_this_page'
                ? 'No pins on this page'
                : filterStatus === 'resolved'
                ? 'No resolved comments'
                : filterStatus === 'open'
                ? 'No open comments'
                : 'No comments yet'}
            </p>
            {!searchQuery && filterStatus === 'open' && pins.length === 0 && (
              <p className="text-xs text-gray-300 mt-1">Click Pin Mode to start</p>
            )}
          </div>
        )}

        {Object.entries(grouped).map(([path, pagePins]) => {
          const isGroupCollapsed = collapsedGroups.has(path);
          return (
            <div key={path}>
              {/* Page section header — only shown when grouping by page */}
              {sortBy === 'page' && (
                <button
                  onClick={() => toggleGroup(path)}
                  className="w-full px-4 py-2 flex items-center gap-2 bg-gray-50/60 hover:bg-gray-100/60 transition-colors text-left"
                >
                  <span className="text-[10px] font-medium text-gray-400 truncate flex-1" title={path}>
                    {getGroupLabel(pagePins[0]?.pageUrl || path)}
                  </span>
                  <span className="text-[10px] text-gray-300 shrink-0">{pagePins.length}</span>
                  <svg
                    className={`w-3 h-3 text-gray-300 shrink-0 transition-transform duration-200 ${isGroupCollapsed ? '-rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}

              {/* Pin cards (hidden when group is collapsed in page mode) */}
              {(sortBy !== 'page' || !isGroupCollapsed) && pagePins.map((pin, idx) => (
                <div key={pin._id}>
                  {/* Card */}
                  <div
                    onClick={() => handleCardClick(pin)}
                    className={`cursor-pointer transition-colors ${
                      isSelected(pin._id)
                        ? 'bg-gray-50'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="px-4 pt-4 pb-3">
                      {/* Top row: pin badge + action icons */}
                      <div className="flex items-start justify-between mb-2">
                        {/* Pin number badge — large filled circle */}
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 ${
                          pin.status === 'resolved' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}>
                          {pin.pinNumber || (idx + 1)}
                        </span>

                        {/* Action icons: ... menu + resolve checkmark */}
                        <div className="relative flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Three-dot menu → dropdown */}
                          <div className="relative" data-pin-menu>
                            <button
                              onClick={() => setConfirmDelete((prev) => prev === pin._id ? null : pin._id)}
                              className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-200 transition-colors"
                              title="More options"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                              </svg>
                            </button>
                            {confirmDelete === pin._id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}/project/${projectId}?pin=${pin._id}`;
                                    navigator.clipboard.writeText(link);
                                    setConfirmDelete(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  Copy link
                                </button>
                                <button
                                  onClick={() => {
                                    onPinClick(pin);
                                    setConfirmDelete(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  Get info
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Resolve toggle */}
                          <button
                            onClick={() => onStatusChange(pin._id, pin.status === 'resolved' ? 'pending' : 'resolved')}
                            className={`p-1 rounded transition-colors ${
                              pin.status === 'resolved'
                                ? 'text-emerald-500 hover:bg-emerald-50'
                                : 'text-gray-300 hover:text-emerald-500 hover:bg-emerald-50'
                            }`}
                            title={pin.status === 'resolved' ? 'Reopen' : 'Resolve'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9"/>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-5"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Author + New badge + Unread comments badge */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {pin.createdBy?.name || 'Unknown'}
                        </span>
                        {!readPins.has(pin._id) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                            New
                          </span>
                        )}
                        {readPins.has(pin._id) && pin.latestComment && (
                          (() => {
                            const lastRead = readComments[pin._id] || 0;
                            const commentTime = new Date(pin.latestComment.createdAt).getTime();
                            return commentTime > lastRead ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                                Unread
                              </span>
                            ) : null;
                          })()
                        )}
                      </div>

                      {/* Time */}
                      <p className="text-[11px] text-gray-400 mb-1.5">{timeAgo(pin.createdAt)}</p>

                      {/* Comment preview — first comment as title */}
                      {pin.firstComment ? (
                        <p className="text-[13px] text-gray-700 leading-snug line-clamp-2">
                          {renderCommentBody(pin.firstComment.body)}
                        </p>
                      ) : (
                        <p className="text-[12px] text-gray-300 italic">No comments</p>
                      )}

                      {/* Comment count indicator */}
                      {pin.commentsCount > 1 && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {pin.commentsCount - 1} {pin.commentsCount - 1 === 1 ? 'reply' : 'replies'}
                        </p>
                      )}

                    </div>
                  </div>

                  {/* Separator between cards */}
                  <div className="border-b border-gray-100 mx-4"></div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      </div>
    </div>
  );
}
