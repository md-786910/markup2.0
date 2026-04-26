import api from './api';

export const getPublicPlansApi = () =>
  api.get('/plans');

export const getPlanApi = () =>
  api.get('/billing/plan');

export const upgradePlanApi = (plan) =>
  api.post('/billing/upgrade', { plan });

export const createCheckoutSessionApi = (plan) =>
  api.post('/billing/checkout-session', { plan });

export const verifyPaymentApi = (data) =>
  api.post('/billing/verify-payment', data);

export const getInvoicesApi = () =>
  api.get('/billing/invoices');

export const downloadInvoicePdfApi = (id) =>
  api.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' });

export const createPortalSessionApi = () =>
  api.post('/billing/portal-session');