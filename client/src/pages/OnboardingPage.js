import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateOrganizationApi, uploadAvatarApi, validateEmailApi, sendOtpApi, verifyOtpApi } from '../services/authService';
import { getPublicPlansApi, createCheckoutSessionApi, verifyPaymentApi, upgradePlanApi, getBillingConfigApi } from '../services/billingService';
import AuthLayout from '../components/layout/AuthLayout';

const STEPS = [
  { id: 'organization', label: 'Organization' },
  { id: 'account', label: 'Account' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
];

// Free trial is no longer offered on the Payment step — users must pick a paid plan.

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function loadScript(src, id) {
  return new Promise((resolve) => {
    if (id && document.getElementById(id)) return resolve(true);
    const script = document.createElement('script');
    script.src = src;
    if (id) script.id = id;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Profile fields
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Payment
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [livePlans, setLivePlans] = useState(null); // null = still loading

  // Setting-up state shown after Start is clicked on the Payment step
  const [phase, setPhase] = useState('idle'); // 'idle' | 'setting-up' | 'paypal-checkout' | 'retry'
  const [stages, setStages] = useState({ account: 'pending', workspace: 'pending', avatar: 'pending', checkout: 'pending' });
  const [retryReason, setRetryReason] = useState('');
  const [billingConfig, setBillingConfig] = useState(null); // { activeProvider, razorpay?, paypal? }
  const [paypalError, setPaypalError] = useState('');

  // Email validation
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Email OTP verification
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tick down resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Fetch live plans once we approach the Payment step
  useEffect(() => {
    if (livePlans !== null) return;
    if (step < 2) return; // pre-fetch on review step so the user doesn't wait
    let alive = true;
    getPublicPlansApi()
      .then((res) => {
        if (!alive) return;
        const list = (res.data?.planList || [])
          .filter((p) => p.enabled !== false && p.id !== 'enterprise')
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            priceLabel: p.priceLabel,
            period: p.period,
            features: p.features || [],
            popular: !!p.popular,
          }));
        setLivePlans(list);
        // Default-select the popular plan, else the first in order
        const def = list.find((p) => p.popular) || list[0];
        if (def) setSelectedPlan((curr) => curr || def.id);
      })
      .catch(() => {
        if (alive) setLivePlans([]);
      });
    return () => { alive = false; };
  }, [step, livePlans]);

  // Already authenticated AND not mid-onboarding → go to dashboard.
  // During the setup/checkout/retry phases the user becomes authenticated by
  // signup() inside runSetup(); we must NOT redirect or the payment gateway
  // would open on top of the dashboard.
  if (user && phase === 'idle') {
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

  const handleAccountNext = (e) => {
    e.preventDefault();
    if (!emailVerified) return;
    if (!name.trim() || !password || password.length < 6) return;
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setStep(step + 1);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    // Pre-flight format/registered check, then send
    setEmailValidating(true);
    setEmailError('');
    setOtpError('');
    try {
      await validateEmailApi(email.trim());
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Invalid email');
      setEmailValidating(false);
      return;
    }
    setEmailValidating(false);

    setOtpSending(true);
    try {
      const res = await sendOtpApi(email.trim());
      setOtpSent(true);
      setResendCooldown(res.data?.cooldownSec || 30);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to send code');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setOtpVerifying(true);
    setOtpError('');
    try {
      await verifyOtpApi(email.trim(), otp.trim());
      setEmailVerified(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Incorrect code');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Reset verification state if email is changed after sending/verifying
  const handleEmailChange = (next) => {
    setEmail(next);
    setEmailError('');
    if (otpSent || emailVerified) {
      setOtpSent(false);
      setEmailVerified(false);
      setOtp('');
      setOtpError('');
      setResendCooldown(0);
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
  };

  const handleReviewNext = () => {
    setStep(step + 1);
  };

  // Run the shared setup steps (signup → org → avatar). Updates the staged
  // checklist as it progresses. Returns true on success, false on error.
  const runSetup = async () => {
    try {
      setStages((s) => ({ ...s, account: 'active' }));
      await signup(name, email, password);
      await wait(400); // small minimum so the checklist doesn't pop
      setStages((s) => ({ ...s, account: 'done', workspace: 'active' }));

      const orgForm = new FormData();
      orgForm.append('name', orgName.trim());
      if (logoFile) orgForm.append('logo', logoFile);
      const orgRes = await updateOrganizationApi(orgForm);
      updateUser(orgRes.data.user);
      await wait(400);
      setStages((s) => ({
        ...s,
        workspace: 'done',
        avatar: avatarFile ? 'active' : 'skipped',
      }));

      if (avatarFile) {
        const avatarForm = new FormData();
        avatarForm.append('avatar', avatarFile);
        const avatarRes = await uploadAvatarApi(avatarForm);
        updateUser(avatarRes.data.user);
        await wait(400);
        setStages((s) => ({ ...s, avatar: 'done' }));
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete setup');
      return false;
    }
  };

  // If the admin enabled a free plan, demote to it on payment cancel/fail so
  // the user lands on dashboard with usable access. Otherwise the org stays on
  // its trial (set during signup) and we still navigate to dashboard.
  const fallbackToFreeOrTrial = async () => {
    const free = (livePlans || []).find((p) => p.price === 0 || p.price == null);
    if (free) {
      try {
        const res = await upgradePlanApi(free.id);
        updateUser(res.data.user);
      } catch (_) {
        // Leave the workspace on trial; user can still proceed.
      }
    }
    setStages((s) => ({ ...s, checkout: 'done' }));
    await wait(400);
    navigate('/dashboard');
  };

  const openRazorpayCheckout = async () => {
    setStages((s) => ({ ...s, checkout: 'active' }));
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      await fallbackToFreeOrTrial();
      return;
    }

    let session;
    try {
      const res = await createCheckoutSessionApi(selectedPlan);
      session = res.data;
    } catch (err) {
      await fallbackToFreeOrTrial();
      return;
    }

    const rzp = new window.Razorpay({
      key: session.key_id,
      amount: session.amount,
      currency: session.currency,
      order_id: session.orderId,
      name: 'Feedbackly',
      description: `${(livePlans || []).find((p) => p.id === selectedPlan)?.name || ''} subscription`,
      prefill: { name, email },
      theme: { color: '#176b57' },
      handler: async (response) => {
        try {
          const verifyRes = await verifyPaymentApi({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          updateUser(verifyRes.data.user);
          setStages((s) => ({ ...s, checkout: 'done' }));
          await wait(500);
          navigate('/dashboard');
        } catch (err) {
          // Verification failures need admin attention — keep the retry view.
          setRetryReason(err.response?.data?.message || 'Payment verification failed.');
          setPhase('retry');
        }
      },
      modal: {
        ondismiss: () => { fallbackToFreeOrTrial(); },
      },
    });
    rzp.on('payment.failed', () => { fallbackToFreeOrTrial(); });
    rzp.open();
  };

  const openCheckout = async (cfg) => {
    const provider = cfg?.activeProvider;
    if (provider === 'razorpay') return openRazorpayCheckout();
    if (provider === 'paypal') {
      setPaypalError('');
      setStages((s) => ({ ...s, checkout: 'active' }));
      setPhase('paypal-checkout');
      return;
    }
    // No provider configured — fall back so the user isn't stuck.
    await fallbackToFreeOrTrial();
  };

  const handleFinish = async () => {
    if (!selectedPlan) return;
    setError('');
    setPhase('setting-up');
    setStages({ account: 'pending', workspace: 'pending', avatar: 'pending', checkout: 'pending' });

    const ok = await runSetup();
    if (!ok) {
      setPhase('idle');
      return;
    }

    // Free plan (price 0 or null) skips checkout — flip the org off `trial` and
    // onto the actual `free` plan so the BillingTab reflects it.
    const planObj = (livePlans || []).find((p) => p.id === selectedPlan);
    const isFree = planObj && (planObj.price === 0 || planObj.price == null);
    if (isFree) {
      try {
        const res = await upgradePlanApi(selectedPlan);
        updateUser(res.data.user);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not activate the free plan.');
      }
      await wait(400);
      navigate('/dashboard');
      return;
    }

    // Paid plan — fetch billing config (we're authenticated now post-signup)
    // and dispatch to the active provider's checkout.
    let cfg = billingConfig;
    if (!cfg) {
      try {
        const res = await getBillingConfigApi();
        cfg = res.data;
        setBillingConfig(cfg);
      } catch (_) {
        cfg = { activeProvider: null };
      }
    }
    await openCheckout(cfg);
  };

  const handleRetryCheckout = async () => {
    setRetryReason('');
    setPhase('setting-up');
    setStages((s) => ({ ...s, account: 'done', workspace: 'done', avatar: avatarFile ? 'done' : 'skipped', checkout: 'pending' }));
    await openCheckout(billingConfig);
  };

  const handleSkipToDashboard = () => {
    navigate('/dashboard');
  };

  // Setting-up overlay — replaces the form column when payment flow is mid-flight
  if (phase === 'setting-up' || phase === 'retry' || phase === 'paypal-checkout') {
    const selectedPlanObj = (livePlans || []).find((p) => p.id === selectedPlan);
    const isFreePlan = selectedPlanObj && (selectedPlanObj.price === 0 || selectedPlanObj.price == null);
    return (
      <AuthLayout>
        {phase === 'setting-up' && (
          <SettingUpView stages={stages} planName={selectedPlanObj?.name} priceLabel={selectedPlanObj?.priceLabel} period={selectedPlanObj?.period} avatarPlanned={!!avatarFile} paidPlan={!isFreePlan} />
        )}
        {phase === 'paypal-checkout' && (
          <PaypalCheckoutView
            plan={selectedPlanObj}
            clientId={billingConfig?.paypal?.clientId}
            currency={billingConfig?.paypal?.currency || 'USD'}
            error={paypalError}
            setError={setPaypalError}
            onApproved={async (orderID) => {
              try {
                const verifyRes = await verifyPaymentApi({ paypalOrderId: orderID });
                updateUser(verifyRes.data.user);
                setStages((s) => ({ ...s, checkout: 'done' }));
                await wait(500);
                navigate('/dashboard');
              } catch (err) {
                setRetryReason(err.response?.data?.message || 'Payment verification failed.');
                setPhase('retry');
              }
            }}
            onCancel={fallbackToFreeOrTrial}
            onSdkFailure={fallbackToFreeOrTrial}
            createOrder={async () => {
              const res = await createCheckoutSessionApi(selectedPlan);
              if (!res.data?.paypalOrderId) throw new Error('No PayPal order id from server.');
              return res.data.paypalOrderId;
            }}
          />
        )}
        {phase === 'retry' && (
          <RetryView reason={retryReason} planName={selectedPlanObj?.name} onRetry={handleRetryCheckout} onSkip={handleSkipToDashboard} />
        )}
      </AuthLayout>
    );
  }

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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Workspace Name <span className="text-red-500">*</span></label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} required
                  disabled={emailVerified}
                  className={`flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow ${emailVerified ? 'bg-gray-50 text-gray-500' : ''}`}
                  placeholder="you@company.com" />
                {emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <button type="button" onClick={handleSendOtp}
                    disabled={!email.trim() || emailValidating || otpSending || resendCooldown > 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0">
                    {otpSending || emailValidating
                      ? 'Sending...'
                      : resendCooldown > 0
                        ? `Resend ${resendCooldown}s`
                        : otpSent ? 'Resend' : 'Verify'}
                  </button>
                )}
              </div>
              {emailError && !emailVerified && (
                <p className="text-xs text-red-600 mt-2">{emailError}</p>
              )}
              {otpSent && !emailVerified && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs text-blue-800 mb-2">
                    We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                      placeholder="000000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest text-center"
                    />
                    <button type="button" onClick={handleVerifyOtp}
                      disabled={otp.length !== 6 || otpVerifying}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors shrink-0">
                      {otpVerifying ? 'Verifying...' : 'Confirm'}
                    </button>
                  </div>
                  {otpError && <p className="text-xs text-red-600 mt-2">{otpError}</p>}
                </div>
              )}
            </div>
            {emailVerified && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                      required minLength={6}
                      className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                      placeholder="Min 6 characters" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                      required minLength={6}
                      className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                      placeholder="Re-enter password" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {passwordError && (
                  <p className="sm:col-span-2 text-xs text-red-600 -mt-1">{passwordError}</p>
                )}
              </div>
            )}

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
              <button type="submit"
                disabled={!emailVerified || !name.trim() || password.length < 6 || password !== confirmPassword}
                title={!emailVerified ? 'Verify your email to continue' : undefined}
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
                Continue
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

      {/* ===== STEP 4: PAYMENT ===== */}
      {currentStep === 'payment' && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your plan</h2>
          <p className="text-sm text-gray-500 mb-6">Pick a plan to activate your workspace.</p>

          <div className="space-y-3 mb-8">
            {livePlans === null ? (
              <>
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </>
            ) : livePlans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-xl">
                No plans are available right now. Please contact support.
              </p>
            ) : (
              livePlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative border rounded-xl p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                        Most Popular
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                        {isSelected && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">Selected</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">{plan.priceLabel}</span>
                        {plan.period && <span className="text-xs text-gray-400 ml-0.5">{plan.period}</span>}
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
                );
              })
            )}
          </div>

          {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={handleBack}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
              Back
            </button>
            <button onClick={handleFinish} disabled={loading || livePlans === null || !selectedPlan}
              className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
              {loading
                ? 'Setting up your workspace...'
                : (() => {
                    const p = (livePlans || []).find((x) => x.id === selectedPlan);
                    const isFree = p && (p.price === 0 || p.price == null);
                    return isFree ? 'Start with Free' : 'Continue to payment';
                  })()}
            </button>
          </div>

          <p className="text-center mt-4 text-xs text-gray-400">
            {(() => {
              const p = (livePlans || []).find((x) => x.id === selectedPlan);
              const isFree = p && (p.price === 0 || p.price == null);
              return isFree
                ? 'No credit card required. You can upgrade any time from Settings → Billing.'
                : "You'll be redirected to a secure payment gateway after we set up your workspace.";
            })()}
          </p>
        </>
      )}
    </AuthLayout>
  );
}

// ──────────────────────────────────────────────────────────────────
// Setting-up + Retry views
// ──────────────────────────────────────────────────────────────────

function StageRow({ status, label, sublabel }) {
  if (status === 'skipped') return null;
  return (
    <div className={`flex items-center gap-4 transition-opacity ${status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
      <div className="shrink-0 relative w-8 h-8 flex items-center justify-center">
        {status === 'done' ? (
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : status === 'active' ? (
          <>
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-60" />
            <svg className="w-8 h-8 text-blue-600 animate-spin relative" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </>
        ) : (
          <div className="w-8 h-8 rounded-full border-2 border-gray-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${status === 'done' ? 'text-gray-900' : status === 'active' ? 'text-gray-900' : 'text-gray-400'}`}>
          {label}
        </p>
        {sublabel && status === 'active' && (
          <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

function SettingUpView({ stages, planName, priceLabel, period, avatarPlanned, paidPlan = true }) {
  const order = ['account', 'workspace', avatarPlanned ? 'avatar' : null, paidPlan ? 'checkout' : null].filter(Boolean);
  const doneCount = order.filter((k) => stages[k] === 'done').length;
  const progress = (doneCount / order.length) * 100;

  const labels = {
    account: { label: 'Creating your account', sub: 'Securing your credentials' },
    workspace: { label: 'Setting up your workspace', sub: 'Naming and configuring' },
    avatar: { label: 'Uploading your avatar', sub: 'Almost there' },
    checkout: { label: 'Opening secure checkout', sub: 'Loading payment gateway' },
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center mb-4 animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Setting up your workspace</h2>
        <p className="text-sm text-gray-500 mt-1">
          {!paidPlan
            ? 'This will only take a moment.'
            : planName && priceLabel
              ? <>You'll be charged <strong>{priceLabel}{period}</strong> for the {planName} plan after checkout.</>
              : 'This will only take a moment.'}
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <StageRow status={stages.account} label={labels.account.label} sublabel={labels.account.sub} />
        <StageRow status={stages.workspace} label={labels.workspace.label} sublabel={labels.workspace.sub} />
        <StageRow status={stages.avatar} label={labels.avatar.label} sublabel={labels.avatar.sub} />
        {paidPlan && <StageRow status={stages.checkout} label={labels.checkout.label} sublabel={labels.checkout.sub} />}
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Don't close this window — your secure checkout will open in a moment.
      </p>
    </div>
  );
}

function RetryView({ reason, planName, onRetry, onSkip }) {
  return (
    <div className="animate-fade-in text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-100 items-center justify-center mb-4">
        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment paused</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{reason}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={onSkip}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
          Skip to dashboard
        </button>
        <button onClick={onRetry}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm">
          Try {planName ? `${planName} ` : ''}checkout again
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Your workspace is ready — you can pay any time from Settings → Billing.
      </p>
    </div>
  );
}

function PaypalCheckoutView({ plan, clientId, currency, error, setError, createOrder, onApproved, onCancel, onSdkFailure }) {
  const containerRef = useRef(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!clientId) {
      setError('PayPal is not configured.');
      return undefined;
    }
    if (renderedRef.current) return undefined;

    let cancelled = false;
    (async () => {
      const sdkUrl =
        `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
        `&currency=${encodeURIComponent(currency || 'USD')}&intent=capture&components=buttons`;
      const ok = await loadScript(sdkUrl, 'paypal-sdk-script');
      if (cancelled) return;
      if (!ok || !window.paypal || !containerRef.current) {
        setError('Failed to load PayPal SDK.');
        if (typeof onSdkFailure === 'function') onSdkFailure();
        return;
      }
      renderedRef.current = true;
      try {
        window.paypal
          .Buttons({
            style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' },
            createOrder: async () => {
              setError('');
              try {
                return await createOrder();
              } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to start checkout.');
                throw err;
              }
            },
            onApprove: async (data) => {
              try {
                await onApproved(data.orderID);
              } catch (err) {
                setError(err.response?.data?.message || 'Payment verification failed.');
              }
            },
            onCancel: () => { if (typeof onCancel === 'function') onCancel(); },
            onError: (err) => {
              setError((err && err.message) || 'PayPal checkout failed.');
              if (typeof onCancel === 'function') onCancel();
            },
          })
          .render(containerRef.current);
      } catch (_) {
        setError('Failed to render PayPal Buttons.');
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, currency, createOrder, onApproved, onCancel, onSdkFailure, setError]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-4 border border-blue-100">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2m4 0h2m-9 4h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Complete your payment</h2>
        {plan && (
          <p className="text-sm text-gray-500 mt-1">
            {plan.priceLabel}{plan.period} for the {plan.name} plan
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 text-center">Pay with PayPal</p>
        <div ref={containerRef} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-sm text-center mb-4">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
      >
        Skip payment for now
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">
        You can pay any time from Settings → Billing.
      </p>
    </div>
  );
}
