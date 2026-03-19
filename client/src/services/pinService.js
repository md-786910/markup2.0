import api from './api';

export const getPinsApi = (projectId, pageUrl, signal, deviceMode) => {
  const params = {};
  if (pageUrl) params.pageUrl = pageUrl;
  if (deviceMode) params.deviceMode = deviceMode;
  return api.get(`/projects/${projectId}/pins`, { params, signal });
};

export const createPinApi = (projectId, data) =>
  api.post(`/projects/${projectId}/pins`, data);

export const updatePinApi = (projectId, pinId, data) =>
  api.patch(`/projects/${projectId}/pins/${pinId}`, data);

export const deletePinApi = (projectId, pinId) =>
  api.delete(`/projects/${projectId}/pins/${pinId}`);
