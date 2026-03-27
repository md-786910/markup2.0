import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function OrgLockedBanner() {
  const navigate = useNavigate();

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-3">
      <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-sm text-amber-800">
        <span className="font-medium">Your free trial has expired.</span>
        {' '}Upgrade to continue creating projects, inviting members, and collaborating.
      </p>
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="px-3 py-1 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors shrink-0"
      >
        Upgrade Now
      </button>
    </div>
  );
}
