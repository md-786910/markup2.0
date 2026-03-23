import api from './api';

export const loginApi = (email, password) =>
  api.post('/auth/login', { email, password });

export const signupApi = (name, email, password) =>
  api.post('/auth/signup', { name, email, password });

export const getMeApi = () =>
  api.get('/auth/me');

export const forgotPasswordApi = (email) =>
  api.post('/auth/forgot-password', { email });

export const resetPasswordApi = (token, password) =>
  api.post(`/auth/reset-password/${token}`, { password });
