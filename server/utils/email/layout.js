/**
 * Shared email layout + building blocks.
 *
 * Every template is described as a list of blocks; renderEmail() turns that
 * into an email-safe HTML document (tables + inline styles, works in Gmail,
 * Outlook, Apple Mail) AND a matching plain-text part.
 *
 * Look: a white card whose top is a brand-blue header (white logo, a pill with
 * the project or email type, the title or a big count), the content below,
 * a full-width dark button, an optional "Too many emails?" card, then the
 * footer.
 *
 * Text passed to blocks is escaped automatically. Wrap words in **double
 * asterisks** to bold them (e.g. `**${actor}** commented`).
 */

const { URLS } = require('../../config/env');

const BRAND = {
  name: 'Kommently',
  tagline: 'Visual feedback for websites and documents',
  primary: '#003dff',
  primaryDark: '#0031d1',
  primarySoft: '#eef3ff',
  primaryTint: '#dbe5ff',
  onPrimaryMuted: '#c7d4ff',
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  subtle: '#94a3b8',
  border: '#e2e8f0',
  divider: '#f1f5f9',
  canvas: '#f1f5f9',
  surface: '#ffffff',
  font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

const TONES = {
  brand: { fg: '#003dff', bg: '#eef3ff', border: '#bccfff' },
  success: { fg: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  warning: { fg: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  danger: { fg: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  neutral: { fg: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escape, then turn **x** into bold text (ink by default).
function rich(value, boldColor = BRAND.ink) {
  return esc(value).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${boldColor};font-weight:600;">$1</strong>`);
}

function plain(value) {
  return String(value ?? '').replace(/\*\*(.+?)\*\*/g, '$1');
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

function clientOrigin() {
  return URLS.app;
}

// Pastel avatar colours, picked from the name so a person keeps their colour
const AVATARS = [
  { bg: '#fde8dc', fg: '#9a3412' },
  { bg: '#dcf5e8', fg: '#166534' },
  { bg: '#e0e8ff', fg: '#1e3a8a' },
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#fde2e7', fg: '#9f1239' },
  { bg: '#e2e8f0', fg: '#334155' },
];

function avatarCell(name, size = 36) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = AVATARS[h % AVATARS.length];
  return `<td width="${size}" valign="top" style="width:${size}px;"><div style="width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${c.bg};color:${c.fg};text-align:center;font-size:13px;font-weight:600;line-height:${size}px;">${esc(initials(name))}</div></td>`;
}

// Accounts have no time zone setting, so emails use one zone for everyone:
// EMAIL_TIME_ZONE (an IANA name such as Asia/Kolkata), default UTC.
function emailTimeZone() {
  return process.env.EMAIL_TIME_ZONE || 'UTC';
}

function formatTime(date) {
  try {
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: emailTimeZone() });
  } catch {
    return '';
  }
}

// "26 Nov, 6:00 PM" (+ " UTC" when no zone is configured)
function formatDayTime(date) {
  const zone = emailTimeZone();
  try {
    const d = new Date(date);
    const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: zone });
    return `${day}, ${formatTime(d)}${zone === 'UTC' ? ' UTC' : ''}`;
  } catch {
    return '';
  }
}

// ── Blocks ──────────────────────────────────────────────────────────────────

const blocks = {
  p({ text, muted }) {
    const color = muted ? BRAND.muted : BRAND.body;
    return {
      html: `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${color};">${rich(text)}</p>`,
      text: plain(text),
    };
  },

  // One message: avatar, a header line ("**Name** commented on **#19**", or
  // the name and meta), then the message itself.
  quote({ author, meta, line, html, text }) {
    const head = line
      ? rich(line)
      : `<strong style="color:${BRAND.ink};font-weight:600;">${esc(author)}</strong>${meta ? `<span style="color:${BRAND.subtle};">&nbsp;&middot;&nbsp;${esc(meta)}</span>` : ''}`;
    return {
      html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-bottom:1px solid ${BRAND.divider};">
          <tr>
            ${avatarCell(author)}
            <td valign="top" style="padding:0 0 18px 12px;">
              <div style="font-size:14px;line-height:20px;color:${BRAND.muted};">${head}</div>
              <div style="margin-top:4px;font-size:14px;line-height:22px;color:${BRAND.body};word-break:break-word;">${html}</div>
            </td>
          </tr>
        </table>`,
      text: `${line ? plain(line) : `${author}${meta ? ` · ${meta}` : ''}`}:\n"${text}"`,
    };
  },

  details({ rows }) {
    const visible = rows.filter(Boolean);
    const rowsHtml = visible.map(([label, value, opts = {}], i) => {
      const border = i < visible.length - 1 ? `border-bottom:1px solid ${BRAND.divider};` : '';
      const color = opts.tone ? TONES[opts.tone].fg : BRAND.ink;
      const weight = opts.strong ? 600 : 500;
      return `<tr>
        <td style="padding:11px 0;${border}font-size:13px;color:${BRAND.muted};">${esc(label)}</td>
        <td align="right" style="padding:11px 0;${border}font-size:14px;font-weight:${weight};color:${color};">${esc(value)}</td>
      </tr>`;
    }).join('');
    return {
      html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;border:1px solid ${BRAND.border};border-radius:12px;">
          <tr><td style="padding:4px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
          </td></tr>
        </table>`,
      text: visible.map(([label, value]) => `${label}: ${value}`).join('\n'),
    };
  },

  code({ value, caption }) {
    return {
      html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">
          <tr><td align="center" style="padding:22px 16px;background:${BRAND.primarySoft};border:1px dashed #8eaeff;border-radius:12px;">
            <div style="font-family:${BRAND.mono};font-size:32px;line-height:40px;font-weight:700;letter-spacing:10px;color:${BRAND.ink};padding-left:10px;">${esc(value)}</div>
            ${caption ? `<div style="margin-top:6px;font-size:12px;color:${BRAND.muted};">${esc(caption)}</div>` : ''}
          </td></tr>
        </table>`,
      text: `${value}${caption ? `\n(${caption})` : ''}`,
    };
  },

  // Full-width dark button (red for danger)
  button({ label, url, tone = 'brand', fallback }) {
    const bg = tone === 'danger' ? TONES.danger.fg : BRAND.ink;
    const fallbackHtml = fallback
      ? `<p style="margin:0 0 16px;font-size:12px;line-height:18px;color:${BRAND.subtle};">Button not working? Paste this link into your browser:<br><a href="${esc(url)}" style="color:${BRAND.primary};word-break:break-all;text-decoration:underline;">${esc(url)}</a></p>`
      : '';
    return {
      html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
          <tr><td align="center" bgcolor="${bg}" style="background:${bg};border-radius:10px;">
            <a href="${esc(url)}" target="_blank" style="display:block;padding:14px 24px;font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)}&nbsp;&rarr;</a>
          </td></tr>
        </table>${fallbackHtml}`,
      text: `${label}: ${url}`,
    };
  },

  callout({ tone = 'neutral', text }) {
    const t = TONES[tone];
    return {
      html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">
          <tr><td style="padding:12px 16px;background:${t.bg};border:1px solid ${t.border};border-radius:10px;font-size:13px;line-height:20px;color:${t.fg};">${rich(text, t.fg)}</td></tr>
        </table>`,
      text: plain(text),
    };
  },

  // Activity list: avatar, "**Name** commented on **#19**", a one-line
  // preview, the time and a chevron; each row links to its pin.
  digest({ items }) {
    const rows = items.map((item, i) => {
      const border = i < items.length - 1 ? `border-bottom:1px solid ${BRAND.divider};` : '';
      const preview = item.preview
        ? `<div style="margin-top:2px;font-size:14px;line-height:20px;color:${BRAND.body};">${esc(item.preview)}</div>`
        : '';
      return `<tr><td style="padding:16px 0;${border}">
        <a href="${esc(item.url)}" style="display:block;color:inherit;text-decoration:none;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${avatarCell(item.actor)}
            <td valign="top" style="padding:0 12px;font-size:14px;line-height:20px;color:${BRAND.muted};">${rich(item.text)}${preview}</td>
            <td valign="top" align="right" width="64" style="width:64px;white-space:nowrap;font-size:12px;line-height:18px;color:${BRAND.subtle};">${item.at ? esc(formatTime(item.at)) : ''}<div style="margin-top:4px;font-size:20px;line-height:20px;color:${BRAND.subtle};">&rsaquo;</div></td>
          </tr></table>
        </a>
      </td></tr>`;
    }).join('');
    return {
      html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:-16px 0 16px;">${rows}</table>`,
      text: items.map((item) => `- ${plain(item.text)}${item.preview ? ` — "${item.preview}"` : ''}\n  ${item.url}`).join('\n'),
    };
  },

  note({ text }) {
    return {
      html: `<p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.subtle};">${rich(text)}</p>`,
      text: plain(text),
    };
  },
};

// ── Document ────────────────────────────────────────────────────────────────

// White "K" tile + white wordmark, for the blue header. EMAIL_LOGO_URL must
// then be a logo that reads on blue (e.g. the white logo PNG).
function logoHtml() {
  const logoUrl = process.env.EMAIL_LOGO_URL;
  if (logoUrl) {
    return `<img src="${esc(logoUrl)}" width="140" alt="${BRAND.name}" style="display:block;border:0;height:auto;max-width:140px;">`;
  }
  return `
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td width="28" height="28" align="center" valign="middle" bgcolor="#ffffff" style="width:28px;height:28px;background:#ffffff;border-radius:7px;font-size:15px;font-weight:700;color:${BRAND.primary};line-height:28px;">K</td>
      <td style="padding-left:10px;font-size:17px;font-weight:600;letter-spacing:-0.02em;color:#ffffff;">${BRAND.name}</td>
    </tr></table>`;
}

/**
 * @param {Object} opts
 * @param {string} opts.preheader   inbox preview line
 * @param {string} [opts.badge]     pill at the top right of the header (e.g. the project name)
 * @param {string} [opts.eyebrow]   shown in the pill when there is no badge
 * @param {string} opts.title       main heading (plain text)
 * @param {string} [opts.subtitle]  line under the title (supports **bold**)
 * @param {Object} [opts.hero]      { number, label, sub }: big count instead of the title
 * @param {Array}  opts.blocks      [{ type, ...props }]
 * @param {Object} [opts.prefs]     { title, links: [{ label, url }] }: "Too many emails?" card
 * @param {string} [opts.reason]    "why am I getting this" footer line (supports **bold**)
 * @param {Object} [opts.manage]    { label, url } footer link
 * @returns {{ html: string, text: string }}
 */
function renderEmail({ preheader, badge, eyebrow, title, subtitle, hero, blocks: list, prefs, reason, manage }) {
  const rendered = list.filter(Boolean).map((b) => blocks[b.type](b));
  const year = new Date().getFullYear();
  const pill = badge || eyebrow;
  const prefLinks = (prefs && prefs.links) || [];

  const pillHtml = pill
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="right"><tr><td style="padding:4px 10px;border:1px solid #ffffff;border-radius:999px;font-size:11px;font-weight:600;line-height:14px;text-transform:uppercase;color:#ffffff;white-space:nowrap;">${esc(pill)}</td></tr></table>`
    : '';

  const headingHtml = hero
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td valign="middle" class="k-hero-num" style="padding-right:14px;font-size:56px;line-height:56px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;">${esc(hero.number)}</td>
          <td valign="middle">
            <div style="font-size:20px;line-height:26px;font-weight:600;color:#ffffff;">${esc(hero.label)}</div>
            ${hero.sub ? `<div style="font-size:13px;line-height:18px;color:${BRAND.onPrimaryMuted};">${esc(hero.sub)}</div>` : ''}
          </td>
        </tr></table>`
    : `<h1 class="k-title" style="margin:0;font-size:24px;line-height:31px;font-weight:600;letter-spacing:-0.015em;color:#ffffff;">${esc(title)}</h1>
        ${subtitle ? `<p style="margin:6px 0 0;font-size:14px;line-height:20px;color:${BRAND.onPrimaryMuted};">${rich(subtitle, '#ffffff')}</p>` : ''}`;

  const prefsHtml = prefLinks.length
    ? `<tr><td style="padding-top:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.surface}" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;">
          <tr><td class="k-prefs" style="padding:20px 24px 14px;font-family:${BRAND.font};">
            <div style="margin:0 0 12px;font-size:13px;font-weight:600;color:${BRAND.ink};">${esc(prefs.title || 'Too many emails?')}</div>
            ${prefLinks.map((l) => `<a href="${esc(l.url)}" style="display:inline-block;margin:0 6px 6px 0;padding:8px 14px;border:1px solid ${BRAND.border};border-radius:999px;font-size:13px;line-height:18px;color:${BRAND.ink};text-decoration:none;">${esc(l.label)}</a>`).join('')}
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const manageHtml = manage
    ? ` <a href="${esc(manage.url)}" style="color:${BRAND.muted};text-decoration:underline;">${esc(manage.label)}</a>`
    : '';

  // mailer.send() puts the unsubscribe link at <!--k-unsubscribe--> in notification emails
  const reasonHtml = reason
    ? `<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:${BRAND.muted};">${rich(reason)}${manageHtml}<!--k-unsubscribe--></p>`
    : '<!--k-unsubscribe-->';

  const heading = hero ? `${hero.number} ${hero.label}` : title;

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(heading)}</title>
<style>
  body { margin:0; padding:0; }
  a { color:${BRAND.primary}; }
  @media only screen and (max-width:600px) {
    .k-outer { padding:16px 10px !important; }
    .k-head { padding:22px 20px 26px !important; }
    .k-body { padding:20px 20px 24px !important; }
    .k-prefs { padding:18px 20px 12px !important; }
    .k-title { font-size:21px !important; line-height:28px !important; }
    .k-hero-num { font-size:46px !important; line-height:46px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:${BRAND.font};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.canvas}" style="background:${BRAND.canvas};">
  <tr><td align="center" class="k-outer" style="padding:36px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.surface}" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;border-collapse:separate;">
          <tr><td class="k-head" bgcolor="${BRAND.primary}" style="background:${BRAND.primary};border-radius:15px 15px 0 0;padding:26px 32px 30px;font-family:${BRAND.font};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr>
              <td valign="middle"><a href="${esc(clientOrigin())}" style="text-decoration:none;">${logoHtml()}</a></td>
              <td valign="middle" align="right">${pillHtml}</td>
            </tr></table>
            ${headingHtml}
          </td></tr>
          <tr><td class="k-body" style="padding:28px 32px 28px;font-family:${BRAND.font};">
            ${rendered.map((r) => r.html).join('\n')}
          </td></tr>
        </table>
      </td></tr>
      ${prefsHtml}
      <tr><td style="padding:22px 8px 0;font-family:${BRAND.font};">
        ${reasonHtml}
        <p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.muted};">&copy; ${year} ${BRAND.name} &middot; ${BRAND.tagline}</p>
        ${postalAddress() ? `<p style="margin:4px 0 0;font-size:12px;line-height:18px;color:${BRAND.subtle};">${esc(postalAddress())}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const textHeading = hero && hero.sub ? `${heading} (${hero.sub})` : heading;
  const text = [
    textHeading,
    '='.repeat(Math.min(textHeading.length, 60)),
    subtitle ? plain(subtitle) : null,
    '',
    rendered.map((r) => r.text).join('\n\n'),
    prefLinks.length ? `\n${prefs.title || 'Too many emails?'}\n${prefLinks.map((l) => `${l.label}: ${l.url}`).join('\n')}` : null,
    '',
    '---',
    reason ? plain(reason) + (manage ? ` ${manage.label}: ${manage.url}` : '') : null,
    `© ${year} ${BRAND.name} · ${BRAND.tagline}`,
    postalAddress() || null,
  ].filter((line) => line !== null).join('\n');

  return { html, text };
}

// Sender's physical address, required in commercial email (CAN-SPAM)
function postalAddress() {
  return process.env.COMPANY_POSTAL_ADDRESS || '';
}

module.exports = { renderEmail, BRAND, TONES, esc, clientOrigin, formatDayTime };
