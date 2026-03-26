import React, { useState, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateOrganizationApi, uploadAvatarApi, validateEmailApi } from '../services/authService';
import AuthLayout from '../components/layout/AuthLayout';

const STEPS = [
  { id: 'organization', label: 'Organization' },
  { id: 'account', label: 'Account' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
];

const PLANS = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: '$0',
    period: '30 days',
    features: ['5 projects', '10 members', '5 guests', 'All core features'],
    available: true,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$12',
    period: '/month',
    features: ['15 projects', '25 members', '10 guests', 'Priority support'],
    available: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/month',
    features: ['Unlimited projects', 'Unlimited members', '50 guests', 'Custom branding'],
    available: false,
  },
];

export default function OnboardingPage() {
  const { user, signup, updateUser } = useAuth();
  const navigate = useNavigate();
  const logoRef = useRef(null);
  const avatarRef = useRef(null);

  const [step, setStep] = useState(0);

  // Org fields
  const [orgName, setOrgName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Account fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profile fields
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Payment
  const [selectedPlan, setSelectedPlan] = useState('trial');

  // Email validation
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailError, setEmailError] = useState('');

  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Already authenticated → go to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentStep = STEPS[step]?.id;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleOrgNext = () => {
    if (!orgName.trim()) return;
    setStep(step + 1);
  };

  const handleAccountNext = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || password.length < 6) return;

    setEmailValidating(true);
    setEmailError('');
    try {
      await validateEmailApi(email.trim());
      setStep(step + 1);
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Email validation failed');
    } finally {
      setEmailValidating(false);
    }
  };

  const handleReviewNext = () => {
    setStep(step + 1);
  };

  // Batch submit — all API calls happen here at the final step
  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create account
      await signup(name, email, password);

      // 2. Update organization name + logo
      const orgForm = new FormData();
      orgForm.append('name', orgName.trim());
      if (logoFile) orgForm.append('logo', logoFile);
      const orgRes = await updateOrganizationApi(orgForm);
      updateUser(orgRes.data.user);

      // 3. Upload avatar if provided
      if (avatarFile) {
        const avatarForm = new FormData();
        avatarForm.append('avatar', avatarFile);
        const avatarRes = await uploadAvatarApi(avatarForm);
        updateUser(avatarRes.data.user);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <span key={s.id} className={`text-[11px] font-medium ${
              i < step ? 'text-blue-600' : i === step ? 'text-gray-900' : 'text-gray-300'
            }`}>
              {s.label}
            </span>
          ))}
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ===== STEP 1: ORGANIZATION ===== */}
      {currentStep === 'organization' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Set up your workspace</h2>
          <p className="text-sm text-gray-500 mb-8">This is your team's shared space for all projects.</p>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace Name</label>
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Inc." autoFocus
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow" />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace Logo <span className="text-gray-400 font-normal">(optional)</span></label>
            <div onClick={() => logoRef.current?.click()}
              className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-colors">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">{logoFile ? logoFile.name : 'Click to upload'}</p>
                <p className="text-xs text-gray-400">PNG, JPG or GIF, max 5MB</p>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }}
              className="hidden" />
          </div>

          <button onClick={handleOrgNext} disabled={!orgName.trim()}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm">
            Continue
          </button>
          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
          </p>
        </>
      )}

      {/* ===== STEP 2: ACCOUNT ===== */}
      {currentStep === 'account' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-8">Set up your account for {orgName}</p>

          {emailError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {emailError}
            </div>
          )}

          <form onSubmit={handleAccountNext} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(''); }} required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="Min 6 characters" />
            </div>

            {/* Avatar upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Photo <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="flex items-center gap-3">
                <div onClick={() => avatarRef.current?.click()}
                  className="w-12 h-12 rounded-full cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors flex items-center justify-center bg-gray-50 shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <button type="button" onClick={() => avatarRef.current?.click()} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {avatarPreview ? 'Change photo' : 'Upload photo'}
                </button>
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }}
                  className="hidden" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleBack}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
                Back
              </button>
              <button type="submit" disabled={emailValidating}
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
                {emailValidating ? 'Verifying email...' : 'Continue'}
              </button>
            </div>
          </form>
        </>
      )}

      {/* ===== STEP 3: REVIEW ===== */}
      {currentStep === 'review' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & confirm</h2>
          <p className="text-sm text-gray-500 mb-6">Make sure everything looks good before we set things up.</p>

          <div className="space-y-3 mb-8">
            {/* Workspace summary */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Workspace</h3>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {(orgName || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{orgName}</p>
                  <p className="text-xs text-gray-400">Free trial · 30 days</p>
                </div>
              </div>
            </div>

            {/* Account summary */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Account</h3>
              <div className="flex items-center gap-3">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {(name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400">{email} · Owner</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleBack}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Back
            </button>
            <button onClick={handleReviewNext}
              className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm">
              Continue
            </button>
          </div>
        </>
      )}

      {/* ===== STEP 4: PAYMENT (dummy Stripe) ===== */}
      {currentStep === 'payment' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your plan</h2>
          <p className="text-sm text-gray-500 mb-6">Start with a free trial. Upgrade anytime.</p>

          <div className="space-y-3 mb-8">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                onClick={() => plan.available && setSelectedPlan(plan.id)}
                className={`border rounded-xl p-4 transition-all ${
                  !plan.available
                    ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                    : selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500 cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                    {!plan.available && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">Coming soon</span>
                    )}
                    {plan.id === 'trial' && selectedPlan === 'trial' && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">Selected</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">{plan.price}</span>
                    <span className="text-xs text-gray-400 ml-0.5">{plan.period}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {plan.features.map((f, i) => (
                    <span key={i} className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleBack}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Back
            </button>
            <button onClick={handleFinish} disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
              {loading ? 'Setting up your workspace...' : 'Start Free Trial'}
            </button>
          </div>

          <p className="text-center mt-4 text-xs text-gray-400">
            No credit card required. You can upgrade after your trial ends.
          </p>
        </>
      )}
    </AuthLayout>
  );
}
