import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialStatus } from '../../hooks/useTrialStatus';
import { Banner, Button, IconButton } from '../kc';

// Near the end of the trial (7 days or fewer) the Projects page opens with a
// banner; the trial card in the context panel shows the countdown otherwise.
export default function TrialDashboardBanner() {
  const navigate = useNavigate();
  const { daysLeft, isTrialActive, urgency } = useTrialStatus();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('trial-banner-dismissed') === 'true'; } catch { return false; }
  });

  if (!isTrialActive || dismissed || urgency === 'normal') return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem('trial-banner-dismissed', 'true'); } catch { /* private mode */ }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Banner
        tone="warning"
        title={`${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your Pro trial`}
        action={(
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <Button size="sm" variant="primary" onClick={() => navigate('/settings?tab=billing')}>Choose a plan</Button>
            <IconButton icon="x" label="Dismiss" onClick={dismiss} />
          </span>
        )}
      >
        Choose a plan to keep your projects, pins and review links when it ends.
      </Banner>
    </div>
  );
}
