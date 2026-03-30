import axios from 'axios';

const guestApi = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api',
});

export const getGuestProjectApi = (shareToken, password) =>
  guestApi.get(`/guest/${shareToken}`, { params: { password } });

export const getGuestPinsApi = (shareToken, pageUrl, deviceMode) =>
  guestApi.get(`/guest/${shareToken}/pins`, { params: { pageUrl, deviceMode } });

export const getGuestCommentsApi = (shareToken, pinId) =>
  guestApi.get(`/guest/${shareToken}/pins/${pinId}/comments`);

export const createGuestPinApi = (shareToken, data) =>
  guestApi.post(`/guest/${shareToken}/pins`, data);

export const createGuestCommentApi = (shareToken, pinId, data) =>
  guestApi.post(`/guest/${shareToken}/pins/${pinId}/comments`, data);
