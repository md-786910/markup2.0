import api from './api';

export const getProjectsApi = () =>
  api.get('/projects');

export const createProjectApi = (name, websiteUrl) =>
  api.post('/projects', { name, websiteUrl, projectType: 'website' });

export const createDocumentProjectApi = (name, files) => {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('projectType', 'document');
  files.forEach((f) => formData.append('documents', f));
  return api.post('/projects', formData);
};

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

export const getActivityApi = (projectId, page = 1, limit = 30) =>
  api.get(`/projects/${projectId}/activity?page=${page}&limit=${limit}`);

export const enableShareApi = (projectId, data = {}) =>
  api.post(`/projects/${projectId}/share`, data);

export const updateShareApi = (projectId, data) =>
  api.patch(`/projects/${projectId}/share`, data);

export const disableShareApi = (projectId) =>
  api.delete(`/projects/${projectId}/share`);

export const getVersionsApi = (projectId) =>
  api.get(`/projects/${projectId}/versions`);

export const createVersionApi = (projectId, data) =>
  api.post(`/projects/${projectId}/versions`, data);

export const updateVersionApi = (projectId, versionId, data) =>
  api.patch(`/projects/${projectId}/versions/${versionId}`, data);

export const deleteVersionApi = (projectId, versionId) =>
  api.delete(`/projects/${projectId}/versions/${versionId}`);
