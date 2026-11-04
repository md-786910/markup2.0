import React, { useState, useMemo } from 'react';

const COLUMNS = [
  { id: 'open', title: 'Open', dot: 'bg-blue-600' },
  { id: 'in_progress', title: 'In Progress', dot: 'bg-amber-500' },
  { id: 'in_review', title: 'In Review', dot: 'bg-sky-500' },
  { id: 'resolved', title: 'Resolved', dot: 'bg-emerald-500' },
];

// Left strip of each card shows its priority; the tag only appears for high/urgent
const PRIORITY_STRIP = {
  urgent: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-blue-400',
  low: 'border-l-gray-300',
};
const PRIORITY_TAG = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function TaskBoard({
  pins = [],
  members = [],
  onPinClick,
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
        if (!pinNum.includes(query) && !commentText.includes(query) && !labelsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [normalizedPins, assigneeFilter, priorityFilter, search]);

  // Group by status column
  const columnData = useMemo(() => {
    const map = {
      open: [],
      in_progress: [],
      in_review: [],
      resolved: [],
    };
    for (const pin of filteredPins) {
      if (map[pin.status]) {
        map[pin.status].push(pin);
      } else {
        map.open.push(pin);
      }
    }
    // Sort by position or createdAt
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    return map;
  }, [filteredPins]);

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
    'h-8 rounded-lg border border-gray-200 bg-white text-body-sm text-gray-700 transition-colors hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15';
  const hasFilters = search || assigneeFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Filters */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter tasks or #number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${controlCls} w-48 pl-8 pr-3 placeholder:text-gray-400 sm:w-60`}
              aria-label="Filter tasks"
            />
          </div>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className={`${controlCls} px-2.5`} aria-label="Assignee">
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name || m.email}
              </option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={`${controlCls} px-2.5`} aria-label="Priority">
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setAssigneeFilter('all');
                setPriorityFilter('all');
              }}
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-label text-blue-600 hover:bg-blue-50"
            >
              Reset filters
            </button>
          )}
        </div>

        {onSwitchToCanvas && (
          <button
            onClick={onSwitchToCanvas}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-label text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            Switch to Canvas view
          </button>
        )}
      </div>

      {/* Columns: full-height lanes */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto bg-gray-50/60 p-4">
        {COLUMNS.map((col) => {
          const colPins = columnData[col.id] || [];
          const isDropTarget = dragOverCol === col.id && draggingPinId;
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
              className={`flex w-72 shrink-0 flex-col rounded-xl transition-colors ${
                isDropTarget ? 'bg-blue-100/70 ring-2 ring-blue-400/60' : 'bg-blue-50/70'
              }`}
              aria-label={`${col.title}, ${colPins.length} ${colPins.length === 1 ? 'task' : 'tasks'}`}
            >
              {/* Column header */}
              <div className="flex h-11 shrink-0 items-center gap-2 px-3">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <h3 className="text-label text-gray-900">{col.title}</h3>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-gray-200 bg-white px-1.5 text-caption font-medium text-gray-600">
                  {colPins.length}
                </span>
              </div>

              {/* Cards */}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {colPins.length === 0 ? (
                  <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300/80 text-center">
                    <p className="text-caption text-gray-500">No tasks</p>
                    {canEdit && !readOnly && <p className="text-caption text-gray-400">Drop a task here</p>}
                  </div>
                ) : (
                  colPins.map((pin) => {
                    const isOverdue = pin.dueAt && new Date(pin.dueAt) < new Date() && pin.status !== 'resolved';
                    const priority = pin.priority || 'normal';
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
                        className={`group overflow-hidden rounded-lg border border-l-[3px] border-gray-200/80 bg-white shadow-sm transition-all hover:border-gray-300 hover:shadow-md ${
                          PRIORITY_STRIP[priority] || PRIORITY_STRIP.normal
                        } ${draggingPinId === pin._id ? 'opacity-40' : ''} ${canEdit && !readOnly ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                      >
                        <div className="px-3 pb-2.5 pt-2">
                          {/* Number, priority tag, quick move */}
                          <div className="flex h-6 items-center gap-1.5">
                            <span className="text-caption font-medium text-gray-500 group-hover:text-blue-600">#{pin.pinNumber || '?'}</span>
                            {PRIORITY_TAG[priority] && (
                              <span className={`rounded px-1.5 text-caption font-medium capitalize ${PRIORITY_TAG[priority]}`}>{priority}</span>
                            )}
                            {canEdit && !readOnly && (
                              <div className="ml-auto opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={pin.status}
                                  onChange={(e) => handleQuickMove(pin._id, e.target.value)}
                                  className="h-6 rounded-md border border-gray-200 bg-white px-1 text-caption text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                  aria-label={`Move task #${pin.pinNumber || ''}`}
                                  title="Move to…"
                                >
                                  {COLUMNS.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <p className={`mt-0.5 line-clamp-3 break-words text-body-sm ${text ? 'text-gray-900' : 'italic text-gray-400'}`}>
                            {text || 'No description added.'}
                          </p>

                          {pin.labels && pin.labels.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pin.labels.map((l, i) => (
                                <span key={i} className="rounded bg-gray-100 px-1.5 text-caption text-gray-600">
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {hasFooter && (
                          <div className="flex h-8 items-center justify-between border-t border-gray-100 bg-gray-50/70 px-3">
                            {pin.dueAt ? (
                              <span className={`inline-flex items-center gap-1 text-caption ${isOverdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
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
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-caption font-semibold text-blue-700 ring-2 ring-white"
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
      </div>
    </div>
  );
}
