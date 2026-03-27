export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    limits: { maxProjects: 3, maxMembers: 5, maxGuests: 2 },
    features: [
      '3 projects',
      '5 team members',
      '2 guests',
      'Basic feedback tools',
    ],
    badgeColor: 'gray',
    order: 0,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 12,
    priceLabel: '$12',
    period: '/month',
    limits: { maxProjects: 15, maxMembers: 25, maxGuests: 10 },
    features: [
      '15 projects',
      '25 team members',
      '10 guests',
      'Priority support',
      'Advanced filtering',
    ],
    badgeColor: 'blue',
    order: 1,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceLabel: '$29',
    period: '/month',
    popular: true,
    limits: { maxProjects: 999, maxMembers: 999, maxGuests: 50 },
    features: [
      'Unlimited projects',
      'Unlimited members',
      '50 guests',
      'Custom branding',
      'Priority support',
      'Advanced analytics',
    ],
    badgeColor: 'purple',
    order: 2,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    period: '',
    limits: { maxProjects: 9999, maxMembers: 9999, maxGuests: 9999 },
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    badgeColor: 'amber',
    order: 3,
  },
};

export const DEFAULT_TRIAL_DAYS = 30;

export const PLAN_LIST = Object.values(PLANS).sort((a, b) => a.order - b.order);

export const UPGRADEABLE_PLANS = ['starter', 'pro'];

export function getLimitsForPlan(planId) {
  if (planId === 'trial') return { ...PLANS.free.limits };
  const plan = PLANS[planId];
  return plan ? { ...plan.limits } : { ...PLANS.free.limits };
}
