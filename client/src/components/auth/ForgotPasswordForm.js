import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../../services/authService';
import { AuthHeading } from '../layout/AuthLayout';
import { Banner, Button, Field, Icon, Input } from '../kc';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="kc-auth-state">
        <span className="ico ok"><Icon name="mail" size={20} /></span>
        <h1 className="kc-display">Check your email</h1>
        <p>If an account with that email exists, we&apos;ve sent a password reset link. The link expires in 1 hour.</p>
        <p className="kc-auth-alt"><Link to="/login" className="kc-link">Back to log in</Link></p>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Forgot password?">Enter your email and we&apos;ll send you a reset link.</AuthHeading>
      <form onSubmit={handleSubmit} className="kc-auth-stack">
        {error && <Banner tone="danger">{error}</Banner>}
        <Field id="forgot-email" label="Email">
          <Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="kc-auth-alt">
        Remember your password? <Link to="/login" className="kc-link">Log in</Link>
      </p>
    </>
  );
}
