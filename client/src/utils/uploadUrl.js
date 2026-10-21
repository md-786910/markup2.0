// Uploaded files (avatars, logos) are served by the API, not by the app's own host
const SERVER_URL = (process.env.REACT_APP_SERVER_URL || 'http://localhost:5000').replace(/\/+$/, '');

export function uploadUrl(filename) {
  return `${SERVER_URL}/uploads/${filename}`;
}

// Stored paths ("uploads/documents/x.jpg": attachments, screenshots, documents)
export function fileUrl(path) {
  return `${SERVER_URL}/${String(path).replace(/^\/+/, '')}`;
}
