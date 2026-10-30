// Due dates are calendar days, saved as UTC midnight by the date picker
// (CommentSidebar). Show and compare them as days, not instants, so every time
// zone sees the day that was picked and a task is only overdue once that day is over.

export const dueDay = (dueAt) => (dueAt ? new Date(dueAt).toISOString().slice(0, 10) : '');

export const formatDueDate = (dueAt) =>
  new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function isPastDue(dueAt) {
  if (!dueAt) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dueDay(dueAt) < today;
}
