// Fallback until /api/plans answers (it returns the live plans, incl. admin
// overrides). Keep in sync with server/config/plans.js.
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    features: ['2 projects', '1 workspace', '5 team members', '2 guests', '200 MB storage', 'Basic feedback tools'],
    cta: 'Get started free',
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 12,
    priceLabel: '$12',
    period: '/month',
    features: ['15 projects', '3 workspaces', '25 team members', '10 guests', '5 GB storage', 'Guest review links', 'Slack, Jira, Discord & Teams integrations', 'Activity log'],
    cta: 'Start free trial',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceLabel: '$29',
    period: '/month',
    features: ['Unlimited projects', 'Unlimited workspaces', 'Unlimited members', '50 guests', '25 GB storage', 'Priority support', 'Slack, Jira, Discord & Teams integrations', 'Activity log & version history', 'Guest review links'],
    cta: 'Start free trial',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    period: '',
    features: ['Everything in Pro', '100 GB storage', 'Dedicated support', 'Custom integrations', 'Custom terms & onboarding'],
    cta: 'Contact sales',
    popular: false,
  },
];

export const CTA_BY_ID = {
  free: 'Get started free',
  starter: 'Start free trial',
  pro: 'Start free trial',
  enterprise: 'Contact sales',
};

export const TRIAL_NOTE = '30-day free trial with all Pro features. No credit card.';

export const PLAN_COPY = {
  free: 'For trying the basics with a small team.',
  starter: 'For small teams moving review out of email and screenshots.',
  pro: 'For agencies and product teams reviewing every week.',
  enterprise: 'For organizations that need custom limits, terms, and onboarding.',
};
