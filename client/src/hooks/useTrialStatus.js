import { useAuth } from './useAuth';
import { DEFAULT_TRIAL_DAYS } from '../config/plans';

export function useTrialStatus() {
  const { user } = useAuth();

  const orgPlan = user?.orgPlan;
  const trialEndsAt = user?.orgTrialEndsAt;
  const trialDays = user?.orgTrialDays || DEFAULT_TRIAL_DAYS;
  const isTrial = orgPlan === 'trial';

  if (!isTrial || !trialEndsAt) {
    return {
      daysLeft: 0,
      trialDays,
      progressPercent: 100,
      isTrial: false,
      isTrialActive: false,
      urgency: 'normal',
    };
  }

  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.min(100, Math.max(0, ((trialDays - daysLeft) / trialDays) * 100));
  const isTrialActive = daysLeft > 0;

  let urgency = 'normal';
  if (daysLeft <= 3) urgency = 'critical';
  else if (daysLeft <= 7) urgency = 'warning';

  return { daysLeft, trialDays, progressPercent, isTrial, isTrialActive, urgency };
}
