import api from './api';

export const loginApi = (email, password) =>
  api.post('/auth/login', { email, password });

export const loginTwoFactorApi = (challengeToken, code) =>
  api.post('/auth/login/2fa', { challengeToken, code });

export const getMeApi = () =>
  api.get('/auth/me');

export const updateProfileApi = (data) => api.patch('/auth/profile', data);
export const changePasswordApi = (currentPassword, newPassword) =>
  api.patch('/auth/change-password', { currentPassword, newPassword });

export const forgotPasswordApi = (email) => api.post('/auth/forgot-password', { email });
export const resetPasswordApi = (token, password) => api.post(`/auth/reset-password/${token}`, { password });

// Two-step sign-in
export const getTwoFactorApi = () => api.get('/auth/2fa');
export const startTwoFactorSetupApi = (password) => api.post('/auth/2fa/setup', { password });
export const enableTwoFactorApi = (code) => api.post('/auth/2fa/enable', { code });
export const disableTwoFactorApi = (password, code) => api.post('/auth/2fa/disable', { password, code });
export const regenerateRecoveryCodesApi = (password, code) => api.post('/auth/2fa/recovery-codes', { password, code });
