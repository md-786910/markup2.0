import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  updateProfileApi,
  changePasswordApi,
  uploadAvatarApi,
  deleteAccountApi,
} from '../services/authService';

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

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // Name
  const [name, setName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  // Email
  const [email, setEmail] = useState(user?.email || '');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Avatar
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

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

  const handleEmailUpdate = async () => {
    if (!email.trim()) return;
    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');
    try {
      const res = await updateProfileApi({ email: email.trim() });
      updateUser(res.data.user);
      setEmailSuccess('Email updated');
      setTimeout(() => setEmailSuccess(''), 3000);
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to update');
    } finally {
      setEmailLoading(false);
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

      {/* Email */}
      <FieldRow label="Email address">
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); setEmailSuccess(''); }}
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-shadow"
          />
          <button
            onClick={handleEmailUpdate}
            disabled={emailLoading || email.trim().toLowerCase() === user?.email}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 disabled:opacity-40 transition-colors shrink-0"
          >
            {emailLoading ? 'Saving...' : 'Update'}
          </button>
        </div>
        <StatusMessage error={emailError} success={emailSuccess} />
      </FieldRow>

      <div className="border-t border-gray-100" />

      {/* Password */}
      <FieldRow label="Password">
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setPwError(''); setPwSuccess(''); }}
            placeholder="Current Password"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-shadow"
          />
          <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            Forgot password
          </Link>
        </div>
      </FieldRow>

      <div className="border-t border-gray-100" />

      <FieldRow label="New Password">
        <div className="flex gap-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setPwError(''); setPwSuccess(''); }}
            placeholder="New Password"
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-shadow"
          />
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
