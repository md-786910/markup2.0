// Small input checks shared by controllers (guest writes, project URLs, pins,
// share-link passwords). Each returns a boolean or a parsed value; the caller
// answers 400 with its own message.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimum length of a review-link password (when one is set)
const MIN_SHARE_PASSWORD_LENGTH = 6;

// Trimmed guest name (1-80 chars), or null
function cleanGuestName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 80 ? name : null;
}

// Trimmed guest email (valid format, at most 254 chars), or null
function cleanGuestEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

// Website to review: http(s) with a hostname, at most 2048 chars
function isValidWebsiteUrl(value) {
  return typeof value === 'string' && value.length <= 2048 && isHttpUrl(value);
}

// Page a pin sits on: a reviewed website page (http/https) or a document page
// ("doc:<file>:page:<n>")
function isValidPageUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 4096) return false;
  return value.startsWith('doc:') || isHttpUrl(value);
}

function isHttpUrl(value) {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
  } catch {
    return false;
  }
}

// Optional number from a JSON or multipart body: undefined/null/'' -> null,
// a finite number -> that number, anything else -> NaN (the caller refuses it)
function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return NaN;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// A percentage coordinate (0-100) or NaN
function percent(value) {
  const n = optionalNumber(value);
  return n !== null && n >= 0 && n <= 100 ? n : NaN;
}

module.exports = {
  EMAIL_RE,
  MIN_SHARE_PASSWORD_LENGTH,
  cleanGuestName,
  cleanGuestEmail,
  isValidWebsiteUrl,
  isValidPageUrl,
  optionalNumber,
  percent,
};
