import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../kc';

const TABS = [
  { id: 'pins', label: 'Feedback' },
  { id: 'activity', label: 'Activity', limit: 'hasActivityLogs' },
  { id: 'versions', label: 'Versions', limit: 'hasVersionHistory' },
];

// Feedback / Activity / Versions switcher. Tabs not on the current plan stay
// visible with a lock and open an upgrade panel instead (LockedFeature).
export default function SidebarTabs({ active, onChange, count }) {
  const { user } = useAuth();
  const limits = user?.orgLimits || {};
  return (
    <div className="kc-tabs shrink-0" role="tablist">
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
            className={`kc-tab ${selected ? 'on' : ''}`}
          >
            {tab.label}
            {tab.id === 'pins' && typeof count === 'number' && (
              <span className="ct">{count}</span>
            )}
            {locked && (
              <Icon name="lock" size={12} className="text-slate-400" />
            )}
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
