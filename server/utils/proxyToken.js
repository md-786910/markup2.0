const jwt = require('jsonwebtoken');

// Short-lived, project-scoped token for the website proxy iframe. It ends up in
// URLs readable by the proxied site's scripts and in access logs, so it must
// never be the user's session JWT: the regular auth middleware rejects it, and
// proxyAuth only accepts it for the project it was issued for.
const PROXY_TOKEN_PURPOSE = 'proxy';
const PROXY_TOKEN_TTL = '24h';

function signProxyToken(user, projectId) {
  return jwt.sign(
    { id: user._id, sessionToken: user.sessionToken, projectId: projectId.toString(), purpose: PROXY_TOKEN_PURPOSE },
    process.env.JWT_SECRET,
    { expiresIn: PROXY_TOKEN_TTL, algorithm: 'HS256' },
  );
}

function isProxyToken(decoded) {
  return !!decoded && decoded.purpose === PROXY_TOKEN_PURPOSE;
}

module.exports = { signProxyToken, isProxyToken };
