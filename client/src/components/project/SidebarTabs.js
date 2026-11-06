import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../kc';

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
    <div className="flex border-b border-slate-200 bg-white shrink-0 px-2 h-10 items-center" role="tablist">
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
            className={`relative flex flex-1 items-center justify-center gap-1.5 h-10 text-[13px] transition-colors ${
              selected ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            {tab.label}
            {locked && (
              <Icon name="lock" size={12} className="text-slate-400" />
            )}
            {selected && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full" />}
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
