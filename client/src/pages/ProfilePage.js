import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateProfileApi, uploadAvatarApi, deleteAccountApi } from '../services/authService';
import { uploadUrl } from '../utils/uploadUrl';
import { toast, toastError } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';
import { Avatar, Button, Field, Input, Row, Section } from '../components/kc';
import SettingsLayout from '../components/settings/SettingsLayout';

// Settings → Profile: name, email (read-only), avatar and closing the account.
// The password moved to Settings → Security, notification emails to
// Settings → Notifications.
export default function ProfilePage() {
  const { user, updateUser, logout, isOwner } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const savedName = user?.name || '';
  const [name, setName] = useState(savedName);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const dirty = name.trim() !== savedName;

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || !dirty) return;
    setNameLoading(true);
    setNameError('');
    try {
      const res = await updateProfileApi({ name: name.trim() });
      updateUser(res.data.user);
      toast.success('Profile saved.');
    } catch (err) {
      setNameError(err.response?.data?.message || 'Could not save your name.');
    } finally {
      setNameLoading(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setAvatarError('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await uploadAvatarApi(formData);
      updateUser(res.data.user);
      toast.success('Avatar updated.');
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Could not upload the avatar.');
    } finally {
      setAvatarLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteAccount = async () => {
    const ok = await confirmDialog({
      title: 'Delete your account?',
      message: 'This permanently deletes your account and removes you from this organization\'s projects. Projects you created are deleted with their pins and comments. Your comments on other projects stay, shown as "Deleted user". This cannot be undone.',
      confirmLabel: 'Delete my account',
      danger: true,
    });
    if (!ok) return;
    setDeleteLoading(true);
    try {
      await deleteAccountApi();
      logout();
      navigate('/login');
    } catch (err) {
      toastError(err, 'Could not delete your account.');
      setDeleteLoading(false);
    }
  };

  return (
    <SettingsLayout title="Profile" subtitle="How you appear to your team and in emails.">
      <form onSubmit={saveName}>
        <Section
          title="Your details"
          description="Your name shows on pins, comments and notifications."
          footer={(
            <>
              <Button disabled={!dirty || nameLoading} onClick={() => { setName(savedName); setNameError(''); }}>Cancel</Button>
              <Button type="submit" variant="primary" loading={nameLoading} disabled={!name.trim() || !dirty}>Save changes</Button>
            </>
          )}
        >
          <Field label="Avatar" error={avatarError}>
            <div className="flex items-center gap-3">
              <Avatar name={savedName || user?.email} src={user?.avatar ? uploadUrl(user.avatar) : undefined} toneKey={user?._id || user?.id} size="lg" />
              <Button icon="upload" loading={avatarLoading} onClick={() => fileRef.current?.click()}>
                {user?.avatar ? 'Change avatar' : 'Upload avatar'}
              </Button>
              <span className="text-caption text-gray-500">Square image, 256 × 256 px works best.</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadAvatar} className="hidden" />
            </div>
          </Field>
          <Field id="profile-name" label="Name" error={nameError}>
            <Input
              id="profile-name"
              value={name}
              maxLength={80}
              autoComplete="name"
              aria-invalid={nameError ? 'true' : undefined}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
            />
          </Field>
          <Field id="profile-email" label="Email" hint="Email can't be changed here. Contact support to update it.">
            <Input id="profile-email" type="email" value={user?.email || ''} readOnly disabled />
          </Field>
        </Section>
      </form>

      <Section tone="danger" title="Danger zone" description="Closing your account can't be undone.">
        {isOwner ? (
          <Row
            title="Delete your account"
            description="You own this organization, so your account is closed together with it. Delete the organization in Data and privacy; it is removed after a 7-day grace period."
          >
            <Link to="/settings?tab=data" className="kc-btn sec" style={{ flexShrink: 0 }}>Open data and privacy</Link>
          </Row>
        ) : (
          <Row
            title="Delete your account"
            description="Removes you from this organization. Projects you created are deleted with their pins and comments."
          >
            <Button variant="danger-quiet" loading={deleteLoading} onClick={deleteAccount} style={{ flexShrink: 0 }}>Delete account</Button>
          </Row>
        )}
      </Section>
    </SettingsLayout>
  );
}
