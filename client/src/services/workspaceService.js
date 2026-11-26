import api from './api';

export const getWorkspacesApi = () => api.get('/workspaces');

export const createWorkspaceApi = (data) =>
  api.post('/workspaces', typeof data === 'string' ? { name: data } : data);

export const renameWorkspaceApi = (workspaceId, data) =>
  api.patch(`/workspaces/${workspaceId}`, typeof data === 'string' ? { name: data } : data);

export const deleteWorkspaceApi = (workspaceId) => api.delete(`/workspaces/${workspaceId}`);

export const getOrgPeopleApi = () => api.get('/workspaces/people');

export const getWorkspaceMembersApi = (workspaceId) => api.get(`/workspaces/${workspaceId}/members`);

export const setWorkspaceMembersApi = (workspaceId, members) => api.put(`/workspaces/${workspaceId}/members`, { members });

export const inviteToWorkspaceApi = (workspaceId, emails, role = 'member', level = 'comment') =>
  api.post(`/workspaces/${workspaceId}/invitations`, { emails, role, level });

export const getWorkspaceInvitationsApi = (workspaceId) => api.get(`/workspaces/${workspaceId}/invitations`);
export const getOrgInvitationsApi = () => api.get('/workspaces/invitations');

export const updateOrgRoleApi = (userId, role) => api.patch(`/workspaces/people/${userId}/role`, { role });
export const removeOrgMemberApi = (userId) => api.delete(`/workspaces/people/${userId}`);
export const transferOwnershipApi = (userId, password) => api.post(`/workspaces/people/${userId}/transfer-ownership`, { password });
