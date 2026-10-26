import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { resetPasswordApi } from '../services/authService';
import AuthShell, { AuthError, PasswordInput, SubmitButton } from '../components/auth/AuthShell';

const MIN_LENGTH = 12;

export default function ResetPasswordPage() {
  const { token } = useParams();
  // Invitation emails use the same link with ?invite=1
  const isInvite = useSearchParams()[0].get('invite') === '1';
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
      <AuthShell title={isInvite ? 'Your admin account is ready' : 'Password changed'} footer={<Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>}>
        <p className="text-sm leading-6 text-gray-600">
          {isInvite
            ? 'Sign in with your email and new password. You will then turn on two-step sign-in with an authenticator app.'
            : 'Your new password is set and every other session is signed out. Sign in with it now.'}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={isInvite ? 'Set your admin password' : 'Choose a new password'}
      description={`At least ${MIN_LENGTH} characters. A short phrase is easy to remember and hard to guess.`}
      footer={<Link to="/login" className="font-medium text-gray-700 hover:text-gray-900">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError>
          {error}
          {/expired|invalid/i.test(error) && (isInvite
            ? <> Ask an admin to send the invitation again.</>
            : <> <Link to="/forgot-password" className="font-medium underline">Get a new link</Link></>)}
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
