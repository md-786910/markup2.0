// Review status of a project (project.projectStatus). `tone` is the design
// system Badge tone: In review = brand, Approved = success, Changes requested
// = warning; the other states are neutral. A status is always a dot plus the
// word. `dot`/`badge` are the same colours as Tailwind classes.
export const PROJECT_STATUSES = [
  { value: 'not_started', label: 'Not started', tone: 'neutral', dot: 'bg-gray-500', badge: 'bg-gray-100 text-gray-600' },
  { value: 'in_progress', label: 'In progress', tone: 'neutral', dot: 'bg-gray-500', badge: 'bg-gray-100 text-gray-600' },
  { value: 'in_review', label: 'In review', tone: 'review', dot: 'bg-blue-600', badge: 'bg-blue-50 text-blue-600' },
  { value: 'changes_requested', label: 'Changes requested', tone: 'changes', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  { value: 'approved', label: 'Approved', tone: 'approved', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  { value: 'completed', label: 'Completed', tone: 'approved', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
];

export function statusInfo(value) {
  return PROJECT_STATUSES.find((s) => s.value === (value || 'not_started')) || PROJECT_STATUSES[0];
}

// The review views of the Projects area, in workflow order
export const REVIEW_VIEWS = ['in_review', 'changes_requested', 'approved'];

export const PROJECT_TYPES = [
  { value: 'website', label: 'Websites', icon: 'globe' },
  { value: 'document', label: 'Documents', icon: 'doc' },
];

export const OWNERSHIP_OPTIONS = [
  { value: 'mine', label: 'Created by me' },
  { value: 'shared', label: 'Shared with me' },
];
