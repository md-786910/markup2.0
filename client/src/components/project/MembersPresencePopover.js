import React, { useState, useEffect, useRef } from "react";

const OPEN_DELAY = 120;
const CLOSE_DELAY = 150;

export function formatLastSeen(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatExactTime(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest' };

// Hover-intent: opens after a short delay, and stays open while the pointer
// moves from the trigger into the popover.
function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), OPEN_DELAY); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY); };

  return { open, handlers: { onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide } };
}

// Re-render every 30s while open so "x mins ago" stays fresh.
function useTick(active) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [active]);
}

function StatusLine({ isOnline, lastSeen }) {
  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-green-600">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
        </span>
        Active now
      </div>
    );
  }
  if (!lastSeen) {
    return <div className="text-[11.5px] text-gray-400">Not active yet</div>;
  }
  return (
    <div className="text-[11.5px] text-gray-500" title={formatExactTime(lastSeen)}>
      Last active {formatLastSeen(lastSeen)}
      <span className="text-gray-400"> · {formatExactTime(lastSeen)}</span>
    </div>
  );
}

function Avatar({ initials, color, isOnline }) {
  return (
    <div className="relative shrink-0">
      <div className={`w-8 h-8 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-[11px] font-bold`}>
        {initials}
      </div>
      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
    </div>
  );
}

/**
 * Hover card for the header avatar stack: lists every project member with
 * role and presence (online now, or last active relative + exact time).
 * `entries` items: { member, role, isYou, isOnline, lastSeen, color, initials }.
 */
export default function MembersPresencePopover({ entries, children }) {
  const { open, handlers } = useHoverPopover();
  useTick(open);

  const onlineCount = entries.filter((e) => e.isOnline).length;
  const sorted = [...entries].sort((a, b) => {
    if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
  });

  return (
    <div className="relative" {...handlers}>
      {children}
      {open && (
        <div className="absolute right-0 top-full z-50 pt-2 animate-scale-in origin-top-right" role="tooltip">
          <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-900/10">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
              <span className="text-[13px] font-semibold text-gray-900">
                Project members <span className="font-normal text-gray-400">({entries.length})</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
                <span className={`w-1.5 h-1.5 rounded-full ${onlineCount ? 'bg-green-500' : 'bg-gray-300'}`} />
                {onlineCount} online
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto py-1.5">
              {sorted.map(({ member, role, isYou, isOnline, lastSeen, color, initials }) => (
                <div key={member._id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50">
                  <Avatar initials={initials} color={color} isOnline={isOnline} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-gray-900">
                        {member.name || member.email}
                      </span>
                      {isYou && <span className="shrink-0 text-[11px] text-gray-400">(you)</span>}
                      {role && (
                        <span className="ml-auto shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-medium text-gray-600">
                          {ROLE_LABELS[role] || role}
                        </span>
                      )}
                    </div>
                    <StatusLine isOnline={isOnline} lastSeen={lastSeen} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
