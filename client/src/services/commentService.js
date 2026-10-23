import api from './api';
import { track } from '../monitoring/analytics';

export const getCommentsApi = (pinId) =>
  api.get(`/pins/${pinId}/comments`);

export const createCommentApi = (pinId, formData) =>
  api.post(`/pins/${pinId}/comments`, formData)
    .then((res) => { track('comment_posted', { attachments: formData && formData.getAll ? formData.getAll('attachments').length : 0 }); return res; });

export const updateCommentApi = (pinId, commentId, data) =>
  api.patch(`/pins/${pinId}/comments/${commentId}`, data);

export const deleteCommentApi = (pinId, commentId) =>
  api.delete(`/pins/${pinId}/comments/${commentId}`);
