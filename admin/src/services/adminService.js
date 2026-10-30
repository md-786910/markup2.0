import api from './api';

// Dashboard
export const getStatsApi = () => api.get('/admin/stats');

// Organizations
export const getOrganizationsApi = (params) => api.get('/admin/organizations', { params });
export const getOrganizationDetailApi = (id) => api.get(`/admin/organizations/${id}`);
export const lockOrganizationApi = (id, reason) => api.patch(`/admin/organizations/${id}/lock`, { reason });
export const unlockOrganizationApi = (id) => api.patch(`/admin/organizations/${id}/unlock`);
export const setOrganizationPlanApi = (id, data) => api.patch(`/admin/organizations/${id}/plan`, data);
export const extendTrialApi = (id, days, reason) => api.post(`/admin/organizations/${id}/extend-trial`, { days, reason });
export const setOrganizationLimitsApi = (id, data) => api.patch(`/admin/organizations/${id}/limits`, data);
export const setOrganizationDealApi = (id, data) => api.patch(`/admin/organizations/${id}/deal`, data);
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
export const getPlanUsageImpactApi = (planId, params) => api.get(`/admin/plans/${planId}/impact`, { params });
export const updatePlanApi = (planId, data) => api.patch(`/admin/plans/${planId}`, data);
export const togglePlanApi = (planId) => api.patch(`/admin/plans/${planId}/toggle`);

// Revenue & Invoices
export const getRevenueApi = () => api.get('/admin/revenue');
export const getInvoicesApi = (params) => api.get('/admin/invoices', { params });
export const exportInvoicesApi = (params) => api.get('/admin/invoices', { params: { ...params, format: 'csv' }, responseType: 'blob' });

// Support inbox
export const getSupportStatsApi = () => api.get('/admin/support/stats');
export const getSupportTicketsApi = (params) => api.get('/admin/support/tickets', { params });
export const getSupportTicketApi = (id) => api.get(`/admin/support/tickets/${id}`);
export const replySupportTicketApi = (id, data) => api.post(`/admin/support/tickets/${id}/messages`, data);
export const updateSupportTicketApi = (id, data) => api.patch(`/admin/support/tickets/${id}`, data);

// Admin team
export const getAdminsApi = () => api.get('/admin/admins');
export const inviteAdminApi = (data) => api.post('/admin/admins', data);
export const resendAdminInviteApi = (id) => api.post(`/admin/admins/${id}/resend`);
export const setAdminStatusApi = (id, status) => api.patch(`/admin/admins/${id}`, { status });
export const removeAdminApi = (id) => api.delete(`/admin/admins/${id}`);
export const resetAdminTwoFactorApi = (id) => api.post(`/admin/admins/${id}/reset-2fa`);

// Payment provider settings
export const getPaymentSettingsApi = () => api.get('/admin/payment-settings');
export const updatePaymentSettingsApi = (data) => api.patch('/admin/payment-settings', data);

// Global trial settings
export const getTrialSettingsApi = () => api.get('/admin/trial-settings');
export const updateTrialSettingsApi = (data) => api.patch('/admin/trial-settings', data);
