import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { takeReturnTo } from '../../utils/returnTo';
import PasswordInput from '../common/PasswordInput';
import { AuthHeading } from '../layout/AuthLayout';
import { Banner, Button, Field, Input } from '../kc';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionMsg, setSessionMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const replaced = sessionStorage.getItem('session_replaced');
    if (replaced) {
      setSessionMsg('You were logged out because your account was signed in on another device.');
      sessionStorage.removeItem('session_replaced');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(takeReturnTo(), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthHeading title="Welcome back">Log in to your account to continue.</AuthHeading>

      <div className="kc-auth-stack">
        {sessionMsg && <Banner tone="info">{sessionMsg}</Banner>}
        {error && <Banner tone="danger">{error}</Banner>}

        <form onSubmit={handleSubmit} className="kc-auth-stack">
          <Field id="login-email" label="Email">
            <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </Field>
          <Field id="login-password" label="Password">
            <PasswordInput
              id="login-password"
              wrapperClassName="kc-pass"
              className="kc-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </Field>
          <div className="kc-auth-row" style={{ justifyContent: 'flex-end' }}>
            <Link to="/forgot-password" className="kc-link" style={{ fontSize: 13 }}>Forgot password?</Link>
          </div>
          <Button type="submit" variant="primary" size="lg" block loading={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </div>

      <p className="kc-auth-alt">
        Don&apos;t have an account? <Link to="/onboarding" className="kc-link">Start free trial</Link>
      </p>
    </>
  );
}
