import api from "./api";
import { track } from "../monitoring/analytics";

export const getPinsApi = (projectId, pageUrl, signal, deviceMode) => {
  const params = {};
  if (pageUrl) params.pageUrl = pageUrl;
  if (deviceMode) params.deviceMode = deviceMode;
  return api.get(`/projects/${projectId}/pins`, { params, signal });
};

export const createPinApi = (projectId, data) =>
  api.post(`/projects/${projectId}/pins`, data).then((res) => {
    const pin = res.data && res.data.pin;
    track("pin_created", {
      device: pin && pin.deviceMode,
      document: !!(pin && /^doc:/.test(pin.pageUrl || "")),
    });
    return res;
  });

export const updatePinApi = (projectId, pinId, data) =>
  api.patch(`/projects/${projectId}/pins/${pinId}`, data).then((res) => {
    if (data && data.status === 'resolved') {
      track('pin_resolved', { projectId, pinId });
    }
    return res;
  });

export const uploadPinScreenshotApi = (projectId, pinId, formData) =>
  api.patch(`/projects/${projectId}/pins/${pinId}/screenshot`, formData);

export const deletePinApi = (projectId, pinId) =>
  api.delete(`/projects/${projectId}/pins/${pinId}`);

export const reorderPinsApi = (projectId, moves) =>
  api.patch(`/projects/${projectId}/pins/reorder`, { moves });

export const getMyTasksApi = () =>
  api.get("/my-tasks");

