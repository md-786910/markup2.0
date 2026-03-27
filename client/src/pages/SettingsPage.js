import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateOrganizationApi } from '../services/authService';
import BillingTab from '../components/settings/BillingTab';

const TABS = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'billing', label: 'Billing' },
];

export default function SettingsPage() {
  const { user, isOwner, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'workspace';

  const [workspaceName, setWorkspaceName] = useState(user?.orgName || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
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
    setNameSuccess('');
    try {
      const formData = new FormData();
      formData.append('name', workspaceName.trim());
      const res = await updateOrganizationApi(formData);
      updateUser(res.data.user);
      setNameSuccess('Workspace name updated');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setNameError(err.response?.data?.message || 'Failed to update');
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
    } catch (err) {
      setLogoError(err.response?.data?.message || 'Failed to upload');
    } finally {
      setLogoLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const orgInitial = (user?.orgName || user?.name || '?')[0].toUpperCase();

  return (
    <div className="px-6 lg:px-8 py-6 lg:py-8 max-w-3xl animate-page-enter">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-8 flex gap-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workspace tab */}
      {activeTab === 'workspace' && (
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-gray-900 mb-6">General Workspace</h3>

          {/* Workspace Name */}
          <div className="flex items-start gap-8 mb-8">
            <label className="text-sm text-gray-500 w-36 pt-2.5 shrink-0">Workspace Name</label>
            <div className="flex-1 max-w-md">
              {isOwner ? (
                <>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => { setWorkspaceName(e.target.value); setNameError(''); setNameSuccess(''); }}
                      className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-shadow"
                    />
                    <button
                      onClick={handleNameUpdate}
                      disabled={nameLoading || workspaceName.trim() === (user?.orgName || '')}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {nameLoading ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                  {nameError && <p className="text-xs text-red-500 mt-1.5">{nameError}</p>}
                  {nameSuccess && <p className="text-xs text-green-600 mt-1.5">{nameSuccess}</p>}
                </>
              ) : (
                <p className="text-sm text-gray-900 py-2.5">{user?.orgName || 'Unnamed Workspace'}</p>
              )}
            </div>
          </div>

          {/* Workspace Icon */}
          <div className="flex items-start gap-8">
            <label className="text-sm text-gray-500 w-36 pt-2 shrink-0">
              Workspace Icon
              <span className="inline-block ml-1 text-gray-300 cursor-help" title="Recommended: 256x256px, PNG or JPG">
                <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </label>
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img
                  src={`/uploads/${user.avatar}`}
                  alt="Workspace icon"
                  className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                  {orgInitial}
                </div>
              )}
              {isOwner ? (
                <div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={logoLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {logoLoading ? 'Uploading...' : 'Change icon'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Only the workspace owner can change the icon</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing tab */}
      {activeTab === 'billing' && <BillingTab />}
    </div>
  );
}
