import api from './api';

export const getPlanApi = () =>
  api.get('/billing/plan');

export const upgradePlanApi = (plan) =>
  api.post('/billing/upgrade', { plan });
