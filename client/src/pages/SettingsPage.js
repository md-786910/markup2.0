import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWorkspaces } from '../contexts/WorkspaceContext';
import { SETTINGS_ALIASES } from '../components/layout/shellNav';
import GeneralTab from '../components/settings/GeneralTab';
import BillingTab from '../components/settings/BillingTab';
import ActivityTab from '../components/settings/ActivityTab';
import WorkspacesTab from '../components/settings/WorkspacesTab';
import DataPrivacySection from '../components/settings/DataPrivacySection';
import NotificationsTab from '../components/settings/NotificationsTab';
import SecurityTab from '../components/settings/SecurityTab';

// /settings?tab=… — the context panel (shellNav SETTINGS_PAGES) picks the page.
// Old values keep working: ?tab=workspace → General, ?tab=invoices → Plan and billing.
export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { workspaces } = useWorkspaces();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('tab') || 'general';
  const tab = SETTINGS_ALIASES[requested] || requested;
  const managesAWorkspace = workspaces.some((w) => w.myLevel === 'manage');

  switch (tab) {
    case 'billing': return <BillingTab />;
    case 'workspaces':
      if (isAdmin || managesAWorkspace) return <WorkspacesTab />;
      // Wait for the workspace list before sending a non-manager back
      return workspaces.length ? <Navigate to="/settings" replace /> : null;
    case 'activity': return isAdmin ? <ActivityTab /> : <Navigate to="/settings" replace />;
    case 'data': return <DataPrivacySection />;
    case 'notifications': return <NotificationsTab />;
    case 'security': return <SecurityTab />;
    case 'profile': return <Navigate to="/profile" replace />;
    default: return <GeneralTab />;
  }
}
