import api from './api';

export const getCommentsApi = (pinId) =>
  api.get(`/pins/${pinId}/comments`);

export const createCommentApi = (pinId, formData) =>
  api.post(`/pins/${pinId}/comments`, formData);

export const updateCommentApi = (pinId, commentId, data) =>
  api.patch(`/pins/${pinId}/comments/${commentId}`, data);

export const deleteCommentApi = (pinId, commentId) =>
  api.delete(`/pins/${pinId}/comments/${commentId}`);
