import api from './api';

export const loginApi = (email, password) =>
  api.post('/auth/login', { email, password });

export const signupApi = (name, email, password) =>
  api.post('/auth/signup', { name, email, password });

export const getMeApi = () =>
  api.get('/auth/me');
