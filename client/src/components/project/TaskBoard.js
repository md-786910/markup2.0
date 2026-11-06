import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getAvatarColor } from '../../utils/avatarColors';

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

  const hasFilters = search || assigneeFilter !== 'all' || priorityFilter !== 'all';

  // Stats calculation
  const totalTasksCount = filteredPins.length;
  const overdueCount = useMemo(() => {
    const now = new Date();
    return filteredPins.filter((p) => p.dueAt && new Date(p.dueAt) < now && p.status !== 'resolved').length;
  }, [filteredPins]);

  const chevron = (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
  const xIcon = (cls = 'h-3 w-3') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
  const plusIcon = (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );

  return (
    <div className="kr-board">
      {/* Filter bar */}
      <div className="kr-btb">
        <label className="kr-bsearch">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filter tasks or #number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filter tasks"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
              {xIcon()}
            </button>
          )}
        </label>

        <div className={`kr-bsel ${assigneeFilter !== 'all' ? 'on' : ''}`}>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="Assignee">
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name || m.email}
              </option>
            ))}
          </select>
          {chevron}
        </div>

        <div className={`kr-bsel ${priorityFilter !== 'all' ? 'on' : ''}`}>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Priority">
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          {chevron}
        </div>

        {hasFilters && (
          <button
            type="button"
            className="kr-reset"
            onClick={() => {
              setSearch('');
              setAssigneeFilter('all');
              setPriorityFilter('all');
            }}
          >
            {xIcon()}
            Reset filters
          </button>
        )}

        <span className="kr-count hidden lg:inline-flex">
          {totalTasksCount} {totalTasksCount === 1 ? 'task' : 'tasks'}
        </span>
        {overdueCount > 0 && (
          <span className="kr-count danger hidden lg:inline-flex">
            <i />
            {overdueCount} overdue
          </span>
        )}

        <span className="grow" />

        {canEdit && !readOnly && (
          <button type="button" onClick={handleOpenAddColumn} className="kc-btn ghost sm" title="Add a new column to the board">
            {plusIcon}
            Add column
          </button>
        )}
        {onSwitchToCanvas && (
          <button type="button" onClick={onSwitchToCanvas} className="kc-btn sec sm">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            Canvas view
          </button>
        )}
      </div>

      {/* Status columns, scroll sideways */}
      <div ref={boardScrollRef} className="kr-cols scrollbar-thin">
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
              className={`kr-col ${isDropTarget ? 'drop' : ''}`}
              aria-label={`${col.title}, ${colPins.length} ${colPins.length === 1 ? 'task' : 'tasks'}`}
            >
              <div className="kr-col-h">
                <i className={col.dot || 'bg-blue-600'} />
                <h3 className="truncate">{col.title}</h3>
                <span className="n">{colPins.length}</span>
                {isCustom && canEdit && !readOnly && (
                  <button
                    type="button"
                    className="x"
                    onClick={() => handleDeleteColumn(col.id)}
                    title="Remove custom column"
                    aria-label={`Remove column ${col.title}`}
                  >
                    {xIcon('h-3.5 w-3.5')}
                  </button>
                )}
              </div>

              <div className="kr-col-b scrollbar-thin">
                {colPins.length === 0 ? (
                  <div className="kr-col-empty">
                    <b>No tasks in {col.title}</b>
                    {canEdit && !readOnly && <span>Drag a task here</span>}
                  </div>
                ) : (
                  colPins.map((pin) => {
                    const isOverdue = pin.dueAt && new Date(pin.dueAt) < new Date() && pin.status !== 'resolved';
                    const priority = pin.priority || 'normal';
                    const pConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
                    const text = pin.firstComment?.body ? pin.firstComment.body.replace(/<[^>]*>?/gm, '') : '';
                    const assigneeName = pin.assignee ? pin.assignee.name || pin.assignee.email || 'Member' : '';
                    const assigneeColor = getAvatarColor(pin.assignee?._id || assigneeName);
                    const hasFooter = Boolean(pin.dueAt || pin.assignee);
                    const selected = selectedPinId === pin._id;

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
                        aria-current={selected ? 'true' : undefined}
                        className={`kr-card ${priority === 'urgent' || priority === 'high' ? priority : ''} ${selected ? 'sel' : ''} ${draggingPinId === pin._id ? 'dragging' : ''}`}
                      >
                        <div className="top">
                          <span className="num">#{pin.pinNumber || '?'}</span>
                          {(priority === 'urgent' || priority === 'high') && (
                            <span className={`kr-tag ${priority}`}>{pConfig.label}</span>
                          )}
                          {canEdit && !readOnly && (
                            <div className="move" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={pin.status}
                                onChange={(e) => handleQuickMove(pin._id, e.target.value)}
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

                        <p className={`ttl ${text ? '' : 'none'}`}>{text || 'No description added.'}</p>

                        {pin.labels && pin.labels.length > 0 && (
                          <div className="tags">
                            {pin.labels.map((l, i) => (
                              <span key={i} className="kr-tag">{l}</span>
                            ))}
                          </div>
                        )}

                        {hasFooter && (
                          <div className="foot">
                            {pin.dueAt ? (
                              <span className={isOverdue ? 'kr-tag overdue' : 'due'}>
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
                              <span className={`av ${assigneeColor.bg} ${assigneeColor.text}`} title={`Assigned to ${assigneeName}`}>
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

        {/* Add a column */}
        {canEdit && !readOnly && (
          isAddingColumn ? (
            <form onSubmit={handleAddColumnSubmit} className="kr-addform">
              <div className="hd">
                <span>Add a column</span>
                <button type="button" onClick={() => setIsAddingColumn(false)} aria-label="Cancel">
                  {xIcon('h-3.5 w-3.5')}
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
                aria-label="Column name"
              />
              <div>
                <span className="lbl">Accent color</span>
                <div className="sw">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setNewColumnColor(c)}
                      className={`${c.dot} ${newColumnColor.id === c.id ? 'on' : ''}`}
                      title={c.label}
                      aria-label={c.label}
                      aria-pressed={newColumnColor.id === c.id}
                    />
                  ))}
                </div>
              </div>
              <div className="acts">
                <button type="button" onClick={() => setIsAddingColumn(false)} className="kc-btn ghost sm">
                  Cancel
                </button>
                <button type="submit" disabled={!newColumnTitle.trim()} className="kc-btn pri sm disabled:pointer-events-none disabled:opacity-50">
                  Add column
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={handleOpenAddColumn} className="kr-add">
              {plusIcon}
              Add a column
              <small>A custom workflow stage</small>
            </button>
          )
        )}
      </div>
    </div>
  );
}
