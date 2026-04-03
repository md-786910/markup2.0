export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function timeAgo(date) {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function formatNumber(num) {
  if (num == null) return '—';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatLocation(location) {
  if (!location) return '—';
  const parts = [location.city, location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}
