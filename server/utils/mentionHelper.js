/**
 * Utility functions for handling @mentions and formatting comment bodies for emails, logs, and integrations.
 */

/**
 * Extract all mentioned user ObjectId strings from a comment body.
 * Supports:
 * - Markdown tokens: @[Name](userId)
 * - HTML data attributes from rich text editors:
 *   - data-id="userId"
 *   - data-mention-id="userId"
 *   - data-user-id="userId"
 */
function extractMentionedUserIds(body) {
  if (!body || typeof body !== 'string') return [];
  const ids = new Set();

  // 1. Markdown token: @[Name](userId)
  const tokenRegex = /@\[([^\]]+)\]\(([a-fA-F\d]{24})\)/g;
  let match;
  while ((match = tokenRegex.exec(body)) !== null) {
    ids.add(match[2]);
  }

  // 2. HTML data attributes (Quill mention, etc.)
  const dataIdRegex = /data-(?:id|mention-id|user-id)=["']([a-fA-F\d]{24})["']/g;
  while ((match = dataIdRegex.exec(body)) !== null) {
    ids.add(match[1]);
  }

  return Array.from(ids);
}

/**
 * Replaces Quill mention HTML spans (including nested spans) with a custom replacement string.
 */
function replaceQuillMentions(html, replacementFn) {
  if (!html || typeof html !== 'string') return '';
  let result = '';
  let index = 0;
  const tagStartRegex = /<span\b[^>]*\bclass=["'][^"']*\bmention\b[^"']*["'][^>]*>/gi;

  while (true) {
    tagStartRegex.lastIndex = index;
    const match = tagStartRegex.exec(html);
    if (!match) {
      result += html.slice(index);
      break;
    }

    result += html.slice(index, match.index);
    const startTag = match[0];
    const startIndex = match.index;

    // Extract name from data-value or data-name
    const valueMatch = /data-(?:value|name)=["']([^"']+)["']/i.exec(startTag);
    let mentionName = valueMatch ? valueMatch[1] : '';

    // Find the matching closing </span>
    let depth = 1;
    let pos = startIndex + startTag.length;
    const spanRegex = /<\/?span\b[^>]*>/gi;
    spanRegex.lastIndex = pos;

    let spanMatch;
    let endIndex = html.length;
    while ((spanMatch = spanRegex.exec(html)) !== null) {
      if (spanMatch[0].startsWith('</')) {
        depth--;
        if (depth === 0) {
          endIndex = spanMatch.index + spanMatch[0].length;
          break;
        }
      } else {
        depth++;
      }
    }

    // Fallback: if data-value wasn't present, extract inner text
    if (!mentionName) {
      const innerHtml = html.slice(pos, endIndex - 7);
      mentionName = innerHtml.replace(/<[^>]+>/g, '').replace(/^@/, '').trim();
    }

    result += replacementFn(mentionName || 'user');
    index = endIndex;
  }

  return result;
}

/**
 * Strips HTML tags and mention markup down to clean plain text.
 * Useful for logs, summaries, digests, and external integrations (Slack, Discord, Jira).
 */
function stripHtmlAndMentions(body) {
  if (!body || typeof body !== 'string') return '';
  let clean = body.replace(/[\uFEFF\u200B]/g, '');

  // Convert Quill mention spans to @Name
  clean = replaceQuillMentions(clean, (name) => `@${name}`);

  // Convert Markdown mention tokens: @[Name](userId) -> @Name
  clean = clean.replace(/@\[([^\]]+)\]\([a-fA-F\d]{24}\)/g, '@$1');

  // Replace line breaks and block tags with a space
  clean = clean.replace(/<br\s*\/?>/gi, ' ');
  clean = clean.replace(/<\/(p|div|li|h[1-6])>/gi, ' ');

  // Strip remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, ' ');

  // Collapse multiple whitespace
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Formats a comment body into clean, beautiful HTML suitable for email templates.
 */
function formatCommentForEmail(body) {
  if (!body || typeof body !== 'string') return '';

  let text = body.replace(/[\uFEFF\u200B]/g, '');

  const mentionStyle = 'color: #2563eb; font-weight: 600; background: #eff6ff; padding: 2px 6px; border-radius: 4px; display: inline-block;';

  // 1. Convert Quill mention spans
  text = replaceQuillMentions(text, (name) => `<span style="${mentionStyle}">@${name}</span>`);

  // 2. Convert Markdown mention tokens: @[Name](userId)
  text = text.replace(
    /@\[([^\]]+)\]\([a-fA-F\d]{24}\)/g,
    `<span style="${mentionStyle}">@$1</span>`
  );

  // 3. Handle HTML vs Plain text
  if (/<[a-z][\s\S]*>/i.test(text)) {
    // Strip script / style tags if any
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // Clean up empty <p><br></p>
    text = text.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<br/>');
    // Ensure <p> tags have proper email styling
    text = text.replace(/<p\b[^>]*>/gi, '<p style="margin: 0 0 10px 0; line-height: 1.6; color: #374151;">');
  } else {
    // Plain text: convert newlines to <br/>
    text = `<p style="margin: 0; line-height: 1.6; color: #374151;">${text.replace(/\n/g, '<br/>')}</p>`;
  }

  return text;
}

module.exports = {
  extractMentionedUserIds,
  stripHtmlAndMentions,
  formatCommentForEmail,
};
