import React, { useState } from 'react';
import PasswordInput from '../common/PasswordInput';
import { Link, useParams } from 'react-router-dom';
import { resetPasswordApi } from '../../services/authService';
import { AuthHeading } from '../layout/AuthLayout';
import { Banner, Button, Field, Icon } from '../kc';

export default function ResetPasswordForm() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="kc-auth-state">
        <span className="ico ok"><Icon name="check" size={20} stroke={2} /></span>
        <h1 className="kc-display">Password reset</h1>
        <p>Your password has been reset. You can now log in with your new password.</p>
        <div style={{ marginTop: 24 }}>
          <Link to="/login" className="kc-btn pri lg block">Go to log in</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Reset password">Enter your new password below.</AuthHeading>
      <form onSubmit={handleSubmit} className="kc-auth-stack">
        {error && <Banner tone="danger">{error}</Banner>}
        <Field id="reset-password" label="New password" hint="At least 8 characters.">
          <PasswordInput id="reset-password" wrapperClassName="kc-pass" className="kc-input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" />
        </Field>
        <Field id="reset-confirm" label="Confirm password">
          <PasswordInput id="reset-confirm" wrapperClassName="kc-pass" className="kc-input" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} placeholder="Re-enter password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
      <p className="kc-auth-alt"><Link to="/login" className="kc-link">Back to log in</Link></p>
    </>
  );
}
