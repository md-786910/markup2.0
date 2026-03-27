import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialStatus } from '../../hooks/useTrialStatus';

const urgencyColors = {
  normal: {
    text: 'text-blue-400',
    bar: 'bg-blue-500',
    icon: 'text-blue-400',
  },
  warning: {
    text: 'text-amber-400',
    bar: 'bg-amber-500',
    icon: 'text-amber-400',
  },
  critical: {
    text: 'text-red-400',
    bar: 'bg-red-500',
    icon: 'text-red-400',
  },
};

export default function TrialBadge() {
  const navigate = useNavigate();
  const { daysLeft, progressPercent, isTrialActive, urgency } = useTrialStatus();

  if (!isTrialActive) return null;

  const colors = urgencyColors[urgency];
  const dayLabel = daysLeft === 1 ? 'day' : 'days';

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className={`w-3.5 h-3.5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] font-medium text-gray-400">Trial</span>
        </div>
        <span className={`text-[11px] font-semibold ${colors.text}`}>
          {daysLeft} {dayLabel} left
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-700 rounded-full mb-3">
        <div
          className={`h-1 rounded-full ${colors.bar} transition-all duration-500`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Upgrade button */}
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="w-full py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        Upgrade
      </button>
    </div>
  );
}
