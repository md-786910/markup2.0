const sanitizeHtml = require('sanitize-html');

// Same test the client uses to decide whether a body is rich text (rendered as HTML)
// or plain text (rendered as React text, so it needs no escaping).
const HAS_HTML_TAG = /<[a-z][\s\S]*>/i;

// Allowlist matching what the Quill comment editor produces
// (bold, italic, underline, code, blockquote, list, link, mention).
const OPTIONS = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote', 'ol', 'ul', 'li', 'a', 'span'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    li: ['data-list'],
    span: ['class', 'contenteditable', 'data-id', 'data-value', 'data-index', 'data-denotation-char', 'data-mention-id', 'data-user-id'],
  },
  allowedClasses: { span: ['mention', 'ql-ui'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
  },
};

// Returns a safe comment body. Non-HTML bodies are returned unchanged.
function sanitizeCommentBody(body) {
  if (typeof body !== 'string') return '';
  if (!HAS_HTML_TAG.test(body)) return body;
  return sanitizeHtml(body, OPTIONS);
}

module.exports = { sanitizeCommentBody };
