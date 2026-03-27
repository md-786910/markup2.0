export function stripHtmlForEdit(html) {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('span.mention').forEach((span) => {
    const id = span.dataset.id;
    const value = span.dataset.value;
    if (id && value) span.replaceWith(`@[${value}](${id})`);
  });
  return (doc.body.innerText || doc.body.textContent || '').trim();
}
