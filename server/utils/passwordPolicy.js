const MIN_LENGTH = 6;

// Enforced on signup + password reset. NOT on login (would lock out legacy
// accounts).
function validatePassword(pw) {
  if (typeof pw !== 'string') {
    return { ok: false, message: 'Password is required.' };
  }
  if (pw.length < MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_LENGTH} characters.` };
  }
  return { ok: true };
}

module.exports = { validatePassword, MIN_LENGTH };
