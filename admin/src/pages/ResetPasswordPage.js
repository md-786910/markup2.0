import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resetPasswordApi } from '../services/authService';
import AuthShell, { AuthError, PasswordInput, SubmitButton } from '../components/auth/AuthShell';

const MIN_LENGTH = 12;

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError('The two passwords are different.');
    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset the password.');
    }
    setLoading(false);
  };

  if (done) {
    return (
      <AuthShell title="Password changed" footer={<Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>}>
        <p className="text-sm leading-6 text-gray-600">Your new password is set and every other session is signed out. Sign in with it now.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      description={`At least ${MIN_LENGTH} characters. A short phrase is easy to remember and hard to guess.`}
      footer={<Link to="/login" className="font-medium text-gray-700 hover:text-gray-900">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError>
          {error}
          {/expired|invalid/i.test(error) && <> <Link to="/forgot-password" className="font-medium underline">Get a new link</Link></>}
        </AuthError>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-gray-700">New password</label>
          <PasswordInput id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-gray-700">Repeat it</label>
          <PasswordInput id="confirm-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        <SubmitButton loading={loading} loadingLabel="Saving…">Set new password</SubmitButton>
      </form>
    </AuthShell>
  );
}
