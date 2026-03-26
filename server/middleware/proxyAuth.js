const jwt = require('jsonwebtoken');

// Lightweight JWT-only auth for proxy sub-resource requests.
// Verifies the token signature without hitting the database,
// eliminating ~2 DB queries per sub-resource (User.findById + Organization.findById).
module.exports = (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
