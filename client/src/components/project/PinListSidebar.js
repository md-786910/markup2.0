import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import CommentSidebar from './CommentSidebar';
import { useAuth } from '../../hooks/useAuth';
import SidebarTabs from './SidebarTabs';
import renderCommentBody from '../../utils/renderCommentBody';
import { formatTimestamp, formatFullTimestamp } from '../../utils/formatTimestamp';
import { Icon, IconButton } from '../kc';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatTimestamp(date);
}


function getPagePath(url) {
  if (url && url.startsWith('doc:')) {
    const parts = url.split(':');
    return `Page ${parts[3] || '1'}`;
  }
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/' ? '/' : parsed.pathname;
  } catch {
    return url;
  }
}

function getGroupLabel(url) {
  if (url && url.startsWith('doc:')) {
    const parts = url.split(':');
    return `Page ${parts[3] || '1'}`;
  }
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


import { getAvatarColor, AVATAR_COLORS } from '../../utils/avatarColors';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const TABS = [
  { key: 'open', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_META = {
  open: { label: 'Open', color: 'var(--status-open)' },
  in_progress: { label: 'In Progress', color: 'var(--status-progress)' },
  in_review: { label: 'In Review', color: 'var(--status-review)' },
  resolved: { label: 'Resolved', color: 'var(--status-resolved)' },
};

const PRIORITY_META = {
  urgent: { label: 'Urgent', color: 'var(--danger-500, #ef4444)' },
  high: { label: 'High', color: 'var(--warning-500, #f59e0b)' },
  normal: { label: 'Normal', color: 'var(--slate-500, #64748b)' },
  low: { label: 'Low', color: 'var(--slate-400, #94a3b8)' },
};


export default function PinListSidebar({
  pins,
  selectedPinId,
  selectedPin,
  onPinClick,
  onClosePin,
  onDeletePin,
  readOnly = false,
  onNavigatePin,
  onStatusChange,
  onPinUpdate,
  onEvent,
  resyncKey,
  members = [],
  projectId,
  sidebarTab = 'pins',
  onTabChange,
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
  const [filterOption, setFilterOption] = useState(null); // null | 'on_this_page' | 'mentions' | 'assignee'
  const [selectedMentionUser, setSelectedMentionUser] = useState(null); // null | member object
  const [selectedAssigneeUsers, setSelectedAssigneeUsers] = useState([]); // array of member objects
  const [filterOpen, setFilterOpen] = useState(false);
  const [mentionModalOpen, setMentionModalOpen] = useState(false);
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [assigneeMemberSearch, setAssigneeMemberSearch] = useState('');
  const [modalPos, setModalPos] = useState({ top: 0, left: 0 });
  const [assigneeModalPos, setAssigneeModalPos] = useState({ top: 0, left: 0 });
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const sortRef = useRef(null);
  const filterRef = useRef(null);
  const mentionBtnRef = useRef(null);
  const mentionModalRef = useRef(null);
  const assigneeBtnRef = useRef(null);
  const assigneeModalRef = useRef(null);

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

  // Position the portal modal dynamically next to the Mentions button
  useEffect(() => {
    if (mentionModalOpen && mentionBtnRef.current) {
      const rect = mentionBtnRef.current.getBoundingClientRect();
      setModalPos({
        top: Math.max(10, rect.top - 4),
        left: rect.right + 8,
      });
    }
  }, [mentionModalOpen]);

  // Position the portal modal dynamically next to the Assignee button
  useEffect(() => {
    if (assigneeModalOpen && assigneeBtnRef.current) {
      const rect = assigneeBtnRef.current.getBoundingClientRect();
      setAssigneeModalPos({
        top: Math.max(10, rect.top - 4),
        left: rect.right + 8,
      });
    }
  }, [assigneeModalOpen]);

  // Close filter dropdown & modals on outside click
  useEffect(() => {
    if (!filterOpen && !mentionModalOpen && !assigneeModalOpen) return;
    const handler = (e) => {
      const inFilter = filterRef.current && filterRef.current.contains(e.target);
      const inMentionModal = mentionModalRef.current && mentionModalRef.current.contains(e.target);
      const inAssigneeModal = assigneeModalRef.current && assigneeModalRef.current.contains(e.target);
      if (!inFilter && !inMentionModal && !inAssigneeModal) {
        setFilterOpen(false);
        setMentionModalOpen(false);
        setAssigneeModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen, mentionModalOpen, assigneeModalOpen]);

  // Close pin action menu on outside click
  useEffect(() => {
    if (!confirmDelete) return;
    const handler = (e) => {
      if (!e.target.closest('[data-pin-menu]')) setConfirmDelete(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmDelete]);

  // Filter members by memberSearch query
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  // Filter members by assigneeMemberSearch query
  const filteredAssigneeMembers = useMemo(() => {
    if (!assigneeMemberSearch.trim()) return members;
    const q = assigneeMemberSearch.toLowerCase();
    return members.filter((m) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  }, [members, assigneeMemberSearch]);

  // Filter, search, and sort
  const filteredPins = useMemo(() => {
    let result = pins;

    // Status tab filter
    if (filterStatus === 'open') result = result.filter((p) => p.status !== 'resolved');
    else if (filterStatus === 'resolved') result = result.filter((p) => p.status === 'resolved');

    // Filter option
    if (filterOption === 'on_this_page') {
      const pages = [...new Set(result.map((p) => getPagePath(p.pageUrl)))];
      if (pages.length > 0) result = result.filter((p) => getPagePath(p.pageUrl) === pages[0]);
    } else if (filterOption === 'mentions') {
      if (selectedMentionUser) {
        const targetId = (selectedMentionUser._id || selectedMentionUser).toString();
        const targetName = (selectedMentionUser.name || '').toLowerCase();
        result = result.filter((p) => {
          // Check aggregated mentionedUserIds from backend
          if (p.mentionedUserIds && p.mentionedUserIds.includes(targetId)) return true;
          // Check text in firstComment and latestComment
          const firstBody = (p.firstComment?.body || '').toLowerCase();
          const latestBody = (p.latestComment?.body || '').toLowerCase();
          if (firstBody.includes(targetId) || (targetName && firstBody.includes(`@${targetName}`))) return true;
          if (latestBody.includes(targetId) || (targetName && latestBody.includes(`@${targetName}`))) return true;
          return false;
        });
      } else {
        result = result.filter((p) => (p.mentionedUserIds && p.mentionedUserIds.length > 0) || p.commentsCount > 0);
      }
    } else if (filterOption === 'assignee') {
      if (selectedAssigneeUsers.length > 0) {
        const targetIds = selectedAssigneeUsers.map((u) => (u._id || u).toString());
        const targetNames = selectedAssigneeUsers.map((u) => (u.name || '').toLowerCase()).filter(Boolean);

        result = result.filter((p) => {
          // Check pin authorUserIds
          if (p.authorUserIds && p.authorUserIds.some((id) => targetIds.includes(id))) return true;

          // Check createdBy
          const createdById = (p.createdBy?._id || p.createdBy || '').toString();
          if (createdById && targetIds.includes(createdById)) return true;

          // Check firstComment author
          const firstAuthorId = (p.firstComment?.author?._id || p.firstComment?.author || '').toString();
          if (firstAuthorId && targetIds.includes(firstAuthorId)) return true;

          // Check latestComment author
          const latestAuthorId = (p.latestComment?.author?._id || p.latestComment?.author || '').toString();
          if (latestAuthorId && targetIds.includes(latestAuthorId)) return true;

          // Check author name match in comments
          const firstAuthorName = (p.firstComment?.author?.name || p.createdBy?.name || '').toLowerCase();
          const latestAuthorName = (p.latestComment?.author?.name || '').toLowerCase();
          if (targetNames.some((name) => firstAuthorName.includes(name) || latestAuthorName.includes(name))) return true;

          return false;
        });
      }
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
  }, [pins, filterStatus, searchQuery, sortBy, filterOption, selectedMentionUser, selectedAssigneeUsers]);

  // Check if any filter, non-default sort, or search query is currently active
  const hasActiveFilters = Boolean(
    filterOption !== null ||
    selectedMentionUser !== null ||
    selectedAssigneeUsers.length > 0 ||
    sortBy !== 'page' ||
    searchQuery.trim() !== ''
  );

  // Clear all filters, sorting, and search
  const handleClearAllFilters = () => {
    setFilterOption(null);
    setSelectedMentionUser(null);
    setSelectedAssigneeUsers([]);
    setSortBy('page');
    setSearchQuery('');
    setSearchOpen(false);
    setFilterOpen(false);
    setSortOpen(false);
    setMentionModalOpen(false);
    setAssigneeModalOpen(false);
  };

  // Filter counts
  const openCount = pins.filter((p) => p.status !== 'resolved').length;
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
    <aside className="kr-panel h-full overflow-hidden relative" aria-label="Feedback">
      {/* Sidebar tab switcher */}
      {onTabChange && <SidebarTabs active={sidebarTab} onChange={onTabChange} count={openCount} />}

      {/* Detail view — slides in from right */}
      <div
        className="absolute inset-0 z-10 transition-transform duration-300 ease-in-out bg-white"
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
            onPinUpdate={onPinUpdate}
            onDelete={onDeletePin}
            onNavigate={onNavigatePin}
            onEvent={onEvent}
            resyncKey={resyncKey}
            members={members}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Pin list view */}
      <div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
        {/* Sub bar: Active | Resolved, then sort, filter, search */}
        <div className="kr-sub shrink-0">
          <button
            type="button"
            className={`st ${filterStatus === 'open' ? 'on' : ''}`}
            aria-pressed={filterStatus === 'open'}
            onClick={() => setFilterStatus('open')}
          >
            {openCount} Active
          </button>
          <button
            type="button"
            className={`st ${filterStatus === 'resolved' ? 'on' : ''}`}
            aria-pressed={filterStatus === 'resolved'}
            onClick={() => setFilterStatus('resolved')}
          >
            {resolvedCount} Resolved
          </button>
          <span style={{ flex: 1 }} />

          {/* Icon buttons: Sort, Filter, Search */}
          <div className="flex items-center gap-0.5">
            {/* Sort dropdown */}
            <div className="relative" ref={sortRef}>
              <IconButton
                icon="sort"
                label="Sort"
                active={sortOpen || sortBy !== 'page'}
                onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }}
              />

              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
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
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${sortBy === opt.key ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                        {sortBy === opt.key && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-body-sm ${sortBy === opt.key ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}

                  {/* Reset Sort */}
                  {sortBy !== 'page' && (
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { setSortBy('page'); setSortOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-caption text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset sort
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <IconButton
                icon="filter"
                label="Filter"
                active={filterOpen || !!filterOption}
                onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }}
              />

              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-visible">
                  {/* Option 1: On this page */}
                  <button
                    onClick={() => {
                      setFilterOption(filterOption === 'on_this_page' ? null : 'on_this_page');
                      setMentionModalOpen(false);
                      setAssigneeModalOpen(false);
                      setFilterOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      filterOption === 'on_this_page' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {filterOption === 'on_this_page' && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-[13px] flex-1 ${filterOption === 'on_this_page' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      On this page
                    </span>
                  </button>

                  {/* Option 2: Mentions (with user selection flyout modal) */}
                  <div>
                    <button
                      ref={mentionBtnRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMentionModalOpen((v) => !v);
                        setAssigneeModalOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                        filterOption === 'mentions' ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        filterOption === 'mentions' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {filterOption === 'mentions' && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-[13px] flex-1 truncate ${filterOption === 'mentions' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                        {selectedMentionUser ? `Mentions: ${selectedMentionUser.name}` : 'Mentions'}
                      </span>
                      <svg className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${mentionModalOpen ? 'rotate-90 text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Mentions User Flyout Modal — Portaled to body */}
                    {mentionModalOpen && createPortal(
                      <div
                        ref={mentionModalRef}
                        className="fixed w-64 bg-white border border-slate-200 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.18)] z-[99999] overflow-hidden flex flex-col"
                        style={{
                          top: `${modalPos.top}px`,
                          left: `${modalPos.left}px`,
                          maxHeight: '350px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                          <span className="text-ui-label font-semibold text-slate-600">Project members</span>
                          {selectedMentionUser && (
                            <button
                              onClick={() => {
                                setSelectedMentionUser(null);
                                setFilterOption(null);
                                setMentionModalOpen(false);
                                setFilterOpen(false);
                              }}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {members.length > 3 && (
                          <div className="px-3 pt-2 pb-1 bg-white border-b border-slate-100">
                            <input
                              type="text"
                              value={memberSearch}
                              onChange={(e) => setMemberSearch(e.target.value)}
                              placeholder="Search user..."
                              className="w-full text-[12.5px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            />
                          </div>
                        )}

                        <div className="overflow-y-auto max-h-56 py-1">
                          {filteredMembers.length === 0 ? (
                            <div className="p-4 text-center text-caption text-gray-400">No project members found</div>
                          ) : (
                            filteredMembers.map((member) => {
                              const isUserSelected = selectedMentionUser && (selectedMentionUser._id === member._id);
                              const avatarColor = getAvatarColor(member._id);
                              return (
                                <button
                                  key={member._id}
                                  onClick={() => {
                                    if (isUserSelected) {
                                      setSelectedMentionUser(null);
                                      setFilterOption(null);
                                    } else {
                                      setSelectedMentionUser(member);
                                      setFilterOption('mentions');
                                    }
                                    setMentionModalOpen(false);
                                    setFilterOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-gray-50 transition-colors ${
                                    isUserSelected ? 'bg-blue-50/70' : ''
                                  }`}
                                >
                                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-caption font-semibold shrink-0 ${avatarColor.bg} ${avatarColor.text}`}>
                                    {getInitials(member.name)}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-caption truncate ${isUserSelected ? 'font-semibold text-blue-900' : 'text-gray-800'}`}>
                                      {member.name}
                                    </p>
                                    {member.email && (
                                      <p className="text-caption text-gray-400 truncate">{member.email}</p>
                                    )}
                                  </div>
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                    isUserSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                                  }`}>
                                    {isUserSelected && (
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>

                  {/* Option 3: Assignee */}
                  <div>
                    <button
                      ref={assigneeBtnRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssigneeModalOpen((v) => !v);
                        setMentionModalOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                        filterOption === 'assignee' ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        filterOption === 'assignee' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {filterOption === 'assignee' && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-body-sm flex-1 truncate ${filterOption === 'assignee' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {selectedAssigneeUsers.length > 0
                          ? `Author (${selectedAssigneeUsers.length})`
                          : 'Author'}
                      </span>
                      <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${assigneeModalOpen ? 'rotate-90 text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Assignee User Flyout Modal — Portaled to body */}
                    {assigneeModalOpen && createPortal(
                      <div
                        ref={assigneeModalRef}
                        className="fixed w-64 bg-white border border-slate-200 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.18)] z-[99999] overflow-hidden flex flex-col"
                        style={{
                          top: `${assigneeModalPos.top}px`,
                          left: `${assigneeModalPos.left}px`,
                          maxHeight: '350px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                          <span className="text-ui-label font-semibold text-slate-600">
                            Assignee (${selectedAssigneeUsers.length}/${members.length})
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedAssigneeUsers.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedAssigneeUsers([]);
                                  setFilterOption(null);
                                }}
                                className="text-caption text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Clear
                              </button>
                            )}
                            {selectedAssigneeUsers.length < members.length && (
                              <button
                                onClick={() => {
                                  setSelectedAssigneeUsers([...members]);
                                  setFilterOption('assignee');
                                }}
                                className="text-caption text-gray-500 hover:text-gray-800 font-medium"
                              >
                                Select All
                              </button>
                            )}
                          </div>
                        </div>

                        {members.length > 3 && (
                          <div className="px-3 pt-2 pb-1 bg-white border-b border-gray-50">
                            <input
                              type="text"
                              value={assigneeMemberSearch}
                              onChange={(e) => setAssigneeMemberSearch(e.target.value)}
                              placeholder="Search user..."
                              className="w-full text-body px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            />
                          </div>
                        )}

                        <div className="overflow-y-auto max-h-56 py-1">
                          {filteredAssigneeMembers.length === 0 ? (
                            <div className="p-4 text-center text-caption text-gray-400">No project members found</div>
                          ) : (
                            filteredAssigneeMembers.map((member) => {
                              const isUserSelected = selectedAssigneeUsers.some((u) => u._id === member._id);
                              const avatarColor = getAvatarColor(member._id);
                              return (
                                <button
                                  key={member._id}
                                  onClick={() => {
                                    let updated;
                                    if (isUserSelected) {
                                      updated = selectedAssigneeUsers.filter((u) => u._id !== member._id);
                                    } else {
                                      updated = [...selectedAssigneeUsers, member];
                                    }
                                    setSelectedAssigneeUsers(updated);
                                    setFilterOption(updated.length > 0 ? 'assignee' : null);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-gray-50 transition-colors ${
                                    isUserSelected ? 'bg-blue-50/70' : ''
                                  }`}
                                >
                                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-caption font-semibold shrink-0 ${avatarColor.bg} ${avatarColor.text}`}>
                                    {getInitials(member.name)}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-caption truncate ${isUserSelected ? 'font-semibold text-blue-900' : 'text-gray-800'}`}>
                                      {member.name}
                                    </p>
                                    {member.email && (
                                      <p className="text-caption text-gray-400 truncate">{member.email}</p>
                                    )}
                                  </div>
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                    isUserSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                                  }`}>
                                    {isUserSelected && (
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>

                  {/* Clear All Filters Option inside dropdown */}
                  {hasActiveFilters && (
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleClearAllFilters}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-caption text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <IconButton
              icon="search"
              label="Search"
              active={searchOpen || !!searchQuery}
              aria-expanded={searchOpen || !!searchQuery}
              onClick={() => {
                if (searchOpen || searchQuery) { setSearchOpen(false); setSearchQuery(''); }
                else setSearchOpen(true);
              }}
            />
          </div>
        </div>

        {/* Search field, opened from the sub bar */}
        {(searchOpen || searchQuery) && (
          <label className="kr-search">
            <Icon name="search" size={14} />
            <input
              autoFocus
              placeholder="Search feedback"
              aria-label="Search feedback"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); } }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Clear search"
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </label>
        )}

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 mx-4 mt-2.5 bg-slate-50 border border-slate-200 rounded-lg text-caption animate-fadeIn shrink-0">
            <span className="text-gray-400 font-medium mr-0.5">Filtered:</span>
            {filterOption === 'on_this_page' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                On this page
                <button onClick={() => setFilterOption(null)} className="hover:text-blue-950 p-0.5" title="Remove filter">
                  <Icon name="x" size={10} />
                </button>
              </span>
            )}
            {filterOption === 'mentions' && selectedMentionUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                Mention: @{selectedMentionUser.name}
                <button onClick={() => { setSelectedMentionUser(null); setFilterOption(null); }} className="hover:text-purple-950 p-0.5" title="Remove filter">
                  <Icon name="x" size={10} />
                </button>
              </span>
            )}
            {filterOption === 'assignee' && selectedAssigneeUsers.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                Assignee: {selectedAssigneeUsers.map((u) => `@${u.name}`).join(', ')}
                <button onClick={() => { setSelectedAssigneeUsers([]); setFilterOption(null); }} className="hover:text-emerald-950 p-0.5" title="Remove filter">
                  <Icon name="x" size={10} />
                </button>
              </span>
            )}
            {sortBy !== 'page' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                Sort: {sortBy === 'pin_order' ? 'Pin order' : 'Latest activity'}
                <button onClick={() => setSortBy('page')} className="hover:text-amber-950 p-0.5" title="Reset sort">
                  <Icon name="x" size={10} />
                </button>
              </span>
            )}
            <button
              onClick={handleClearAllFilters}
              className="ml-auto text-caption text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
              title="Reset all filters and sorting"
            >
              Clear
            </button>
          </div>
        )}

        {/* Scrollable list */}
        <div className="kr-list">
          {filteredPins.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Icon name="chat" size={24} className="text-gray-300" />
              </div>
              <p className="text-body-sm font-medium text-gray-400">
                {searchQuery
                  ? 'No matching comments'
                  : filterOption === 'mentions'
                    ? (selectedMentionUser ? `No pins mentioning @${selectedMentionUser.name}` : 'No mentions found')
                    : filterOption === 'assignee'
                      ? (selectedAssigneeUsers.length > 0 ? `No comments created by ${selectedAssigneeUsers.map((u) => u.name).join(', ')}` : 'No comments by these people')
                    : filterOption === 'on_this_page'
                      ? 'No pins on this page'
                      : filterStatus === 'resolved'
                        ? 'No resolved comments'
                        : filterStatus === 'open'
                          ? 'No open comments'
                          : 'No comments yet'}
              </p>

              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-caption font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {Object.entries(grouped).map(([path, pagePins]) => {
            const isGroupCollapsed = collapsedGroups.has(path);
            return (
              <div key={path}>
                {/* Page group header: path and count */}
                {sortBy === 'page' && (
                  <div
                    onClick={() => toggleGroup(path)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(path); } }}
                    className={`kr-gh ${isGroupCollapsed ? 'closed' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={!isGroupCollapsed}
                  >
                    <span title={path}>{getGroupLabel(pagePins[0]?.pageUrl || path)}</span>
                    <span className="ct">
                      {pagePins.length}
                      <Icon name="down" size={13} />
                    </span>
                  </div>
                )}

                {(sortBy !== 'page' || !isGroupCollapsed) && pagePins.map((pin, idx) => {
                  const st = STATUS_META[pin.status] || STATUS_META.open;
                  const pr = PRIORITY_META[pin.priority] || PRIORITY_META.normal;
                  const commentText = pin.firstComment?.body || (pin.comments && pin.comments[0]?.body) || '';
                  const resolved = pin.status === 'resolved';
                  const replies = (pin.commentsCount || 0) - 1;

                  return (
                    <div
                      key={pin._id}
                      onClick={() => handleCardClick(pin)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) handleCardClick(pin); }}
                      role="button"
                      tabIndex={0}
                      aria-current={isSelected(pin._id) ? 'true' : undefined}
                      className={`kr-item ${isSelected(pin._id) ? 'on' : ''}`}
                    >
                      <span className="pin">
                        <span className={`kr-pin ${resolved ? 'ok' : ''}`}>
                          {resolved ? <Icon name="check" size={13} stroke={3} /> : (pin.pinNumber || (idx + 1))}
                        </span>
                      </span>

                      <span className="tools" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block" data-pin-menu>
                          <IconButton
                            icon="dots"
                            label="More"
                            onClick={() => setConfirmDelete((prev) => prev === pin._id ? null : pin._id)}
                          />
                          {confirmDelete === pin._id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  const link = `${window.location.origin}/project/${projectId}?pin=${pin._id}`;
                                  navigator.clipboard.writeText(link);
                                  setConfirmDelete(null);
                                }}
                                className="w-full px-4 py-2 text-left text-ui text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Copy link
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onPinClick(pin);
                                  setConfirmDelete(null);
                                }}
                                className="w-full px-4 py-2 text-left text-ui text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Open
                              </button>
                            </div>
                          )}
                        </div>

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(pin._id, resolved ? 'open' : 'resolved')}
                            className={`kr-resolve ${resolved ? 'done' : ''}`}
                            title={resolved ? 'Reopen' : 'Resolve'}
                            aria-label={resolved ? 'Reopen' : 'Resolve'}
                          >
                            <Icon name="check" size={10} stroke={2.5} />
                          </button>
                        )}
                      </span>

                      <span className="who">{pin.createdBy?.name || pin.createdByGuest?.name || 'Unknown'}</span>
                      <span className="when" title={formatFullTimestamp(pin.createdAt)}>{timeAgo(pin.createdAt)}</span>
                      <span className="txt">
                        {commentText ? renderCommentBody(commentText) : <span className="text-slate-400 italic">No comments</span>}
                      </span>

                      <span className="meta">
                        <span className="kr-dot"><i style={{ background: st.color }} />{st.label}</span>
                        {pin.priority && pin.priority !== 'normal' && (
                          <span className="kr-dot"><i style={{ background: pr.color }} />{pr.label}</span>
                        )}
                        {replies > 0 && (
                          <span className="rp">
                            <Icon name="chat" size={12} />
                            {replies} {replies === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Hint while comment mode has nothing on the list yet */}
        {!readOnly && pins.length === 0 && (
          <div className="kr-hint">
            <Icon name="chat" size={14} />
            <span>Click anywhere on the page to leave a comment</span>
          </div>
        )}
      </div>
    </aside>
  );
}
