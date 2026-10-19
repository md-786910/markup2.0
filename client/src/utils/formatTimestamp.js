const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Compact absolute timestamp: "Sep 16, 3:42 PM" in the current year,
 * "Aug 2, 2025, 3:42 PM" for other years.
 */
export function formatTimestamp(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear() === new Date().getFullYear() ? '' : `, ${d.getFullYear()}`;
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${year}, ${time}`;
}

/**
 * Full timestamp for hover tooltips, e.g. "Sun, 2 Aug 2026, 3:42:05 PM".
 */
export function formatFullTimestamp(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });
}
