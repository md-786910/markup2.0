import api from './api';

export const getCommentsApi = (pinId) =>
  api.get(`/pins/${pinId}/comments`);

export const createCommentApi = (pinId, formData) =>
  api.post(`/pins/${pinId}/comments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteCommentApi = (pinId, commentId) =>
  api.delete(`/pins/${pinId}/comments/${commentId}`);
