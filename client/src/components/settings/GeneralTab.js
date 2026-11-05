import React, { useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateOrganizationApi } from '../../services/authService';
import { uploadUrl } from '../../utils/uploadUrl';
import { toast } from '../../utils/toast';
import { Button, Field, Input, Row, Section } from '../kc';
import SettingsLayout from './SettingsLayout';

// Settings → General: the organization's name and icon.
// Deleting the organization lives in Data and privacy.
export default function GeneralTab() {
  const { user, isOwner, updateUser } = useAuth();
  const savedName = user?.orgName || '';
  const [name, setName] = useState(savedName);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileRef = useRef(null);

  const dirty = name.trim() !== savedName;

  const saveName = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !dirty) return;
    setSaving(true);
    setNameError('');
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      const res = await updateOrganizationApi(formData);
      updateUser(res.data.user);
      toast.success('Organization name saved.');
    } catch (err) {
      setNameError(err.response?.data?.message || 'Could not save the name.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    setLogoError('');
    try {
      const formData = new FormData();
      formData.append('name', savedName || name);
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

  const initial = (savedName || user?.name || '?')[0].toUpperCase();

  return (
    <SettingsLayout title="General" subtitle="Your organization's name and icon.">
      <form onSubmit={saveName}>
        <Section
          title="Organization"
          description="Its name and icon appear in the app, in emails and on review links."
          footer={isOwner ? (
            <>
              <Button disabled={!dirty || saving} onClick={() => { setName(savedName); setNameError(''); }}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving} disabled={!name.trim() || !dirty}>Save changes</Button>
            </>
          ) : null}
        >
          <Field id="org-name" label="Name" hint={isOwner ? null : 'Only the owner can change it.'} error={nameError}>
            <Input
              id="org-name"
              value={isOwner ? name : savedName}
              maxLength={80}
              disabled={!isOwner}
              aria-invalid={nameError ? 'true' : undefined}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
            />
          </Field>
          <Field label="Icon" error={logoError}>
            <Row title="Square image" description={isOwner ? 'At least 256 × 256 px, PNG or JPG.' : 'Only the owner can change the icon.'}>
              <div className="flex items-center gap-3 shrink-0">
                {user?.orgLogo ? (
                  <img src={uploadUrl(user.orgLogo)} alt="Organization icon" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <span className="kc-tile blue" style={{ width: 40, height: 40, fontSize: 18 }} aria-hidden="true">{initial}</span>
                )}
                {isOwner && (
                  <>
                    <Button icon="upload" loading={logoLoading} onClick={() => fileRef.current?.click()}>
                      {user?.orgLogo ? 'Change icon' : 'Upload icon'}
                    </Button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadLogo} className="hidden" />
                  </>
                )}
              </div>
            </Row>
          </Field>
        </Section>
      </form>
    </SettingsLayout>
  );
}
