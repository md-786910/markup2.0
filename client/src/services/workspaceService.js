import api from './api';

export const getWorkspacesApi = () => api.get('/workspaces');

export const createWorkspaceApi = (name) => api.post('/workspaces', { name });

export const renameWorkspaceApi = (workspaceId, name) => api.patch(`/workspaces/${workspaceId}`, { name });

export const deleteWorkspaceApi = (workspaceId) => api.delete(`/workspaces/${workspaceId}`);

export const getOrgPeopleApi = () => api.get('/workspaces/people');

export const getWorkspaceMembersApi = (workspaceId) => api.get(`/workspaces/${workspaceId}/members`);

export const setWorkspaceMembersApi = (workspaceId, members) => api.put(`/workspaces/${workspaceId}/members`, { members });

export const enableWorkspaceShareApi = (workspaceId, data = {}) => api.post(`/workspaces/${workspaceId}/share`, data);

export const updateWorkspaceShareApi = (workspaceId, data) => api.patch(`/workspaces/${workspaceId}/share`, data);

export const disableWorkspaceShareApi = (workspaceId) => api.delete(`/workspaces/${workspaceId}/share`);

export const inviteToWorkspaceApi = (workspaceId, emails, role = 'member', level = 'comment') =>
  api.post(`/workspaces/${workspaceId}/invitations`, { emails, role, level });

export const getWorkspaceInvitationsApi = (workspaceId) => api.get(`/workspaces/${workspaceId}/invitations`);

export const updateOrgRoleApi = (userId, role) => api.patch(`/workspaces/people/${userId}/role`, { role });
