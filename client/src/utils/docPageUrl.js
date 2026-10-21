// Document pins use page URLs like "doc:<filename>:page:<n>"
export function parseDocPageUrl(pageUrl) {
  if (!pageUrl || !pageUrl.startsWith('doc:')) return null;
  const parts = pageUrl.split(':');
  return { filename: parts[1], page: parseInt(parts[3], 10) };
}
