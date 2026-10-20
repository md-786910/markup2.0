import axios from 'axios';

const guestApi = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api',
});

// Issued after a successful share-password check; required by the server on
// every other guest call for password-protected reviews.
let guestAccessToken = null;

guestApi.interceptors.request.use((config) => {
  if (guestAccessToken) config.headers['X-Guest-Access'] = guestAccessToken;
  return config;
});

export const getGuestProjectApi = (shareToken, password) =>
  guestApi.get(`/guest/${shareToken}`, { params: { password } }).then((res) => {
    guestAccessToken = res.data.guestAccessToken || null;
    return res;
  });

export const getGuestPinsApi = (shareToken, pageUrl, deviceMode) =>
  guestApi.get(`/guest/${shareToken}/pins`, { params: { pageUrl, deviceMode } });

export const getGuestCommentsApi = (shareToken, pinId) =>
  guestApi.get(`/guest/${shareToken}/pins/${pinId}/comments`);

export const createGuestPinApi = (shareToken, data) =>
  guestApi.post(`/guest/${shareToken}/pins`, data);

export const createGuestCommentApi = (shareToken, pinId, data) =>
  guestApi.post(`/guest/${shareToken}/pins/${pinId}/comments`, data);
