// Shared pieces of customer support (tickets, contact form)

const TICKET_CATEGORIES = ['question', 'bug', 'billing', 'feature', 'account'];

// The inbox that receives support requests: SUPPORT_EMAIL, else the SMTP sender
function supportInbox() {
  const raw = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

/**
 * First-reply deadline from the plan's support rules.
 * Uses business hours (SUPPORT_HOURS, e.g. "Mon-Fri 09:00-18:00 Asia/Kolkata")
 * if specified; otherwise defaults to calendar hours.
 */
function replyDueAt(support, from = new Date()) {
  const replyHours = support?.replyHours;
  if (!replyHours || replyHours <= 0) return null;

  const rawConfig = process.env.SUPPORT_HOURS;
  if (!rawConfig) {
    // Standard calendar hours fallback
    return new Date(from.getTime() + replyHours * 3600 * 1000);
  }

  return computeBusinessHoursDueAt(from, replyHours, rawConfig);
}

/**
 * Computes a target date by advancing through active working hours.
 * Format: "Mon-Fri 09:00-18:00 Asia/Kolkata" or "Mon-Fri 09:00-18:00"
 */
function computeBusinessHoursDueAt(from, targetHours, configStr) {
  try {
    const parts = configStr.trim().split(/\s+/);
    const dayRange = parts[0] || 'Mon-Fri';
    const timeRange = parts[1] || '09:00-18:00';
    const timeZone = parts[2] || 'UTC';

    const [startH, startM] = timeRange.split('-')[0].split(':').map(Number);
    const [endH, endM] = timeRange.split('-')[1].split(':').map(Number);

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let allowedDays = [1, 2, 3, 4, 5]; // default Mon-Fri
    if (dayRange.includes('-')) {
      const [d1, d2] = dayRange.split('-');
      const i1 = DAY_NAMES.indexOf(d1);
      const i2 = DAY_NAMES.indexOf(d2);
      if (i1 >= 0 && i2 >= 0) {
        allowedDays = [];
        for (let i = i1; ; i = (i + 1) % 7) {
          allowedDays.push(i);
          if (i === i2) break;
        }
      }
    }

    let remainingMinutes = Math.round(targetHours * 60);
    // Iterate in 15-minute intervals
    let current = new Date(from.getTime());

    let iterations = 0;
    while (remainingMinutes > 0 && iterations < 4000) {
      iterations++;
      // Get current day of week and hour/minute in the specified timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(current);
      const dayStr = parts.find((p) => p.type === 'weekday')?.value;
      const hourNum = Number(parts.find((p) => p.type === 'hour')?.value);
      const minNum = Number(parts.find((p) => p.type === 'minute')?.value);

      const dayIdx = DAY_NAMES.indexOf(dayStr);
      const isWorkingDay = allowedDays.includes(dayIdx);
      const currentMinOfDay = hourNum * 60 + minNum;
      const startMinOfDay = startH * 60 + startM;
      const endMinOfDay = endH * 60 + endM;

      const isWorkingHour = isWorkingDay && currentMinOfDay >= startMinOfDay && currentMinOfDay < endMinOfDay;

      if (isWorkingHour) {
        remainingMinutes -= 15;
      }
      current = new Date(current.getTime() + 15 * 60 * 1000);
    }

    return current;
  } catch {
    // Resilient fallback to calendar hours
    return new Date(from.getTime() + targetHours * 3600 * 1000);
  }
}

// Reply targets by priority (the plans' replyHours), for when an admin
// changes a request's priority
const REPLY_HOURS_BY_PRIORITY = { urgent: 8, high: 24, normal: 48 };

const attachmentUrl = (a) => `uploads/documents/${a.filename}`;

// Plain text in, plain text out: trimmed and capped (rendered escaped everywhere)
const cleanText = (value, max) => String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);

module.exports = { TICKET_CATEGORIES, REPLY_HOURS_BY_PRIORITY, supportInbox, replyDueAt, attachmentUrl, cleanText };
