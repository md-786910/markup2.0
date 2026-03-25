import api from './api';

export const getProjectsApi = () =>
  api.get('/projects');

export const createProjectApi = (name, websiteUrl) =>
  api.post('/projects', { name, websiteUrl });

export const getProjectApi = (projectId, signal) =>
  api.get(`/projects/${projectId}`, { signal });

export const updateProjectApi = (projectId, data) =>
  api.patch(`/projects/${projectId}`, data);

export const deleteProjectApi = (projectId) =>
  api.delete(`/projects/${projectId}`);

export const inviteMemberApi = (projectId, email, role = 'member') =>
  api.post(`/projects/${projectId}/members`, { email, role });

export const updateMemberRoleApi = (projectId, userId, role) =>
  api.patch(`/projects/${projectId}/members/${userId}/role`, { role });

export const removeMemberApi = (projectId, userId) =>
  api.delete(`/projects/${projectId}/members/${userId}`);
