import React from 'react';

const MENTION_REGEX = /@\[([^\]]+)\]\(([a-fA-F\d]+)\)/g;
const HAS_HTML_TAG = /<[a-z][\s\S]*>/i;

// Renders a comment body with @mention highlighting. Bodies that contain HTML
// (rich-text editor output) are rendered as HTML; plain-text bodies are
// rendered as React children with mention spans interpolated.
export default function renderCommentBody(body) {
  if (!body) return null;

  if (HAS_HTML_TAG.test(body)) {
    const processed = body.replace(
      MENTION_REGEX,
      '<span class="text-blue-600 font-medium bg-blue-50 rounded px-0.5">@$1</span>',
    );
    return <span className="comment-rich-content" dangerouslySetInnerHTML={{ __html: processed }} />;
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(body)) !== null) {
    if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index));
    parts.push(
      <span key={match.index} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5">
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}
