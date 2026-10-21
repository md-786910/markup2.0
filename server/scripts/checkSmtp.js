/**
 * Checks the SMTP settings from .env: connects, logs in and optionally sends
 * a test email. Prints no passwords.
 * Usage: node scripts/checkSmtp.js [send-test-to@example.com]
 *   Docker: docker compose exec server node scripts/checkSmtp.js you@example.com
 */
require('../config/env');
const net = require('net');
const { getTransporter, sendEmailVerificationOtp } = require('../utils/mailer');

const HINTS = {
  ETIMEDOUT: 'No answer from the mail server. The hosting provider or a firewall is most likely blocking outbound SMTP on this port; try 465 (SMTP_SECURE=true) or 587, or ask the provider to open it.',
  ECONNREFUSED: 'The mail server refused the connection: wrong SMTP_HOST or SMTP_PORT.',
  ENOTFOUND: 'SMTP_HOST does not resolve: check the hostname.',
  EAUTH: 'Connected, but the login was rejected: check SMTP_USER / SMTP_PASS (Gmail needs an app password).',
  ESOCKET: 'TLS mismatch: port 465 needs SMTP_SECURE=true, port 587 needs it false.',
};

(async () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  console.log(`SMTP ${host}:${port}  secure=${process.env.SMTP_SECURE === 'true' || port === 465}  user=${process.env.SMTP_USER ? 'set' : 'MISSING'}  pass=${process.env.SMTP_PASS ? 'set' : 'MISSING'}`);

  // 1. Plain TCP: can this machine reach the port at all?
  const tcp = await new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 8000 });
    socket.once('connect', () => { socket.destroy(); resolve('ok'); });
    socket.once('timeout', () => { socket.destroy(); resolve('ETIMEDOUT'); });
    socket.once('error', (err) => resolve(err.code || err.message));
  });
  console.log(`1. network connection: ${tcp === 'ok' ? 'OK' : `FAILED (${tcp})`}`);
  if (tcp !== 'ok') { console.log(`   ${HINTS[tcp] || ''}`); process.exit(1); }

  // 2. SMTP handshake + login
  try {
    await getTransporter().verify();
    console.log('2. SMTP login: OK');
  } catch (err) {
    console.log(`2. SMTP login: FAILED (${err.code || ''} ${err.message})`);
    console.log(`   ${HINTS[err.code] || ''}`);
    process.exit(1);
  }

  // 3. Optional test email
  const to = process.argv[2];
  if (to) {
    try {
      await sendEmailVerificationOtp(to, '123456');
      console.log(`3. test email (verification template, code 123456) sent to ${to}`);
    } catch (err) {
      console.log(`3. test email: FAILED (${err.code || ''} ${err.message})`);
      process.exit(1);
    }
  }
  process.exit(0);
})();
