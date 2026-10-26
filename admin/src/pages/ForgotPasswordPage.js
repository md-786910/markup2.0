import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../services/authService';
import AuthShell, { AuthError, SubmitButton, authInputClass } from '../components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the email. Try again in a moment.');
    }
    setLoading(false);
  };

  const backToSignIn = <Link to="/login" className="font-medium text-gray-700 hover:text-gray-900">Back to sign in</Link>;

  if (sent) {
    return (
      <AuthShell title="Check your email" footer={backToSignIn}>
        <p className="text-sm leading-6 text-gray-600">
          If <span className="font-medium text-gray-900">{email}</span> is an admin account, we've sent a link to reset the password.
          The link works for 30 minutes.
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          Your two-step sign-in stays on: after the reset you still need your authenticator app or a recovery code.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" description="We'll email you a link to choose a new one." footer={backToSignIn}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError>{error}</AuthError>
        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            placeholder="you@company.com"
            className={authInputClass}
          />
        </div>
        <SubmitButton loading={loading} loadingLabel="Sending…">Send reset link</SubmitButton>
      </form>
    </AuthShell>
  );
}
