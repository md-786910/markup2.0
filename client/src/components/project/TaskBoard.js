import React, { useState, useMemo, useEffect, useRef } from 'react';

const DEFAULT_COLUMNS = [
  { id: 'open', title: 'Open', dot: 'bg-blue-600', ring: 'ring-blue-500/20', lightBg: 'bg-blue-50/60', border: 'border-blue-200', color: 'blue' },
  { id: 'in_progress', title: 'In Progress', dot: 'bg-amber-500', ring: 'ring-amber-500/20', lightBg: 'bg-amber-50/60', border: 'border-amber-200', color: 'amber' },
  { id: 'in_review', title: 'In Review', dot: 'bg-sky-500', ring: 'ring-sky-500/20', lightBg: 'bg-sky-50/60', border: 'border-sky-200', color: 'sky' },
  { id: 'resolved', title: 'Resolved', dot: 'bg-emerald-500', ring: 'ring-emerald-500/20', lightBg: 'bg-emerald-50/60', border: 'border-emerald-200', color: 'emerald' },
];

const COLOR_OPTIONS = [
  { id: 'blue', dot: 'bg-blue-600', label: 'Blue' },
  { id: 'amber', dot: 'bg-amber-500', label: 'Amber' },
  { id: 'sky', dot: 'bg-sky-500', label: 'Sky' },
  { id: 'emerald', dot: 'bg-emerald-500', label: 'Emerald' },
  { id: 'purple', dot: 'bg-purple-600', label: 'Purple' },
  { id: 'rose', dot: 'bg-rose-500', label: 'Rose' },
  { id: 'indigo', dot: 'bg-indigo-600', label: 'Indigo' },
  { id: 'teal', dot: 'bg-teal-500', label: 'Teal' },
];

