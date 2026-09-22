import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  updateProfileApi,
  changePasswordApi,
  uploadAvatarApi,
  deleteAccountApi,
} from '../services/authService';
import {
  getProjectsApi,
  updateProjectEmailNotificationsApi,
} from '../services/projectService';

function FieldRow({ label, children }) {
  return (
    <div className="flex items-start gap-8 py-6">
      <label className="text-sm text-gray-500 w-40 pt-2.5 shrink-0">{label}</label>
      <div className="flex-1 max-w-lg">{children}</div>
    </div>
  );
}

function StatusMessage({ error, success }) {
  if (error) return <p className="text-xs text-red-500 mt-1.5">{error}</p>;
  if (success) return <p className="text-xs text-green-600 mt-1.5">{success}</p>;
  return null;
}

function PasswordInput({ value, onChange, placeholder, autoComplete = 'off', className = '' }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full pl-3.5 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-shadow ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
      >
        {visible ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // Name
  const [name, setName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Avatar
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Projects & Notifications
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [togglingProjectId, setTogglingProjectId] = useState(null);

  useEffect(() => {
    getProjectsApi()
      .then((res) => {
        setProjects(res.data.projects || []);
      })
      .catch((err) => {
        console.error('Failed to load projects for notifications:', err);
      })
      .finally(() => {
        setProjectsLoading(false);
      });
  }, []);

  const handleToggleProject = async (projectId, currentlyEnabled) => {
    if (togglingProjectId === projectId) return;
    setTogglingProjectId(projectId);
    try {
      const nextState = !currentlyEnabled;
      const res = await updateProjectEmailNotificationsApi(projectId, nextState);
      if (res.data?.mutedProjectEmails && updateUser) {
        updateUser({ mutedProjectEmails: res.data.mutedProjectEmails });
      }
    } catch (err) {
      console.error('Failed to update project email notifications:', err);
    } finally {
      setTogglingProjectId(null);
    }
  };

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleNameUpdate = async () => {
    if (!name.trim()) return;
    setNameLoading(true);
    setNameError('');
    setNameSuccess('');
    try {
      const res = await updateProfileApi({ name: name.trim() });
      updateUser(res.data.user);
      setNameSuccess('Name updated');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setNameError(err.response?.data?.message || 'Failed to update');
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) return;
    setPwLoading(true);
    setPwError('');
    setPwSuccess('');
    try {
      await changePasswordApi(currentPassword, newPassword);
      setPwSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setAvatarError('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await uploadAvatarApi(formData);
      updateUser(res.data.user);
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Failed to upload');
    } finally {
      setAvatarLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccountApi();
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to delete account:', err);
      setDeleteLoading(false);
    }
  };

  return (
    <div className="px-6 lg:px-8 py-6 lg:py-8 max-w-3xl animate-page-enter">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
      </div>

      {/* Name */}
      <FieldRow label="Your name">
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(''); setNameSuccess(''); }}
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-shadow"
          />
          <button
            onClick={handleNameUpdate}
            disabled={nameLoading || name.trim() === user?.name}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 disabled:opacity-40 transition-colors shrink-0"
          >
            {nameLoading ? 'Saving...' : 'Update'}
          </button>
        </div>
        <StatusMessage error={nameError} success={nameSuccess} />
      </FieldRow>

      <div className="border-t border-gray-100" />

      {/* Email — read-only */}
      <FieldRow label="Email address">
        <input
          type="email"
          value={user?.email || ''}
          readOnly
          disabled
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1.5">Email cannot be changed. Contact support if you need to update it.</p>
      </FieldRow>

      <div className="border-t border-gray-100" />

      {/* Password */}
      <FieldRow label="Password">
        <div className="space-y-3">
          <PasswordInput
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setPwError(''); setPwSuccess(''); }}
            placeholder="Current Password"
            autoComplete="current-password"
          />
          <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            Forgot password
          </Link>
        </div>
      </FieldRow>

      <div className="border-t border-gray-100" />

      <FieldRow label="New Password">
        <div className="flex gap-3">
          <div className="flex-1">
            <PasswordInput
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwError(''); setPwSuccess(''); }}
              placeholder="New Password"
              autoComplete="new-password"
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={pwLoading || !currentPassword || !newPassword}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 disabled:opacity-40 transition-colors shrink-0"
          >
            {pwLoading ? 'Saving...' : 'Update'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Must be at least 6 characters</p>
        <StatusMessage error={pwError} success={pwSuccess} />
      </FieldRow>

      <div className="border-t border-gray-200 my-2" />

      {/* Avatar */}
      <FieldRow label={
        <span>
          Avatar
          <span className="inline-block ml-1 text-gray-300 cursor-help" title="Recommended: 256x256px square image">
            <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </span>
      }>
        <div className="flex items-center gap-4">
          {user?.avatar ? (
            <img
              src={`/uploads/${user.avatar}`}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              {(user?.name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {avatarLoading ? 'Uploading...' : 'Upload new avatar'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        {avatarError && <p className="text-xs text-red-500 mt-1.5">{avatarError}</p>}
      </FieldRow>

      <div className="border-t border-gray-200 my-4" />

      {/* Project Email Notifications */}
      <div className="py-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Email Notifications</h3>
          <p className="text-xs text-gray-500 mt-1">
            Turn email notifications on or off independently for each project. When muted, you will not receive comment, mention, or status emails for that project.
          </p>
        </div>

        {projectsLoading ? (
          <div className="py-6 text-center text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-400 border border-gray-100">
            No projects found in this workspace.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden shadow-sm">
            {projects.map((proj) => {
              const isEnabled = !user?.mutedProjectEmails?.includes(proj._id);
              const isToggling = togglingProjectId === proj._id;

              return (
                <div
                  key={proj._id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      {proj.projectType === 'document' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{proj.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {proj.projectType === 'document' ? 'Document project' : proj.websiteUrl || 'Website'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`}>
                      {isEnabled ? 'Emails On' : 'Muted'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleProject(proj._id, isEnabled)}
                      disabled={isToggling}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      title={isEnabled ? 'Email notifications enabled' : 'Email notifications muted'}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 my-4" />

      {/* Delete Account */}
      <div className="py-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete your account</h3>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Your Account
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <p className="text-sm text-red-800 mb-4">
              This will permanently delete your account, remove you from all projects, and delete all projects you own along with their pins and comments. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
