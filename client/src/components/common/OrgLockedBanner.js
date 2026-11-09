import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Banner, Button } from '../kc';

// Page-level state at the top of the content (design system Banner)
export default function OrgLockedBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOverdue = user?.orgLockedReason === 'Payment overdue';
  const isDeletion = !!user?.orgDeletionScheduledAt || user?.orgLockedReason === 'Deletion scheduled';

  if (isDeletion) {
    const scheduledAt = user?.orgDeletionScheduledAt ? new Date(user.orgDeletionScheduledAt) : null;
    const deletionDate = scheduledAt?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    return (
      <Banner
        tone="danger"
        title={deletionDate ? `Organization scheduled for deletion on ${deletionDate}` : 'Organization scheduled for deletion'}
        action={<Button size="sm" onClick={() => navigate('/settings?tab=data')}>Review settings</Button>}
      >
        Everything is currently in read-only mode. You can cancel the deletion in Data &amp; privacy before the grace period ends.
      </Banner>
    );
  }

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
