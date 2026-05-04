const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth for proxy requests. The initial HTML load also performs a User.findById
// + sessionToken check to catch deleted/disabled users and revoked sessions.
// Sub-resource requests (CSS/JS/images/fonts — anything that already has the
// __markup_proxy_ctx cookie set by the HTML response) skip the DB hit; the
// cookie itself is the trust anchor and would have been refused at the HTML
// step if the user weren't valid. Saves ~2 DB queries per sub-resource.
//
// Guest proxy requests (guest=true) skip auth — project share validation
// happens in the proxy controller instead.
module.exports = async (req, res, next) => {
  // Allow guest proxy requests through without a token.
  if (req.query && req.query.guest === 'true') {
    req.user = null;
    return next();
  }
  // Sub-resource fast path: cookie present means the HTML load was already
  // authenticated. Skip the DB round-trip.
  if (req.cookies && req.cookies.__markup_proxy_ctx) {
    try {
      const ctx = JSON.parse(req.cookies.__markup_proxy_ctx);
      if (ctx.guest === true) {
        req.user = null;
        return next();
      }
      // Authenticated sub-resource — verify JWT signature only (no DB).
      let token = null;
      if (req.query && req.query.token) token = req.query.token;
      else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
      else if (req.cookies && req.cookies.markup_token) token = req.cookies.markup_token;
      if (!token) return res.status(401).json({ message: 'No token provided' });
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        req.user = { _id: decoded.id };
        return next();
      } catch {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch {}
  }

  // Initial HTML load: full validation including DB existence + sessionToken.
  let token = null;
  if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.markup_token) {
    token = req.cookies.markup_token;
  }
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(decoded.id).select('_id sessionToken');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (decoded.sessionToken && user.sessionToken && decoded.sessionToken !== user.sessionToken) {
      return res.status(401).json({ message: 'Session expired', code: 'SESSION_REPLACED' });
    }
    req.user = { _id: user._id };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
