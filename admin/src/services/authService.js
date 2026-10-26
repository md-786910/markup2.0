import api from './api';

// Admin panel accounts (AdminUser) sign in on their own endpoints

export const loginApi = (email, password) =>
  api.post('/admin-auth/login', { email, password });

export const loginTwoFactorApi = (challengeToken, code) =>
  api.post('/admin-auth/login/2fa', { challengeToken, code });

export const getMeApi = () => api.get('/admin-auth/me');
export const logoutApi = () => api.post('/admin-auth/logout');

export const updateProfileApi = (data) => api.patch('/admin-auth/profile', data);
export const changePasswordApi = (currentPassword, newPassword) =>
  api.patch('/admin-auth/password', { currentPassword, newPassword });

export const forgotPasswordApi = (email) => api.post('/admin-auth/forgot-password', { email });
export const resetPasswordApi = (token, password) => api.post(`/admin-auth/reset-password/${token}`, { password });

// Two-step sign-in
export const getTwoFactorApi = () => api.get('/admin-auth/2fa');
export const startTwoFactorSetupApi = (password) => api.post('/admin-auth/2fa/setup', { password });
export const enableTwoFactorApi = (code) => api.post('/admin-auth/2fa/enable', { code });
export const disableTwoFactorApi = (password, code) => api.post('/admin-auth/2fa/disable', { password, code });
export const regenerateRecoveryCodesApi = (password, code) => api.post('/admin-auth/2fa/recovery-codes', { password, code });
