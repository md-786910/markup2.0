import api from './api';

export const loginApi = (email, password) =>
  api.post('/auth/login', { email, password });

export const validateEmailApi = (email) =>
  api.post('/auth/validate-email', { email });

export const signupApi = (name, email, password) =>
  api.post('/auth/signup', { name, email, password });

export const getMeApi = () =>
  api.get('/auth/me');

export const forgotPasswordApi = (email) =>
  api.post('/auth/forgot-password', { email });

export const resetPasswordApi = (token, password) =>
  api.post(`/auth/reset-password/${token}`, { password });

export const updateProfileApi = (data) =>
  api.patch('/auth/profile', data);

export const changePasswordApi = (currentPassword, newPassword) =>
  api.patch('/auth/change-password', { currentPassword, newPassword });

export const uploadAvatarApi = (formData) =>
  api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteAccountApi = () =>
  api.delete('/auth/account');

export const updateOrganizationApi = (formData) =>
  api.patch('/auth/organization', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
