import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Banner, Button } from '../kc';

// Page-level state at the top of the content (design system Banner)
export default function OrgLockedBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOverdue = user?.orgLockedReason === 'Payment overdue';

  if (isOverdue) {
    return (
      <Banner
        tone="danger"
        title="Organization locked: an invoice is unpaid"
        action={<Button size="sm" variant="primary" onClick={() => navigate('/settings?tab=billing')}>Pay invoice</Button>}
      >
        Pay it to restore access. Everything unlocks as soon as the payment goes through.
      </Banner>
    );
  }

  return (
    <Banner
      tone="warning"
      title="Your organization is locked"
      action={<Button size="sm" onClick={() => navigate('/settings?tab=billing')}>Choose a plan</Button>}
    >
      {user?.orgLockedReason === 'Trial expired'
        ? 'The trial has ended. Choose a plan to restore access.'
        : 'Ask your administrator, or choose a plan to restore access.'}
    </Banner>
  );
}
