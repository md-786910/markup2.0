import api from './api';

// Dashboard
export const getStatsApi = () => api.get('/admin/stats');

// Organizations
export const getOrganizationsApi = (params) => api.get('/admin/organizations', { params });
export const getOrganizationDetailApi = (id) => api.get(`/admin/organizations/${id}`);
export const lockOrganizationApi = (id, reason) => api.patch(`/admin/organizations/${id}/lock`, { reason });
export const unlockOrganizationApi = (id) => api.patch(`/admin/organizations/${id}/unlock`);
export const setOrganizationPlanApi = (id, data) => api.patch(`/admin/organizations/${id}/plan`, data);
export const extendTrialApi = (id, days) => api.post(`/admin/organizations/${id}/extend-trial`, { days });
export const setOrganizationLimitsApi = (id, data) => api.patch(`/admin/organizations/${id}/limits`, data);
export const addOrganizationNoteApi = (id, body) => api.post(`/admin/organizations/${id}/notes`, { body });
export const updateOrganizationNoteApi = (id, noteId, data) => api.patch(`/admin/organizations/${id}/notes/${noteId}`, data);
export const deleteOrganizationNoteApi = (id, noteId) => api.delete(`/admin/organizations/${id}/notes/${noteId}`);
export const exportOrganizationsApi = (params) => api.get('/admin/organizations', { params: { ...params, format: 'csv' }, responseType: 'blob' });
export const refundInvoiceApi = (id) => api.post(`/admin/invoices/${id}/refund`);

// Admin action log
export const getAuditLogApi = (params) => api.get('/admin/audit', { params });

// Users
export const getUsersApi = (params) => api.get('/admin/users', { params });
export const getUserDetailApi = (id) => api.get(`/admin/users/${id}`);

// Projects
export const getProjectsApi = (params) => api.get('/admin/projects', { params });

// Plans
export const getPlansApi = () => api.get('/admin/plans');
export const updatePlanApi = (planId, data) => api.patch(`/admin/plans/${planId}`, data);
export const togglePlanApi = (planId) => api.patch(`/admin/plans/${planId}/toggle`);

// Payment provider settings
export const getPaymentSettingsApi = () => api.get('/admin/payment-settings');
export const updatePaymentSettingsApi = (data) => api.patch('/admin/payment-settings', data);
