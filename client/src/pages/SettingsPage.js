import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateOrganizationApi } from '../services/authService';
import BillingTab from '../components/settings/BillingTab';
import InvoicesTab from '../components/settings/InvoicesTab';
import ActivityTab from '../components/settings/ActivityTab';
import WorkspacesTab from '../components/settings/WorkspacesTab';
import { useWorkspaces } from '../contexts/WorkspaceContext';
import DataPrivacySection from '../components/settings/DataPrivacySection';
import { uploadUrl } from '../utils/uploadUrl';
import { toast } from '../utils/toast';
import { Page, PageHeader, Tabs, Card, SettingRow, Input, Button } from '../components/ui';

const ALL_TABS = [
  { id: 'workspace', label: 'Organization' },
  { id: 'workspaces', label: 'Workspaces', managerOrAdmin: true },
  { id: 'billing', label: 'Billing' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'activity', label: 'Activity', adminOnly: true },
];

export default function SettingsPage() {
  const { user, isOwner, isAdmin, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') || 'workspace';

  // Hide admin-only tabs for non-admins; redirect away if they hit one directly.
  const { workspaces } = useWorkspaces();
  const managesAWorkspace = workspaces.some((w) => w.myLevel === 'manage');
  const TABS = ALL_TABS.filter((t) => (t.adminOnly ? isAdmin : t.managerOrAdmin ? isAdmin || managesAWorkspace : true));
  const activeTab = TABS.some((t) => t.id === requestedTab) ? requestedTab : 'workspace';

  const [workspaceName, setWorkspaceName] = useState(user?.orgName || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileRef = useRef(null);

  const handleTabChange = (tabId) => {
    setSearchParams(tabId === 'workspace' ? {} : { tab: tabId });
  };

  const handleNameUpdate = async () => {
    if (!workspaceName.trim()) return;
    setNameLoading(true);
    setNameError('');
    try {
      const formData = new FormData();
      formData.append('name', workspaceName.trim());
      const res = await updateOrganizationApi(formData);
      updateUser(res.data.user);
      toast.success('Organization name saved.');
    } catch (err) {
      setNameError(err.response?.data?.message || 'Could not save the name.');
    } finally {
      setNameLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    setLogoError('');
    try {
      const formData = new FormData();
      formData.append('name', user?.orgName || workspaceName);
      formData.append('logo', file);
      const res = await updateOrganizationApi(formData);
      updateUser(res.data.user);
      toast.success('Organization icon updated.');
    } catch (err) {
      setLogoError(err.response?.data?.message || 'Could not upload the icon.');
    } finally {
      setLogoLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const orgInitial = (user?.orgName || user?.name || '?')[0].toUpperCase();
  const tabs = TABS.map((t) => (t.id === 'invoices' && user?.orgPendingInvoice ? { ...t, dot: true, dotTitle: 'You have an unpaid invoice' } : t));

  return (
    <Page narrow>
      <PageHeader title="Settings" subtitle="Your organization, workspaces, plan and invoices." />
      <Tabs tabs={tabs} active={activeTab} onChange={handleTabChange} />

      {activeTab === 'workspace' && (
        <div className="space-y-6">
          <Card title="Organization" description="Your company or team. Its name and icon appear in the app, in emails and on review links.">
            <SettingRow label="Name" hint={isOwner ? null : 'Only the owner can change it.'}>
              {isOwner ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleNameUpdate(); }}
                  className="flex max-w-md gap-2"
                >
                  <Input
                    value={workspaceName}
                    maxLength={80}
                    aria-label="Organization name"
                    onChange={(e) => { setWorkspaceName(e.target.value); setNameError(''); }}
                  />
                  <Button type="submit" variant="primary" loading={nameLoading} disabled={!workspaceName.trim() || workspaceName.trim() === (user?.orgName || '')}>
                    Save
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-gray-900 pt-2">{user?.orgName || 'Unnamed organization'}</p>
              )}
              {nameError && <p className="text-xs text-red-600 mt-1.5">{nameError}</p>}
            </SettingRow>
            <SettingRow label="Icon" hint="Square image, at least 256 × 256 px (PNG or JPG)." last>
              <div className="flex items-center gap-4">
                {user?.orgLogo ? (
                  <img src={uploadUrl(user.orgLogo)} alt="Organization icon" className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold">{orgInitial}</div>
                )}
                {isOwner ? (
                  <>
                    <Button variant="secondary" size="sm" loading={logoLoading} onClick={() => fileRef.current?.click()}>
                      {user?.orgLogo ? 'Change icon' : 'Upload icon'}
                    </Button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleLogoUpload} className="hidden" />
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Only the owner can change the icon.</p>
                )}
              </div>
              {logoError && <p className="text-xs text-red-600 mt-1.5">{logoError}</p>}
            </SettingRow>
          </Card>
          <DataPrivacySection />
        </div>
      )}

      {activeTab === 'workspaces' && <WorkspacesTab />}
      {activeTab === 'billing' && <BillingTab />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'activity' && isAdmin && <ActivityTab />}
    </Page>
  );
}
