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

// Invoice amounts are stored in the smallest unit of their own currency
export function formatMoney(amountMinor, currency = 'USD') {
  const major = (amountMinor || 0) / 100;
  return currency === 'USD'
    ? '$' + major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '₹' + major.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Whole US dollars, e.g. monthly revenue
export function formatUsd(amount) {
  return '$' + (amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// "in 3 days", "today", "2 days ago" for a date relative to now
export function relativeDays(date) {
  if (!date) return '—';
  const days = Math.round((new Date(date).getTime() - Date.now()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}
