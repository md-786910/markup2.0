/**
 * Shared email layout + building blocks.
 *
 * Every template is described as a list of blocks; renderEmail() turns that
 * into an email-safe HTML document (tables + inline styles, works in Gmail,
 * Outlook, Apple Mail) AND a matching plain-text part.
 *
 * Text passed to blocks is escaped automatically. Wrap words in **double
 * asterisks** to bold them (e.g. `**${actor}** commented`).
 */

const { URLS } = require('../../config/env');

const BRAND = {
  name: 'Kommently',
  tagline: 'Visual feedback for websites and documents',
  primary: '#176b57',
  primaryDark: '#0f5f4c',
  primarySoft: '#edf8f0',
  primaryTint: '#d9f0df',
  ink: '#0d2a23',
  body: '#2d443b',
  muted: '#637a71',
  subtle: '#8ca39a',
  border: '#d7e7dc',
  divider: '#eaf4ed',
  canvas: '#f4f9f4',
  surface: '#ffffff',
  font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

const TONES = {
  brand: { fg: '#176b57', bg: '#edf8f0', border: '#bfe4ca' },
  success: { fg: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  warning: { fg: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  danger: { fg: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  neutral: { fg: '#435b52', bg: '#eaf4ed', border: '#d7e7dc' },
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escape, then turn **x** into bold ink text.
function rich(value) {
  return esc(value).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${BRAND.ink};font-weight:600;">$1</strong>`);
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

// ── Blocks ──────────────────────────────────────────────────────────────────

const blocks = {
  p({ text, muted }) {
    const color = muted ? BRAND.muted : BRAND.body;
    return {
      html: `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${color};">${rich(text)}</p>`,
      text: plain(text),
    };
  },

  quote({ author, meta, html, text }) {
    const metaHtml = meta
      ? `<span style="color:${BRAND.subtle};font-size:12px;font-weight:400;">&nbsp;&middot;&nbsp;${esc(meta)}</span>`
      : '';
    return {
      html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;background:${BRAND.canvas};border:1px solid ${BRAND.border};border-radius:12px;">
          <tr><td style="padding:16px 18px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td width="28" valign="middle" style="width:28px;height:28px;background:${BRAND.primaryTint};border-radius:14px;text-align:center;font-size:11px;font-weight:700;color:${BRAND.primary};line-height:28px;">${esc(initials(author))}</td>
              <td valign="middle" style="padding-left:10px;font-size:13px;font-weight:600;color:${BRAND.ink};">${esc(author)}${metaHtml}</td>
            </tr></table>
            <div style="margin-top:10px;font-size:14px;line-height:22px;color:${BRAND.body};word-break:break-word;">${html}</div>
          </td></tr>
        </table>`,
      text: `${author}${meta ? ` · ${meta}` : ''}:\n"${text}"`,
    };
  },

  details({ rows }) {
    const visible = rows.filter(Boolean);
    const rowsHtml = visible.map(([label, value, opts = {}], i) => {
      const border = i < visible.length - 1 ? `border-bottom:1px solid ${BRAND.divider};` : '';
      const color = opts.tone ? TONES[opts.tone].fg : BRAND.ink;
      const weight = opts.strong ? 700 : 500;
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
          <tr><td align="center" style="padding:22px 16px;background:${BRAND.primarySoft};border:1px dashed #9ad3ae;border-radius:12px;">
            <div style="font-family:${BRAND.mono};font-size:32px;line-height:40px;font-weight:700;letter-spacing:10px;color:${BRAND.ink};padding-left:10px;">${esc(value)}</div>
            ${caption ? `<div style="margin-top:6px;font-size:12px;color:${BRAND.muted};">${esc(caption)}</div>` : ''}
          </td></tr>
        </table>`,
      text: `${value}${caption ? `\n(${caption})` : ''}`,
    };
  },

  button({ label, url, tone = 'brand', fallback }) {
    const bg = tone === 'danger' ? TONES.danger.fg : BRAND.primary;
    const fallbackHtml = fallback
      ? `<p style="margin:0 0 16px;font-size:12px;line-height:18px;color:${BRAND.subtle};">Button not working? Paste this link into your browser:<br><a href="${esc(url)}" style="color:${BRAND.primary};word-break:break-all;text-decoration:underline;">${esc(url)}</a></p>`
      : '';
    return {
      html: `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
          <tr><td align="center" bgcolor="${bg}" style="background:${bg};border-radius:10px;">
            <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)}&nbsp;&rarr;</a>
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
          <tr><td style="padding:12px 16px;background:${t.bg};border:1px solid ${t.border};border-radius:10px;font-size:13px;line-height:20px;color:${t.fg};">${rich(text).replace(new RegExp(`color:${BRAND.ink}`, 'g'), `color:${t.fg}`)}</td></tr>
        </table>`,
      text: plain(text),
    };
  },

  digest({ sections }) {
    const html = sections.map((section) => {
      const t = TONES[section.tone || 'brand'];
      const items = section.items.map((item, i) => {
        const border = i < section.items.length - 1 ? `border-bottom:1px solid ${BRAND.divider};` : '';
        const preview = item.preview
          ? `<div style="margin-top:3px;font-size:13px;line-height:19px;color:${BRAND.muted};">&ldquo;${esc(item.preview)}&rdquo;</div>`
          : '';
        return `<tr>
          <td width="14" valign="top" style="padding:15px 0 12px;${border}"><div style="width:8px;height:8px;border-radius:4px;background:${t.fg};"></div></td>
          <td valign="top" style="padding:10px 12px 10px 0;${border}font-size:14px;line-height:21px;color:${BRAND.body};">${rich(item.text)}${preview}</td>
          <td valign="top" align="right" style="padding:10px 0;${border}white-space:nowrap;"><a href="${esc(item.url)}" style="font-size:13px;font-weight:600;color:${BRAND.primary};text-decoration:none;">View</a></td>
        </tr>`;
      }).join('');
      return `
        <div style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.subtle};">${esc(section.label)} &nbsp;<span style="color:${t.fg};">${section.items.length}</span></div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">${items}</table>`;
    }).join('');
    const text = sections.map((section) =>
      `${section.label.toUpperCase()} (${section.items.length})\n` +
      section.items.map((item) => `- ${plain(item.text)}${item.preview ? ` — "${item.preview}"` : ''}\n  ${item.url}`).join('\n')
    ).join('\n\n');
    return { html, text };
  },

  note({ text }) {
    return {
      html: `<p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.subtle};">${rich(text)}</p>`,
      text: plain(text),
    };
  },
};

// ── Document ────────────────────────────────────────────────────────────────

function logoHtml() {
  const logoUrl = process.env.EMAIL_LOGO_URL;
  if (logoUrl) {
    return `<img src="${esc(logoUrl)}" width="140" alt="${BRAND.name}" style="display:block;border:0;height:auto;max-width:140px;">`;
  }
  return `
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td width="30" height="30" align="center" valign="middle" bgcolor="${BRAND.primary}" style="width:30px;height:30px;background:${BRAND.primary};border-radius:8px;font-size:16px;font-weight:800;color:#ffffff;line-height:30px;">K</td>
      <td style="padding-left:10px;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.ink};">${BRAND.name}</td>
    </tr></table>`;
}

/**
 * @param {Object} opts
 * @param {string} opts.preheader   inbox preview line
 * @param {string} [opts.eyebrow]   small pill above the title
 * @param {string} [opts.tone]      eyebrow tone: brand|success|warning|danger|neutral
 * @param {string} opts.title       main heading (plain text)
 * @param {Array}  opts.blocks      [{ type, ...props }]
 * @param {string} [opts.reason]    "why am I getting this" footer line (supports **bold**)
 * @param {Object} [opts.manage]    { label, url } footer link
 * @returns {{ html: string, text: string }}
 */
function renderEmail({ preheader, eyebrow, tone = 'brand', title, blocks: list, reason, manage }) {
  const rendered = list.filter(Boolean).map((b) => blocks[b.type](b));
  const t = TONES[tone];
  const year = new Date().getFullYear();

  const eyebrowHtml = eyebrow
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;"><tr><td style="padding:4px 10px;background:${t.bg};border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${t.fg};">${esc(eyebrow)}</td></tr></table>`
    : '';

  const manageHtml = manage
    ? ` <a href="${esc(manage.url)}" style="color:${BRAND.muted};text-decoration:underline;">${esc(manage.label)}</a>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<style>
  body { margin:0; padding:0; }
  a { color:${BRAND.primary}; }
  @media only screen and (max-width:600px) {
    .k-card { padding:28px 22px !important; }
    .k-outer { padding:20px 12px !important; }
    .k-title { font-size:21px !important; line-height:28px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:${BRAND.font};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BRAND.canvas}" style="background:${BRAND.canvas};">
  <tr><td align="center" class="k-outer" style="padding:36px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 22px;">
        <a href="${esc(clientOrigin())}" style="text-decoration:none;">${logoHtml()}</a>
      </td></tr>
      <tr><td class="k-card" bgcolor="${BRAND.surface}" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;padding:36px 40px;font-family:${BRAND.font};">
        ${eyebrowHtml}
        <h1 class="k-title" style="margin:0 0 14px;font-size:23px;line-height:31px;font-weight:700;letter-spacing:-0.015em;color:${BRAND.ink};">${esc(title)}</h1>
        ${rendered.map((r) => r.html).join('\n')}
      </td></tr>
      <tr><td style="padding:24px 8px 0;font-family:${BRAND.font};">
        ${reason ? `<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:${BRAND.muted};">${rich(reason)}${manageHtml}</p>` : ''}
        <!--k-unsubscribe-->
        <p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.subtle};">&copy; ${year} ${BRAND.name} &middot; ${BRAND.tagline}</p>
        ${postalAddress() ? `<p style="margin:4px 0 0;font-size:12px;line-height:18px;color:${BRAND.subtle};">${esc(postalAddress())}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    title,
    '='.repeat(Math.min(title.length, 60)),
    '',
    rendered.map((r) => r.text).join('\n\n'),
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

module.exports = { renderEmail, BRAND, TONES, esc, clientOrigin };
