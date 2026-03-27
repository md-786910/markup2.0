import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialStatus } from '../../hooks/useTrialStatus';

const urgencyStyles = {
  normal: {
    border: 'border-blue-100',
    bg: '',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  warning: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/30',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  critical: {
    border: 'border-red-200',
    bg: 'bg-red-50/30',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
};

export default function TrialDashboardBanner() {
  const navigate = useNavigate();
  const { daysLeft, isTrialActive, urgency } = useTrialStatus();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('trial-banner-dismissed') === 'true');

  if (!isTrialActive || dismissed) return null;

  const styles = urgencyStyles[urgency];
  const dayLabel = daysLeft === 1 ? 'day' : 'days';

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('trial-banner-dismissed', 'true');
  };

  return (
    <div className={`bg-white border ${styles.border} ${styles.bg} rounded-xl p-4 mb-6 flex items-center gap-4 animate-fade-in`}>
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center shrink-0`}>
        <svg className={`w-5 h-5 ${styles.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          You have {daysLeft} {dayLabel} left in your free trial
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Upgrade to Pro to unlock unlimited projects, members, and premium features.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/settings?tab=billing')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade to Pro
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
