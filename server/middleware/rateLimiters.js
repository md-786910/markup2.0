const rateLimit = require('express-rate-limit');

const FIFTEEN_MIN = 15 * 60 * 1000;

// Burst limiter for credential-touching endpoints (login, signup, OTP, validate-email,
// forgot-password). skipSuccessfulRequests: true means a legit user typing their
// password right doesn't get penalized for previous typos.
const authLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Admin tier — superadmin work involves bursts of list/edit calls in the panel.
const adminLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded.' },
});

// Catch-all default for everything else.
const globalLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded.' },
});

module.exports = { authLimiter, adminLimiter, globalLimiter };
