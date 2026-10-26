const MIN_LENGTH = 8;
// Admin accounts can change every customer's plan, so they need longer passwords
const ADMIN_MIN_LENGTH = 12;

// Enforced on signup, password change and reset. NOT on login (would lock out
// legacy accounts).
function validatePassword(pw, { role } = {}) {
  const min = role === 'superadmin' ? ADMIN_MIN_LENGTH : MIN_LENGTH;
  if (typeof pw !== 'string') {
    return { ok: false, message: 'Password is required.' };
  }
  if (pw.length < min) {
    return { ok: false, message: `Password must be at least ${min} characters.` };
  }
  return { ok: true };
}

module.exports = { validatePassword, MIN_LENGTH, ADMIN_MIN_LENGTH };
