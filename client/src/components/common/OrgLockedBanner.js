import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function OrgLockedBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOverdue = user?.orgLockedReason === 'Payment overdue';

  if (isOverdue) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-center gap-3">
        <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-sm text-red-800">
          <span className="font-medium">Workspace locked due to an unpaid invoice.</span>
          {' '}Pay now to restore access — your workspace will unlock immediately.
        </p>
        <button
          onClick={() => navigate('/settings?tab=invoices')}
          className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shrink-0"
        >
          Pay Now
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-3">
      <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-sm text-amber-800">
        <span className="font-medium">Your workspace is locked.</span>
        {' '}{user?.orgLockedReason === 'Trial expired'
          ? 'Your trial has expired. Upgrade to restore access.'
          : 'Contact your administrator or upgrade your plan to restore access.'}
      </p>
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="px-3 py-1 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors shrink-0"
      >
        View Billing
      </button>
    </div>
  );
}
