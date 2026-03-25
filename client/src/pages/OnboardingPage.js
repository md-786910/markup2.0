import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateOrganizationApi, uploadAvatarApi } from '../services/authService';
import AuthLayout from '../components/layout/AuthLayout';

const STEPS = [
  { id: 'account', label: 'Create Account' },
  { id: 'organization', label: 'Organization' },
  { id: 'profile', label: 'Profile' },
  { id: 'review', label: 'Review' },
];

export default function OnboardingPage() {
  const { user, signup, updateUser } = useAuth();
  const navigate = useNavigate();
  const logoRef = useRef(null);
  const avatarRef = useRef(null);

  const [step, setStep] = useState(user ? 1 : 0);

  // Account fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');

  // Org fields
  const [orgName, setOrgName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Profile fields
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStep = STEPS[step].id;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    setAccountLoading(true);
    setAccountError('');
    try {
      await signup(name, email, password);
      setOrgName(name + "'s Workspace");
      setStep(1);
    } catch (err) {
      setAccountError(err.response?.data?.message || 'Signup failed');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleOrgNext = () => {
    if (!orgName.trim()) return;
    setStep(2);
  };

  const handleProfileNext = () => {
    setStep(3);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const orgForm = new FormData();
      orgForm.append('name', orgName.trim());
      if (logoFile) orgForm.append('logo', logoFile);
      const orgRes = await updateOrganizationApi(orgForm);
      updateUser(orgRes.data.user);

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

      {/* ===== STEP 1: CREATE ACCOUNT ===== */}
      {currentStep === 'account' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-8">Get started with Feedbackly in seconds</p>

          {accountError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {accountError}
            </div>
          )}

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="Min 6 characters" />
            </div>
            <button type="submit" disabled={accountLoading}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
              {accountLoading ? 'Creating...' : 'Continue'}
            </button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
          </p>
        </>
      )}

      {/* ===== STEP 2: ORGANIZATION ===== */}
      {currentStep === 'organization' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Set up your workspace</h2>
          <p className="text-sm text-gray-500 mb-8">This is your team's shared space for all projects.</p>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace Name</label>
            <input type="text" value={orgName} onChange={(e) => { setOrgName(e.target.value); setError(''); }}
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
        </>
      )}

      {/* ===== STEP 3: PROFILE ===== */}
      {currentStep === 'profile' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your profile</h2>
          <p className="text-sm text-gray-500 mb-8">This helps your team recognize you.</p>

          <div className="flex flex-col items-center mb-6">
            <div onClick={() => avatarRef.current?.click()}
              className="w-20 h-20 rounded-full cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors flex items-center justify-center bg-gray-50 mb-2">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                  {(user?.name || name || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <button onClick={() => avatarRef.current?.click()} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }}
              className="hidden" />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-8 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-900 font-medium">{user?.name || name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900 font-medium">{user?.email || email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="text-gray-900 font-medium capitalize">{user?.role || 'Owner'}</span>
            </div>
          </div>

          <button onClick={handleProfileNext}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Continue
          </button>
        </>
      )}

      {/* ===== STEP 4: REVIEW ===== */}
      {currentStep === 'review' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & finish</h2>
          <p className="text-sm text-gray-500 mb-6">Make sure everything looks good.</p>

          <div className="space-y-3 mb-8">
            {/* Org summary */}
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

            {/* Profile summary */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Profile</h3>
              <div className="flex items-center gap-3">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {(user?.name || name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user?.name || name}</p>
                  <p className="text-xs text-gray-400">{user?.email || email} · Owner</p>
                </div>
              </div>
            </div>

            {/* Plan summary */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Plan</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Free Trial</p>
                  <p className="text-xs text-gray-400">5 projects · 10 members · 5 guests</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

          <button onClick={handleFinish} disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
            {loading ? 'Setting up your workspace...' : 'Launch Workspace'}
          </button>
        </>
      )}
    </AuthLayout>
  );
}