const PRIORITY_CONFIG = {
  urgent: {
    strip: 'bg-red-500',
    tag: 'bg-red-50 text-red-700 border-red-200/80',
    iconColor: 'text-red-600',
    label: 'Urgent',
  },
  high: {
    strip: 'bg-amber-500',
    tag: 'bg-amber-50 text-amber-700 border-amber-200/80',
    iconColor: 'text-amber-600',
    label: 'High',
  },
  normal: {
    strip: 'bg-blue-400',
    tag: 'bg-blue-50 text-blue-700 border-blue-200/60',
    iconColor: 'text-blue-500',
    label: 'Normal',
  },
  low: {
    strip: 'bg-gray-300',
    tag: 'bg-gray-50 text-gray-600 border-gray-200/60',
    iconColor: 'text-gray-400',
    label: 'Low',
  },
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function TaskBoard({
  projectId,
  pins = [],
  members = [],
  onPinClick,
  selectedPinId,
  onPinUpdate,
  canEdit = true,
  readOnly = false,
  onSwitchToCanvas,
}) {
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [draggingPinId, setDraggingPinId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Column management
  const storageKey = useMemo(() => {
    return projectId ? `kommently_taskboard_columns_${projectId}` : 'kommently_taskboard_columns_default';
  }, [projectId]);

  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_COLUMNS;
  });

  // Keep localStorage synced when columns change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columns));
    } catch {
      // ignore storage errors
    }
  }, [columns, storageKey]);

  // Reload columns if projectId switches
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setColumns(DEFAULT_COLUMNS);
  }, [storageKey]);

  // New column creation form state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(COLOR_OPTIONS[4]); // default purple
  const newColumnInputRef = useRef(null);
  const boardScrollRef = useRef(null);

  useEffect(() => {
    if (isAddingColumn && newColumnInputRef.current) {
      newColumnInputRef.current.focus();
    }
  }, [isAddingColumn]);

  const handleOpenAddColumn = () => {
    setIsAddingColumn(true);
    setNewColumnTitle('');
    setTimeout(() => {
      if (boardScrollRef.current) {
        boardScrollRef.current.scrollTo({
          left: boardScrollRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 50);
  };

  const handleAddColumnSubmit = (e) => {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;

    // Generate unique slug
    let baseId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!baseId) baseId = 'col';
    const existingIds = new Set(columns.map((c) => c.id));
    let uniqueId = baseId;
    let counter = 1;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${baseId}_${counter}`;
      counter++;
    }

    const newCol = {
      id: uniqueId,
      title: trimmed,
      dot: newColumnColor.dot,
      color: newColumnColor.id,
      custom: true,
    };

    setColumns((prev) => [...prev, newCol]);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const handleDeleteColumn = (colId) => {
    if (!window.confirm('Are you sure you want to remove this column? Tasks in this column will be moved to Open.')) {
      return;
    }
    // Move tasks in this column to 'open'
    const pinsInCol = columnData[colId] || [];
    pinsInCol.forEach((p) => {
      if (onPinUpdate && !readOnly) {
        onPinUpdate(p._id, { status: 'open' });
      }
    });
    setColumns((prev) => prev.filter((c) => c.id !== colId));
  };

  // Normalize pins status ('pending' maps to 'open')
  const normalizedPins = useMemo(() => {
    return pins.map((p) => ({
      ...p,
      status: p.status === 'pending' ? 'open' : (p.status || 'open'),
    }));
  }, [pins]);

  // Apply filters
  const filteredPins = useMemo(() => {
    return normalizedPins.filter((pin) => {
      if (assigneeFilter === 'unassigned') {
        if (pin.assignee) return false;
      } else if (assigneeFilter !== 'all') {
        const aId = pin.assignee?._id || pin.assignee;
        if (String(aId) !== String(assigneeFilter)) return false;
      }

      if (priorityFilter !== 'all') {
        if ((pin.priority || 'normal') !== priorityFilter) return false;
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        const pinNum = String(pin.pinNumber || '');
        const commentText = (pin.firstComment?.body || '').toLowerCase();
        const labelsMatch = (pin.labels || []).some((l) => l.toLowerCase().includes(query));
        const numberQuery = query.replace(/^#/, '');
        if (!(numberQuery && pinNum.includes(numberQuery)) && !commentText.includes(query) && !labelsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [normalizedPins, assigneeFilter, priorityFilter, search]);

  // Group by status column
  const columnData = useMemo(() => {
    const map = {};
    columns.forEach((col) => {
      map[col.id] = [];
    });
    // Fallback buckets if tasks have old or unknown statuses
    if (!map.open) map.open = [];

    for (const pin of filteredPins) {
      if (map[pin.status]) {
        map[pin.status].push(pin);
      } else {
        // Map unknown status into open
        map.open.push(pin);
      }
    }
    // Sort by position or createdAt
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    return map;
  }, [filteredPins, columns]);

  const handleDragStart = (e, pinId) => {
    setDraggingPinId(pinId);
    e.dataTransfer.setData('text/plain', pinId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const pinId = e.dataTransfer.getData('text/plain') || draggingPinId;
    setDraggingPinId(null);
    setDragOverCol(null);
    if (!pinId || !onPinUpdate || readOnly) return;

    const pin = normalizedPins.find((p) => String(p._id) === String(pinId));
    if (!pin || pin.status === targetStatus) return;

    onPinUpdate(pinId, { status: targetStatus });
  };

  const handleQuickMove = (pinId, targetStatus) => {
    if (!onPinUpdate || readOnly) return;
    onPinUpdate(pinId, { status: targetStatus });
  };

  const controlCls =
    'h-8 rounded-lg border border-gray-200 bg-white text-caption text-gray-700 transition-all hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 shadow-2xs';
  const hasFilters = search || assigneeFilter !== 'all' || priorityFilter !== 'all';

  // Stats calculation
  const totalTasksCount = filteredPins.length;
  const overdueCount = useMemo(() => {
    const now = new Date();
    return filteredPins.filter((p) => p.dueAt && new Date(p.dueAt) < now && p.status !== 'resolved').length;
  }, [filteredPins]);

  return (
    <div className="flex flex-col h-full bg-slate-50/70 overflow-hidden select-none">
      {/* Top Header / Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200/90 bg-white px-5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box with clear button */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter tasks or #number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${controlCls} w-48 pl-8 pr-7 placeholder:text-gray-400 placeholder:text-caption sm:w-60`}
              aria-label="Filter tasks"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className={`${controlCls} appearance-none pl-2.5 pr-7 text-caption`}
              aria-label="Assignee"
            >
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`${controlCls} appearance-none pl-2.5 pr-7 text-caption`}
              aria-label="Priority"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setAssigneeFilter('all');
                setPriorityFilter('all');
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50/70 px-2.5 text-caption font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Reset filters
            </button>
          )}

          {/* Quick summary badges */}
          <div className="hidden items-center gap-2 pl-2 lg:flex">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-caption font-medium text-gray-600">
              {totalTasksCount} {totalTasksCount === 1 ? 'task' : 'tasks'}
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-caption font-semibold text-red-600 border border-red-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {overdueCount} overdue
              </span>
            )}
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-2">
          {/* Add Column Button in Header */}
          {canEdit && !readOnly && (
            <button
              onClick={handleOpenAddColumn}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 text-caption font-medium text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-300 shadow-2xs active:scale-[0.98]"
              title="Add a new column to the board"
            >
              <svg className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add column</span>
            </button>
          )}

          {onSwitchToCanvas && (
            <button
              onClick={onSwitchToCanvas}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-caption font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 shadow-2xs active:scale-[0.98]"
            >
              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              <span>Switch to Canvas view</span>
            </button>
          )}
        </div>
      </div>

      {/* Columns: full-height lanes container */}
      <div
        ref={boardScrollRef}
        className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-5 pb-6 scroll-smooth scrollbar-thin"
      >
        {columns.map((col) => {
          const colPins = columnData[col.id] || [];
          const isDropTarget = dragOverCol === col.id && draggingPinId;
          const isCustom = col.custom;

          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                handleDragOver(e);
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null);
              }}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex w-[350px] shrink-0 flex-col rounded-2xl border transition-all duration-200 shadow-xs ${
                isDropTarget
                  ? 'border-blue-400 bg-blue-50/80 ring-2 ring-blue-400/50 shadow-md scale-[1.01]'
                  : 'border-slate-200/80 bg-slate-100/70'
              }`}
              aria-label={`${col.title}, ${colPins.length} ${colPins.length === 1 ? 'task' : 'tasks'}`}
            >
              {/* Column Header */}
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-gray-200/60 px-3.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot || 'bg-blue-600'} shadow-xs`} />
                  <h3 className="text-body-sm font-semibold text-gray-900 tracking-tight">{col.title}</h3>
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-gray-200 bg-white px-1.5 text-caption font-medium text-gray-600 shadow-2xs">
                    {colPins.length}
                  </span>
                </div>

                {/* Column header actions */}
                <div className="flex items-center gap-1">
                  {isCustom && canEdit && !readOnly && (
                    <button
                      onClick={() => handleDeleteColumn(col.id)}
                      className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-red-600"
                      title="Remove custom column"
                      aria-label={`Remove column ${col.title}`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Cards list */}
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5 scrollbar-thin">
                {colPins.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300/80 bg-white/40 p-4 text-center">
                    <svg className="h-6 w-6 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-caption font-medium text-gray-500">No tasks in {col.title}</p>
                    {canEdit && !readOnly && (
                      <p className="mt-0.5 text-caption text-gray-400">Drag a task here</p>
                    )}
                  </div>
                ) : (
                  colPins.map((pin) => {
                    const isOverdue = pin.dueAt && new Date(pin.dueAt) < new Date() && pin.status !== 'resolved';
                    const priority = pin.priority || 'normal';
                    const pConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
                    const text = pin.firstComment?.body ? pin.firstComment.body.replace(/<[^>]*>?/gm, '') : '';
                    const assigneeName = pin.assignee ? pin.assignee.name || pin.assignee.email || 'Member' : '';
                    const hasFooter = Boolean(pin.dueAt || pin.assignee);

                    return (
                      <article
                        key={pin._id}
                        draggable={canEdit && !readOnly}
                        onDragStart={(e) => handleDragStart(e, pin._id)}
                        onDragEnd={() => {
                          setDraggingPinId(null);
                          setDragOverCol(null);
                        }}
                        onClick={() => onPinClick && onPinClick(pin)}
                        aria-current={selectedPinId === pin._id ? 'true' : undefined}
                        className={`group relative overflow-hidden rounded-xl border border-gray-200/90 bg-white p-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md ${selectedPinId === pin._id ? 'kr-card-sel' : ''} ${
                          draggingPinId === pin._id ? 'opacity-40 scale-95' : 'opacity-100'
                        } ${canEdit && !readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                      >
                        {/* Left priority accent indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${pConfig.strip}`} />

                        {/* Top bar: Pin #, Priority pill, and quick move selector */}
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-caption font-bold text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            #{pin.pinNumber || '?'}
                          </span>

                          {/* Priority pill */}
                          {priority && priority !== 'normal' && (
                            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-caption font-semibold ${pConfig.tag}`}>
                              {priority === 'urgent' && (
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.316.492-.474.966-.567 1.344-.197.802-.226 1.502-.189 2.08.037.58.152 1.05.313 1.404a5.962 5.962 0 001.295 1.776 1 1 0 001.446-1.38c-.372-.39-.63-.824-.766-1.246-.134-.418-.17-.83-.153-1.258.016-.425.092-.91.248-1.44.154-.523.385-1.036.702-1.51.106-.157.218-.309.346-.452V2.553zM6.5 7a1 1 0 011 1v1.171a4.99 4.99 0 001.218 3.313 1 1 0 01-1.5 1.328A6.99 6.99 0 016.5 9.171V8a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                              )}
                              {pConfig.label}
                            </span>
                          )}

                          {/* Quick move dropdown on hover */}
                          {canEdit && !readOnly && (
                            <div
                              className="ml-auto opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={pin.status}
                                onChange={(e) => handleQuickMove(pin._id, e.target.value)}
                                className="h-6 rounded-md border border-gray-200 bg-white px-1 text-caption font-medium text-gray-600 shadow-2xs hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                aria-label={`Move task #${pin.pinNumber || ''}`}
                                title="Move to stage…"
                              >
                                {columns.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Task body / text */}
                        <div className="mt-2 pl-1">
                          <p className={`line-clamp-3 break-words text-body-sm ${text ? 'text-gray-700' : 'italic text-gray-400'}`}>
                            {text || 'No description added.'}
                          </p>

                          {/* Labels */}
                          {pin.labels && pin.labels.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {pin.labels.map((l, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-md border border-gray-200/80 bg-gray-50 px-2 py-0.5 text-caption font-medium text-gray-600"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Footer with Due Date and Assignee */}
                        {hasFooter && (
                          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 pl-1">
                            {pin.dueAt ? (
                              <span
                                className={`inline-flex items-center gap-1.5 text-caption ${
                                  isOverdue
                                    ? 'rounded-md bg-red-50 px-1.5 py-0.5 font-semibold text-red-600 border border-red-200/60'
                                    : 'font-medium text-gray-500'
                                }`}
                              >
                                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {isOverdue ? 'Overdue · ' : ''}
                                {new Date(pin.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            ) : (
                              <span />
                            )}

                            {pin.assignee && (
                              <span
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-caption font-bold text-white shadow-2xs ring-2 ring-white"
                                title={`Assigned to ${assigneeName}`}
                              >
                                {getInitials(assigneeName)}
                              </span>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}

        {/* New Column / Plus Button Section at the end of lanes */}
        {canEdit && !readOnly && (
          <div className="w-[320px] shrink-0">
            {isAddingColumn ? (
              <form
                onSubmit={handleAddColumnSubmit}
                className="flex flex-col rounded-2xl border border-blue-300 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-caption font-semibold text-gray-900">Add new column</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingColumn(false)}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <input
                  ref={newColumnInputRef}
                  type="text"
                  placeholder="Column name (e.g. In QA)…"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsAddingColumn(false);
                  }}
                  className="h-8 w-full rounded-lg border border-gray-200 px-2.5 text-caption text-gray-900 placeholder:text-gray-400 placeholder:text-caption focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                {/* Color swatch picker */}
                <div className="mt-3">
                  <span className="text-caption font-medium text-gray-500">Accent color</span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setNewColumnColor(c)}
                        className={`h-4.5 w-4.5 rounded-full ${c.dot} transition-transform ${
                          newColumnColor.id === c.id ? 'scale-125 ring-2 ring-gray-900 ring-offset-1' : 'hover:scale-110 opacity-80 hover:opacity-100'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingColumn(false)}
                    className="h-8 rounded-lg px-2.5 text-caption font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newColumnTitle.trim()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-caption font-medium text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add column
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddColumn}
                className="group flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-300 bg-white/60 p-4 text-gray-500 transition-all hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-600 hover:shadow-xs"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-2xs group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div className="text-center">
                  <span className="text-caption font-semibold block">Add new column</span>
                  <span className="text-[11px] text-gray-400">Add a custom workflow stage</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
