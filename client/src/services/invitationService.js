import api from './api';

export const getInvitationApi = (token) =>
  api.get(`/invitations/${token}`);

export const getProjectInvitationsApi = (projectId) =>
  api.get(`/projects/${projectId}/invitations`);

export const cancelInvitationApi = (invitationId) =>
  api.delete(`/invitations/${invitationId}`);
