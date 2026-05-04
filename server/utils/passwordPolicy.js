const MIN_LENGTH = 10;

// Enforced on signup + password reset. NOT on login (would lock out legacy
// accounts that were created when the minimum was 6).
function validatePassword(pw) {
  if (typeof pw !== 'string') {
    return { ok: false, message: 'Password is required.' };
  }
  if (pw.length < MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_LENGTH} characters.` };
  }
  if (!/[A-Za-z]/.test(pw)) {
    return { ok: false, message: 'Password must contain at least one letter.' };
  }
  if (!/\d/.test(pw)) {
    return { ok: false, message: 'Password must contain at least one digit.' };
  }
  return { ok: true };
}

module.exports = { validatePassword, MIN_LENGTH };
