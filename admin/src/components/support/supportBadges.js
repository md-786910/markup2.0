import React from 'react';
import { Pill } from '../common/StatusBadge';

const STATUS = {
  open: ['blue', 'Open'],
  waiting_on_customer: ['amber', 'Waiting on customer'],
  resolved: ['green', 'Resolved'],
  closed: ['gray', 'Closed'],
};

export function TicketStatusPill({ status }) {
  const [tone, label] = STATUS[status] || ['gray', status];
  return <Pill tone={tone} dot>{label}</Pill>;
}

const PRIORITY = { urgent: ['red', 'Urgent'], high: ['amber', 'High'], normal: ['gray', 'Normal'] };

export function PriorityPill({ priority }) {
  const [tone, label] = PRIORITY[priority] || PRIORITY.normal;
  return <Pill tone={tone}>{label}</Pill>;
}

export const CATEGORY_LABELS = { question: 'Question', bug: 'Something is broken', billing: 'Billing', feature: 'Feature idea', account: 'Account' };

// "Due in 5 h", "2 h overdue", "Replied" for the first-reply target
export function dueLabel(ticket) {
  if (ticket.firstResponseAt) return { text: 'Replied', tone: 'text-gray-500' };
  if (!ticket.dueAt) return { text: 'No target', tone: 'text-gray-400' };
  const hours = Math.round((new Date(ticket.dueAt).getTime() - Date.now()) / 3600e3);
  if (hours < 0) return { text: `${-hours} h overdue`, tone: 'font-medium text-red-600' };
  if (hours < 4) return { text: `Due in ${Math.max(hours, 1)} h`, tone: 'font-medium text-amber-600' };
  return { text: hours < 48 ? `Due in ${hours} h` : `Due in ${Math.round(hours / 24)} days`, tone: 'text-gray-600' };
}
