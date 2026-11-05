// Shared constants and helpers for the Team area.

// Organization roles (what someone can do on each workspace and project is set there)
export const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Manages every workspace, project and member.' },
  { value: 'member', label: 'Member', description: 'Works on the workspaces and projects they are given.' },
  { value: 'guest', label: 'Guest', description: 'Outside collaborator, can comment at most.' },
];
export const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', guest: 'Guest', superadmin: 'Owner' };

const EMAIL_SPLIT_RE = /[,\n\r\t ]+/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const parseEmailList = (value) => [...new Set((value || '').split(EMAIL_SPLIT_RE).map((e) => e.trim()).filter(Boolean))];

export const isExpired = (inv) => new Date(inv.expiresAt).getTime() <= Date.now();
export const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// "Now", "12 min ago", "3 h ago", "Yesterday", "Oct 28"
export function formatLastActive(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 10) return 'Now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return 'Yesterday';
  const date = new Date(t);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

export const idOf = (x) => String(x?._id || x || '');
