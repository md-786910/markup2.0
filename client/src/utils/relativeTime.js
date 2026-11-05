const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Design system time format: "Just now", "12 min ago", "2h ago", "Yesterday",
// "Mon" (this week), "Oct 28" (this year), "Oct 28, 2025"
export function relativeTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const mins = Math.floor((now - d) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startOfToday) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.ceil((startOfToday - d) / 86400000);
  if (days <= 1) return 'Yesterday';
  if (days < 7) return DAYS[d.getDay()];
  const md = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === now.getFullYear() ? md : `${md}, ${d.getFullYear()}`;
}

// "Oct 28" / "Oct 28, 2025"
export function shortDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const md = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date().getFullYear() ? md : `${md}, ${d.getFullYear()}`;
}
