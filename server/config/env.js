const path = require('path');
const dotenv = require('dotenv');

// The whole project uses one .env file at the repo root. Values already set in
// the environment (Docker, CI, tests) win over the file.
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const trim = (url) => url.replace(/\/+$/, '');

// Public URLs of the four apps (no trailing slash)
const URLS = {
  api: trim(process.env.API_URL || 'http://localhost:5000'),
  app: trim(process.env.APP_URL || 'http://localhost:3000'),
  admin: trim(process.env.ADMIN_URL || 'http://localhost:3001'),
  site: trim(process.env.SITE_URL || 'http://localhost:3002'),
};

// www.<site> also serves the marketing site, which calls the API from the browser
function withWww(url) {
  try {
    const u = new URL(url);
    if (u.hostname.startsWith('www.') || u.hostname === 'localhost') return [];
    return [`${u.protocol}//www.${u.host}`];
  } catch {
    return [];
  }
}

// Cookies are marked Secure when the API is served over HTTPS (live), and not on
// plain-HTTP local domains, where browsers would otherwise drop them.
const SECURE_COOKIES = URLS.api.startsWith('https://');

// Browser origins allowed to call the API (CORS + socket.io)
const ALLOWED_ORIGINS = [
  URLS.app,
  URLS.admin,
  URLS.site,
  ...withWww(URLS.site),
  ...(process.env.EXTRA_CORS_ORIGINS || '').split(',').map((o) => trim(o.trim())).filter(Boolean),
];

module.exports = { URLS, ALLOWED_ORIGINS, SECURE_COOKIES };
