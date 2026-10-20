import api from './api';

export const getNotificationsApi = (params) => {
  return api.get('/notifications', { params });
};

export const getUnreadCountApi = () => {
  return api.get('/notifications/unread-count');
};

export const markAsReadApi = (id) => {
  return api.patch(`/notifications/${id}/read`);
};

export const markAllAsReadApi = () => {
  return api.patch('/notifications/read-all');
};

export const deleteNotificationApi = (id) => {
  return api.delete(`/notifications/${id}`);
};

export const clearAllNotificationsApi = () => {
  return api.delete('/notifications/clear-all');
};
