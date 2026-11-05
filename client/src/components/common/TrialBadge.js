import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialStatus } from '../../hooks/useTrialStatus';
import { useAuth } from '../../hooks/useAuth';

// Trial card at the bottom of the context panel (design system TrialCard):
// "Pro trial · 12 of 30 days left", a brand progress bar and "Choose a plan".
// Free plan: the plan name and the same link. Paid plans: nothing.
export default function TrialBadge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { daysLeft, trialDays, progressPercent, isTrialActive } = useTrialStatus();
  const choose = (e) => { e.preventDefault(); navigate('/settings?tab=billing'); };

  if (!isTrialActive && user?.orgPlan === 'free') {
    return (
      <div className="kc-trial">
        <div className="row"><span>Free plan</span></div>
        <a href="/settings?tab=billing" className="kc-link" onClick={choose} style={{ display: 'inline-block', marginTop: 6 }}>Choose a plan</a>
      </div>
    );
  }
  if (!isTrialActive) return null;

  return (
    <div className="kc-trial">
      <div className="row">
        <span>Pro trial</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{daysLeft} of {trialDays} days left</span>
      </div>
      <div className="pb" role="progressbar" aria-label="Trial used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)}>
        <i style={{ width: `${progressPercent}%` }} />
      </div>
      <a href="/settings?tab=billing" className="kc-link" onClick={choose}>Choose a plan</a>
    </div>
  );
}
