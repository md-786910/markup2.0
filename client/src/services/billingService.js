import api from './api';
import { track } from '../monitoring/analytics';

export const getPublicPlansApi = () =>
  api.get('/plans');

export const getPlanApi = () =>
  api.get('/billing/plan');

export const upgradePlanApi = (plan) =>
  api.post('/billing/upgrade', { plan });

export const createCheckoutSessionApi = (plan) =>
  api.post('/billing/checkout-session', { plan })
    .then((res) => { track('checkout_started', { plan }); return res; });

export const verifyPaymentApi = (data) =>
  api.post('/billing/verify-payment', data)
    .then((res) => { track('checkout_completed', { plan: res.data?.organization?.plan || res.data?.plan || null }); return res; });

export const getInvoicesApi = () =>
  api.get('/billing/invoices');

export const downloadInvoicePdfApi = (id) =>
  api.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' });

export const createPortalSessionApi = () =>
  api.post('/billing/portal-session');

export const getBillingConfigApi = () =>
  api.get('/billing/config');

export const cancelSubscriptionApi = () =>
  api.post('/billing/cancel');

export const resumeSubscriptionApi = () =>
  api.post('/billing/resume');

export const getBillingDetailsApi = () =>
  api.get('/billing/details');

export const updateBillingDetailsApi = (data) =>
  api.put('/billing/details', data);