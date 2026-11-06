import React, { useState, useEffect } from 'react';
import PasswordInput from '../common/PasswordInput';
import { useAuth } from '../../hooks/useAuth';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { getInvitationApi } from '../../services/invitationService';
import { rememberWorkspace } from '../../contexts/WorkspaceContext';
import { AuthHeading } from '../layout/AuthLayout';
import { Banner, Button, Field, Icon, Input } from '../kc';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Fetch invitation details if token is present
  useEffect(() => {
    if (!token) return;
    setInviteLoading(true);
    getInvitationApi(token)
      .then((res) => {
        setInvitation(res.data.invitation);
        setEmail(res.data.invitation.email);
      })
      .catch((err) => {
        setInviteError(err.response?.data?.message || 'Invalid or expired invitation');
      })
      .finally(() => setInviteLoading(false));
  }, [token]);

  // If no invitation token, redirect to fresh onboarding
  if (!token) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signup(name, email, password, token);
      // Invited to a workspace: open it on the dashboard
      if (data?.invitedWorkspaceId) rememberWorkspace(data.user?.organization, data.invitedWorkspaceId);
      navigate(data?.invitedProjectId ? `/project/${data.invitedProjectId}` : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (inviteLoading) {
    return (
      <div className="kc-auth-state" role="status" aria-label="Loading the invitation">
        <span className="inline-block h-6 w-6 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="kc-auth-state">
        <span className="ico err"><Icon name="x" size={20} stroke={2} /></span>
        <h1 className="kc-display">Invitation not valid</h1>
        <p>{inviteError}</p>
        <p className="kc-auth-alt"><Link to="/login" className="kc-link">Go to log in</Link></p>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Create your account">
        {invitation ? null : 'The first person becomes the workspace owner.'}
      </AuthHeading>

      <form onSubmit={handleSubmit} className="kc-auth-stack">
        {invitation && (
          <Banner tone="info" title={`${invitation.invitedBy} invited you to ${invitation.projectName}`}>
            Create your account to get started.
          </Banner>
        )}
        {error && <Banner tone="danger">{error}</Banner>}
        <Field id="signup-name" label="Name">
          <Input id="signup-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
        </Field>
        <Field id="signup-email" label="Email">
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!invitation}
            placeholder="you@example.com"
            style={invitation ? { background: 'var(--slate-50)', color: 'var(--text-secondary)' } : undefined}
          />
        </Field>
        <Field id="signup-password" label="Password" hint="At least 8 characters.">
          <PasswordInput id="signup-password" wrapperClassName="kc-pass" className="kc-input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          {loading ? 'Creating account…' : invitation ? 'Join project' : 'Create account'}
        </Button>
      </form>
      <p className="kc-auth-alt">
        Already have an account? <Link to="/login" className="kc-link">Log in</Link>
      </p>
    </>
  );
}
