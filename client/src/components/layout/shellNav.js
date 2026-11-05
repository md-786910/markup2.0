// Layout C navigation model: the rail picks an area, the context panel picks a
// page or view inside it. Every item maps to a real route; the active item is
// derived from the URL, so links, back/forward and reloads all agree.

export const AREAS = [
  { id: 'projects', label: 'Projects', icon: 'grid', to: '/dashboard' },
  { id: 'team', label: 'Team', icon: 'team', to: '/team' },
  { id: 'integrations', label: 'Integrations', icon: 'link', to: '/integrations', managersOnly: true },
  { id: 'settings', label: 'Settings', icon: 'gear', to: '/settings' },
];

// Review views of the Projects area (project.projectStatus values)
export const PROJECT_VIEWS = [
  { id: 'all', label: 'All projects', icon: 'grid', to: '/dashboard' },
  { id: 'in_review', label: 'In review', icon: 'eye', to: '/dashboard?view=in_review' },
  { id: 'changes_requested', label: 'Changes requested', icon: 'edit', to: '/dashboard?view=changes_requested' },
  { id: 'approved', label: 'Approved', icon: 'okc', to: '/dashboard?view=approved' },
  { id: 'archive', label: 'Archive', icon: 'archive', to: '/dashboard?tab=archived' },
];
export const PROJECT_TYPES_NAV = [
  { id: 'website', label: 'Websites', icon: 'globe', to: '/dashboard?type=website' },
  { id: 'document', label: 'Documents', icon: 'doc', to: '/dashboard?type=document' },
];

export const INTEGRATION_PROVIDERS = [
  { id: 'slack', label: 'Slack', icon: 'slack' },
  { id: 'jira', label: 'Jira', icon: 'jira' },
  { id: 'discord', label: 'Discord', icon: 'discord' },
  { id: 'teams', label: 'Microsoft Teams', icon: 'teams' },
];

// Settings pages; `who` limits an item to org admins or workspace managers
export const SETTINGS_PAGES = [
  { group: 'Organization', id: 'general', label: 'General', icon: 'gear', to: '/settings' },
  { group: 'Organization', id: 'billing', label: 'Plan and billing', icon: 'card', to: '/settings?tab=billing' },
  { group: 'Organization', id: 'workspaces', label: 'Workspaces', icon: 'layers', to: '/settings?tab=workspaces', who: 'managers' },
  { group: 'Organization', id: 'activity', label: 'Activity log', icon: 'activity', to: '/settings?tab=activity', who: 'admins' },
  { group: 'Organization', id: 'data', label: 'Data and privacy', icon: 'shield', to: '/settings?tab=data' },
  { group: 'Your account', id: 'profile', label: 'Profile', icon: 'user', to: '/profile' },
  { group: 'Your account', id: 'notifications', label: 'Notifications', icon: 'bell', to: '/settings?tab=notifications' },
  { group: 'Your account', id: 'security', label: 'Security', icon: 'lock', to: '/settings?tab=security' },
];
// Old ?tab= values keep working
export const SETTINGS_ALIASES = { workspace: 'general', invoices: 'billing' };

export function areaOf(pathname) {
  if (pathname.startsWith('/team')) return 'team';
  if (pathname.startsWith('/integrations')) return 'integrations';
  if (pathname.startsWith('/settings') || pathname.startsWith('/profile')) return 'settings';
  return 'projects';
}

// The active panel item for the current URL
export function activeItemOf(pathname, params) {
  const area = areaOf(pathname);
  if (area === 'team') return params.get('view') || 'members';
  if (area === 'integrations') return params.get('provider') || 'slack';
  if (area === 'settings') {
    if (pathname.startsWith('/profile')) return 'profile';
    const tab = params.get('tab') || 'general';
    return SETTINGS_ALIASES[tab] || tab;
  }
  if (pathname !== '/dashboard') return null;
  if (params.get('tab') === 'archived') return 'archive';
  if (params.get('view')) return params.get('view');
  if (params.get('type')) return params.get('type');
  return 'all';
}
