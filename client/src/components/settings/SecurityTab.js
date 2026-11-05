import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { changePasswordApi } from '../../services/authService';
import { toast } from '../../utils/toast';
import { Button, Field, IconButton, Input, Section } from '../kc';
import SettingsLayout from './SettingsLayout';

// Password field with a show/hide switch
export function PasswordInput({ id, value, onChange, autoComplete = 'off', invalid }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={invalid ? 'true' : undefined}
        style={{ paddingRight: 40 }}
      />
      <IconButton
        icon="eye"
        size="sm"
        iconSize={16}
        active={visible}
        label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', color: visible ? 'var(--brand-600)' : undefined }}
      />
    </div>
  );
}

// Settings → Security: change the password. The server rotates the session
// token on a password change; replaceToken keeps this tab signed in.
export default function SecurityTab() {
  const { replaceToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setCurrentPassword(''); setNewPassword(''); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setLoading(true);
    setError('');
    try {
      const res = await changePasswordApi(currentPassword, newPassword);
      replaceToken(res.data.token);
      reset();
      toast.success('Password changed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsLayout title="Security" subtitle="How you sign in to Kommently.">
      <form onSubmit={submit}>
        <Section
          title="Password"
          description="Enter your current password, then the new one."
          footer={(
            <>
              <Button disabled={loading || (!currentPassword && !newPassword)} onClick={reset}>Cancel</Button>
              <Button type="submit" variant="primary" loading={loading} disabled={!currentPassword || !newPassword}>Change password</Button>
            </>
          )}
        >
          <Field id="current-password" label="Current password" hint={<Link to="/forgot-password" className="kc-link">Forgot your password?</Link>}>
            <PasswordInput
              id="current-password"
              value={currentPassword}
              autoComplete="current-password"
              onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
            />
          </Field>
          <Field id="new-password" label="New password" hint="At least 8 characters." error={error}>
            <PasswordInput
              id="new-password"
              value={newPassword}
              autoComplete="new-password"
              invalid={!!error}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
            />
          </Field>
        </Section>
      </form>
    </SettingsLayout>
  );
}
