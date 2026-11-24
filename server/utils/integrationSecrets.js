// Integration secrets at rest (Slack/Discord/Teams webhook URLs, Jira API
// token): AES-256-GCM via utils/secretBox.js, stored as "enc:v1.<iv>.<tag>.<data>".
// Rows saved before encryption keep plaintext values; they are still read as
// is and get encrypted the next time the integration is saved.
const { seal, open } = require('./secretBox');

const PREFIX = 'enc:';
const SECRET_FIELDS = ['webhookUrl', 'apiToken'];

function isSealed(value) {
  return typeof value === 'string' && value.startsWith(`${PREFIX}v1.`);
}

function sealSecret(value) {
  if (typeof value !== 'string' || !value || isSealed(value)) return value;
  return PREFIX + seal(value);
}

// Plain value of a stored secret (plaintext legacy values pass through).
// Throws when an encrypted value can't be read (the key changed).
function revealSecret(value) {
  if (!isSealed(value)) return value;
  try {
    return open(value.slice(PREFIX.length));
  } catch {
    throw new Error('Stored integration secret cannot be decrypted. Reconnect the integration.');
  }
}

// Copy of a config object with its secret fields encrypted / decrypted
function sealConfig(config) {
  if (!config || typeof config !== 'object') return config;
  const out = { ...config };
  for (const field of SECRET_FIELDS) if (out[field] !== undefined) out[field] = sealSecret(out[field]);
  return out;
}

function revealConfig(config) {
  if (!config || typeof config !== 'object') return config;
  const out = { ...config };
  for (const field of SECRET_FIELDS) if (out[field] !== undefined) out[field] = revealSecret(out[field]);
  return out;
}

module.exports = { SECRET_FIELDS, isSealed, sealSecret, revealSecret, sealConfig, revealConfig };
