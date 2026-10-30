import axios from 'axios';

const guestApi = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL || 'http://localhost:5000/api',
});

// Issued after a successful share-password check; required by the server on
// every other guest call for password-protected reviews. Kept per link for the
// browser session, so one password covers every project of a workspace link
// ("<workspaceToken>.<projectId>" shares the workspace token's key).
let guestAccessToken = null;
const linkKey = (shareToken) => `kommently.guest.${String(shareToken).split('.')[0]}`;
const readToken = (shareToken) => {
  try { return sessionStorage.getItem(linkKey(shareToken)); } catch { return null; }
};
const storeToken = (shareToken, token) => {
  try {
    if (token) sessionStorage.setItem(linkKey(shareToken), token);
    else sessionStorage.removeItem(linkKey(shareToken));
  } catch { /* storage blocked */ }
};

guestApi.interceptors.request.use((config) => {
  if (guestAccessToken) config.headers['X-Guest-Access'] = guestAccessToken;
  return config;
});

export const getGuestProjectApi = (shareToken, password) => {
  if (!password) guestAccessToken = readToken(shareToken);
  return guestApi.get(`/guest/${shareToken}`, { params: { password } }).then((res) => {
    guestAccessToken = res.data.guestAccessToken || null;
    storeToken(shareToken, guestAccessToken);
    return res;
  });
};

export const getGuestWorkspaceApi = (workspaceToken, password) => {
  if (!password) guestAccessToken = readToken(workspaceToken);
  return guestApi.get(`/guest/workspace/${workspaceToken}`, { params: { password } }).then((res) => {
    guestAccessToken = res.data.guestAccessToken || null;
    storeToken(workspaceToken, guestAccessToken);
    return res;
  });
};

export const getGuestPinsApi = (shareToken, pageUrl, deviceMode) =>
  guestApi.get(`/guest/${shareToken}/pins`, { params: { pageUrl, deviceMode } });

export const getGuestCommentsApi = (shareToken, pinId) =>
  guestApi.get(`/guest/${shareToken}/pins/${pinId}/comments`);

export const createGuestPinApi = (shareToken, data) =>
  guestApi.post(`/guest/${shareToken}/pins`, data);

export const createGuestCommentApi = (shareToken, pinId, data) =>
  guestApi.post(`/guest/${shareToken}/pins/${pinId}/comments`, data);

export const recordGuestDecisionApi = (shareToken, data) =>
  guestApi.post(`/guest/${shareToken}/decision`, data);
