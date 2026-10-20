export const PROJECT_STATUSES = [
  {
    value: "not_started",
    label: "Not Started",
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600",
  },
  {
    value: "in_progress",
    label: "In Progress",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    value: "in_review",
    label: "In Review",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
  {
    value: "approved",
    label: "Approved",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700",
  },
  {
    value: "completed",
    label: "Completed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
  },
];

export const PROJECT_TYPES = [
  { value: "website", label: "Website" },
  { value: "document", label: "Document" },
];

export const OWNERSHIP_OPTIONS = [
  { value: "all", label: "All Projects" },
  { value: "mine", label: "My Projects" },
  { value: "shared", label: "Shared with Me" },
];
