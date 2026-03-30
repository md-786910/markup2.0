import api from './api';

export const getPlanApi = () =>
  api.get('/billing/plan');

export const upgradePlanApi = (plan) =>
  api.post('/billing/upgrade', { plan });

export const createCheckoutSessionApi = (plan) =>
  api.post('/billing/checkout-session', { plan });

export const createPortalSessionApi = () =>
  api.post('/billing/portal-session');
