import { useAuth } from '../../hooks/useAuth';

const TABS = [
  { id: 'pins', label: 'Feedback' },
  { id: 'activity', label: 'Activity', limit: 'hasActivityLogs' },
  { id: 'versions', label: 'Versions', limit: 'hasVersionHistory' },
];

// Feedback / Activity / Versions switcher. Tabs not on the current plan stay
// visible with a lock and open an upgrade panel instead (LockedFeature).
export default function SidebarTabs({ active, onChange }) {
  const { user } = useAuth();
  const limits = user?.orgLimits || {};
  return (
    <div className="flex border-b border-gray-200/80 shrink-0" role="tablist">
      {TABS.map((tab) => {
        const locked = tab.limit && !limits[tab.limit];
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`relative flex flex-1 items-center justify-center gap-1 py-2.5 text-[13px] font-medium transition-colors ${
              selected ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {locked && (
              <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-label="Upgrade required">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4" />
              </svg>
            )}
            {selected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
        );
      })}
    </div>
  );
}

export function isTabLocked(tabId, limits = {}) {
  const tab = TABS.find((t) => t.id === tabId);
  return !!(tab?.limit && !limits[tab.limit]);
}
