import React, { useState, useMemo } from 'react';

const COLUMNS = [
  { id: 'open', title: 'Open', color: 'border-amber-400', badge: 'bg-amber-100 text-amber-800' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-500', badge: 'bg-blue-100 text-blue-800' },
  { id: 'in_review', title: 'In Review', color: 'border-purple-500', badge: 'bg-purple-100 text-purple-800' },
  { id: 'resolved', title: 'Resolved', color: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
];

const PRIORITY_THEME = {
  urgent: 'bg-rose-100 text-rose-700 border-rose-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  normal: 'bg-blue-50 text-blue-600 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
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
    if (!pinId || !onPinUpdate || readOnly) return;

    const pin = normalizedPins.find((p) => String(p._id) === String(pinId));
    if (!pin || pin.status === targetStatus) return;

    onPinUpdate(pinId, { status: targetStatus });
  };

  const handleQuickMove = (pinId, targetStatus) => {
    if (!onPinUpdate || readOnly) return;
    onPinUpdate(pinId, { status: targetStatus });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Filter & Action Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter tasks or #number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs py-1.5 pl-8 pr-3 border border-gray-300 rounded-lg w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name || m.email}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {(search || assigneeFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setAssigneeFilter('all');
                setPriorityFilter('all');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Right Switch Button */}
        {onSwitchToCanvas && (
          <button
            onClick={onSwitchToCanvas}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            Switch to Canvas View
          </button>
        )}
      </div>

      {/* Columns Container */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start">
        {COLUMNS.map((col) => {
          const colPins = columnData[col.id] || [];
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="w-80 shrink-0 bg-white rounded-xl shadow-sm border border-gray-200/90 flex flex-col max-h-full"
            >
              {/* Column Header */}
              <div className={`p-3.5 border-t-4 ${col.color} border-b border-gray-100 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-gray-800">{col.title}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                    {colPins.length}
                  </span>
                </div>
              </div>

              {/* Task Cards Scroll List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]">
                {colPins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                    <p className="text-xs">No tasks in this column</p>
                    {canEdit && (
                      <span className="text-[11px] text-gray-300 mt-1">Drag tasks here</span>
                    )}
                  </div>
                ) : (
                  colPins.map((pin) => {
                    const isOverdue = pin.dueAt && new Date(pin.dueAt) < new Date() && pin.status !== 'resolved';
                    const priorityCls = PRIORITY_THEME[pin.priority] || PRIORITY_THEME.normal;

                    return (
                      <div
                        key={pin._id}
                        draggable={canEdit && !readOnly}
                        onDragStart={(e) => handleDragStart(e, pin._id)}
                        onClick={() => onPinClick && onPinClick(pin)}
                        className={`bg-white border rounded-lg p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                          draggingPinId === pin._id ? 'opacity-40 border-dashed border-blue-400' : 'border-gray-200'
                        }`}
                      >
                        {/* Top row: #number & priority pill */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-blue-600 group-hover:underline">
                            #{pin.pinNumber || '?'}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${priorityCls}`}>
                            {pin.priority || 'normal'}
                          </span>
                        </div>

                        {/* First comment body or fallback */}
                        <p className="text-xs text-gray-800 line-clamp-3 mb-2.5">
                          {pin.firstComment?.body
                            ? pin.firstComment.body.replace(/<[^>]*>?/gm, '')
                            : 'No description added.'}
                        </p>

                        {/* Labels row */}
                        {pin.labels && pin.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            {pin.labels.map((l, i) => (
                              <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                #{l}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom row: Due date & Assignee & Quick Move */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                          {/* Due Date badge */}
                          {pin.dueAt ? (
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                isOverdue ? 'text-rose-600 font-bold' : 'text-gray-500'
                              }`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {isOverdue && '! '}
                              {new Date(pin.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">No due date</span>
                          )}

                          {/* Assignee Avatar / Name */}
                          <div className="flex items-center gap-1.5">
                            {pin.assignee ? (
                              <div
                                className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold"
                                title={`Assigned to ${pin.assignee.name || pin.assignee.email || 'Member'}`}
                              >
                                {getInitials(pin.assignee.name || pin.assignee.email)}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400">Unassigned</span>
                            )}

                            {/* Quick status cycle button */}
                            {canEdit && !readOnly && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={pin.status}
                                  onChange={(e) => handleQuickMove(pin._id, e.target.value)}
                                  className="text-[10px] py-0.5 px-1 bg-gray-50 border border-gray-200 rounded text-gray-600 focus:outline-none"
                                >
                                  {COLUMNS.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      &rarr; {c.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
