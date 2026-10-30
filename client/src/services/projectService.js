import api from './api';
import { track } from '../monitoring/analytics';

export const getProjectsApi = () =>
  api.get('/projects');

export const createProjectApi = (name, websiteUrl, workspace) =>
  api.post('/projects', { name, websiteUrl, projectType: 'website', workspace })
    .then((res) => { track('project_created', { type: 'website' }); return res; });

export const createDocumentProjectApi = (name, files, workspace) => {
  const formData = new FormData();
  formData.append('name', name);
  if (workspace) formData.append('workspace', workspace);
  formData.append('projectType', 'document');
  files.forEach((f) => formData.append('documents', f));
  return api.post('/projects', formData)
    .then((res) => { track('project_created', { type: 'document', documents: files.length }); return res; });
};

export const getProjectApi = (projectId, signal) =>
  api.get(`/projects/${projectId}`, { signal });

export const updateProjectApi = (projectId, data) =>
  api.patch(`/projects/${projectId}`, data);

export const deleteProjectApi = (projectId) =>
  api.delete(`/projects/${projectId}`);

export const inviteMemberApi = (projectId, email, role = 'member') =>
  api.post(`/projects/${projectId}/members`, { email, role })
    .then((res) => { track('member_invited', { role }); return res; });

export const getWorkspaceMembersApi = (projectId) =>
  api.get(`/projects/${projectId}/workspace-members`);

export const updateMemberAccessApi = (projectId, userId, level) =>
  api.patch(`/projects/${projectId}/members/${userId}/access`, { level });

export const updateMemberRoleApi = (projectId, userId, role) =>
  api.patch(`/projects/${projectId}/members/${userId}/role`, { role });

export const removeMemberApi = (projectId, userId) =>
  api.delete(`/projects/${projectId}/members/${userId}`);

export const getActivityApi = (projectId, page = 1, limit = 30) =>
  api.get(`/projects/${projectId}/activity?page=${page}&limit=${limit}`);

export const enableShareApi = (projectId, data = {}) =>
  api.post(`/projects/${projectId}/share`, data)
    .then((res) => { track('share_link_enabled', { projectId }); return res; });

export const updateShareApi = (projectId, data) =>
  api.patch(`/projects/${projectId}/share`, data);

export const disableShareApi = (projectId) =>
  api.delete(`/projects/${projectId}/share`);

export const getVersionsApi = (projectId) =>
  api.get(`/projects/${projectId}/versions`);

export const createVersionApi = (projectId, data) =>
  api.post(`/projects/${projectId}/versions`, data)
    .then((res) => { track('version_created', { projectId }); return res; });

export const updateVersionApi = (projectId, versionId, data) =>
  api.patch(`/projects/${projectId}/versions/${versionId}`, data);

export const deleteVersionApi = (projectId, versionId) =>
  api.delete(`/projects/${projectId}/versions/${versionId}`);

export const updateProjectEmailNotificationsApi = (projectId, enabled) =>
  api.patch(`/projects/${projectId}/email-notifications`, { enabled });

export const recordMemberDecisionApi = (projectId, data) =>
  api.post(`/projects/${projectId}/decision`, data)
    .then((res) => { track('decision_recorded', { projectId, decision: data?.decision }); return res; });

export const getApprovalsApi = (projectId) =>
  api.get(`/projects/${projectId}/approvals`);

export const updateReviewSettingsApi = (projectId, data) =>
  api.patch(`/projects/${projectId}/review`, data);

