// Uploaded files (avatars, logos) are served by the API, not by the app's own host
const SERVER_URL = (process.env.REACT_APP_SERVER_URL || 'http://localhost:5000').replace(/\/+$/, '');

export function uploadUrl(filename) {
  return `${SERVER_URL}/uploads/${filename}`;
}
