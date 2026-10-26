const crypto = require('crypto');

// AES-256-GCM for small secrets stored in the database (2FA keys).
// Key: TWO_FACTOR_KEY, else derived from JWT_SECRET. Changing either key makes
// stored secrets unreadable, so set TWO_FACTOR_KEY once and keep it.
function key() {
  const material = process.env.TWO_FACTOR_KEY || `${process.env.JWT_SECRET}:two-factor`;
  return crypto.createHash('sha256').update(material).digest();
}

function seal(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

function open(sealed) {
  const [version, iv, tag, data] = String(sealed || '').split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unreadable secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { seal, open };
