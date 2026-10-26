import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import AuthShell, { AuthError, PasswordInput, SubmitButton, authInputClass } from '../components/auth/AuthShell';

const message = (err, fallback) => err.response?.data?.message || err.message || fallback;

export default function LoginPage() {
  const { login, completeTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.twoFactorRequired) {
        setChallenge(data.challengeToken);
        setPassword('');
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(message(err, 'Could not sign in.'));
    }
    setLoading(false);
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await completeTwoFactor(challenge, code);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'CHALLENGE_EXPIRED') {
        setChallenge(null);
        setCode('');
      }
      setError(message(err, 'Could not verify the code.'));
    }
    setLoading(false);
  };

  if (challenge) {
    return (
      <AuthShell
        title="Two-step sign-in"
        description={useRecovery ? 'Enter one of your recovery codes.' : 'Enter the 6-digit code from your authenticator app.'}
        footer={<button type="button" onClick={() => { setChallenge(null); setCode(''); setError(''); }} className="font-medium text-gray-700 hover:text-gray-900">Use a different account</button>}
      >
        <form onSubmit={handleCode} className="space-y-4">
          <AuthError>{error}</AuthError>
          <div>
            <label htmlFor="admin-code" className="mb-1.5 block text-sm font-medium text-gray-700">{useRecovery ? 'Recovery code' : 'Authentication code'}</label>
            {useRecovery ? (
              <input
                id="admin-code"
                key="recovery"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="XXXXX-XXXXX"
                className={`${authInputClass} font-mono tracking-wider`}
              />
            ) : (
              <input
                id="admin-code"
                key="totp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className={`${authInputClass} text-center font-mono text-lg tracking-[0.4em]`}
              />
            )}
          </div>
          <SubmitButton loading={loading} loadingLabel="Verifying…">Verify</SubmitButton>
          <button
            type="button"
            onClick={() => { setUseRecovery((v) => !v); setCode(''); setError(''); }}
            className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {useRecovery ? 'Use your authenticator app instead' : 'Lost your phone? Use a recovery code'}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Kommently admin" description="Sign in with your admin account">
      <form onSubmit={handlePassword} className="space-y-4">
        <AuthError>{error}</AuthError>
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input
            id="admin-email"
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
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="admin-password" className="text-sm font-medium text-gray-700">Password</label>
            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">Forgot password?</Link>
          </div>
          <PasswordInput id="admin-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </div>
        <SubmitButton loading={loading} loadingLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
