import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateOrganizationApi, uploadAvatarApi, validateEmailApi, sendOtpApi, verifyOtpApi } from '../services/authService';
import { getPublicPlansApi, createCheckoutSessionApi, verifyPaymentApi, upgradePlanApi, getBillingConfigApi } from '../services/billingService';
import { CoverArt, AuthHeading } from '../components/layout/AuthLayout';
import PasswordInput from '../components/common/PasswordInput';
import { Badge, Banner, Button, Field, Icon, Input, Logo, Progress, cx } from '../components/kc';
import { track } from '../monitoring/analytics';

const STEPS = [
  { id: 'organization', label: 'Organization' },
  { id: 'account', label: 'Account' },
  { id: 'payment', label: 'Plan' },
];

// New workspaces start on a no-card free trial by default. Paying up front is
// optional; trial reminder emails ask the owner to add payment before it ends.
const TRIAL_PLAN_ID = 'trial';

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
  useEffect(() => { track('onboarding_step', { step: STEPS[step]?.id }); }, [step]);

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
  const [trialDays, setTrialDays] = useState(30); // server default until /plans answers
  const [signupMode, setSignupMode] = useState('trial');

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
  const [loading] = useState(false);
  const [error, setError] = useState('');

  // Tick down resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Fetch live plans immediately on mount
  useEffect(() => {
    if (livePlans !== null) return;
    let alive = true;
    getPublicPlansApi()
      .then((res) => {
        if (!alive) return;
        const days = res.data?.trialDays ?? 30;
        const mode = res.data?.signupMode || 'trial';
        setTrialDays(days);
        setSignupMode(mode);

        const list = (res.data?.planList || [])
          .filter((p) => p.enabled !== false && p.id !== 'enterprise' && p.id !== TRIAL_PLAN_ID)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            priceLabel: p.priceLabel,
            period: p.period,
            features: p.features || [],
            popular: !!p.popular,
          }));
        if (mode === TRIAL_PLAN_ID) {
          list.unshift({
            id: TRIAL_PLAN_ID,
            name: 'Free trial',
            price: 0,
            priceLabel: `${days} ${days === 1 ? 'day' : 'days'} free`,
            period: '',
            features: ['All Pro features', 'No credit card required', 'Choose a plan any time before the trial ends'],
            popular: false,
          });
        }
        setLivePlans(list);
        // Default to the no-card trial when offered, else the popular plan, else the first
        const def = list.find((p) => p.id === TRIAL_PLAN_ID) || list.find((p) => p.popular) || list[0];
        if (def) setSelectedPlan((curr) => curr || def.id);
      })
      .catch(() => {
        if (alive) setLivePlans([]);
      });
    return () => { alive = false; };
  }, [livePlans]);

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
    if (!name.trim() || !password || password.length < 8) return;
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

  // On payment cancel/fail the user still lands on the dashboard. A new org on
  // the trial (signup mode "trial") keeps it; only without a trial do we move
  // to the free plan, when the admin enabled one, so the user has usable access.
  const fallbackToFreeOrTrial = async () => {
    const free = (livePlans || []).find((p) => p.price === 0 || p.price == null);
    if (free && signupMode !== TRIAL_PLAN_ID) {
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
      name: 'Kommently',
      description: `${(livePlans || []).find((p) => p.id === selectedPlan)?.name || ''} subscription`,
      prefill: { name, email },
      theme: { color: '#003dff' },
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

    // Trial: the workspace is already on its trial from signup — no payment now.
    if (selectedPlan === TRIAL_PLAN_ID) {
      await wait(400);
      navigate('/dashboard');
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
      <OnboardingLayout>
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
      </OnboardingLayout>
    );
  }

  const trialLabel = `${trialDays} ${trialDays === 1 ? 'day' : 'days'} free trial`;

  return (
    <OnboardingLayout wide={currentStep === 'payment'}>
      {/* Step indicator */}
      <div className="kc-onb-steps">
        <div className="kc-onb-steps-row">
          <span>Step {step + 1} of {STEPS.length}</span>
          <ol aria-label="Sign-up steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className={cx(i < step && 'done', i === step && 'on')} aria-current={i === step ? 'step' : undefined}>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
        <Progress value={progress} label={`Step ${step + 1} of ${STEPS.length}`} />
      </div>

      {/* ===== STEP 1: ORGANIZATION ===== */}
      {currentStep === 'organization' && (
        <>
          <AuthHeading title="Set up your workspace">This is your team&apos;s shared space for all projects.</AuthHeading>

          <div className="kc-auth-stack">
            {signupMode === TRIAL_PLAN_ID && (
              <Banner tone="info" icon="okc">
                Includes a <strong>{trialLabel}</strong> with full Pro features. No credit card required.
              </Banner>
            )}

            <Field id="onb-org-name" label="Workspace name">
              <Input id="onb-org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Inc." autoFocus required />
            </Field>

            <Field id="onb-org-logo" label={<>Workspace logo <span className="kc-onb-opt">(optional)</span></>}>
              <button type="button" id="onb-org-logo" onClick={() => logoRef.current?.click()} className="kc-onb-upload">
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="kc-onb-upload-thumb" />
                ) : (
                  <span className="kc-onb-upload-thumb"><Icon name="upload" size={20} /></span>
                )}
                <span className="kc-onb-upload-text">
                  <b>{logoFile ? logoFile.name : 'Click to upload'}</b>
                  <small>PNG, JPG or GIF, max 5MB</small>
                </span>
              </button>
              <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }}
                className="hidden" />
            </Field>

            <Button variant="primary" size="lg" block onClick={handleOrgNext} disabled={!orgName.trim()}>
              Continue
            </Button>
          </div>
          <p className="kc-auth-alt">
            Already have an account? <Link to="/login" className="kc-link">Sign in</Link>
          </p>
        </>
      )}

      {/* ===== STEP 2: ACCOUNT ===== */}
      {currentStep === 'account' && (
        <>
          <AuthHeading title="Create your account">Set up your account for {orgName}</AuthHeading>

          <div className="kc-auth-stack">
            {signupMode === TRIAL_PLAN_ID && (
              <Banner tone="info" icon="okc">
                Your workspace starts with a <strong>{trialLabel}</strong>. No card needed to begin.
              </Banner>
            )}

            {emailError && <Banner tone="danger">{emailError}</Banner>}

            <form onSubmit={handleAccountNext} className="kc-auth-stack">
              <Field id="onb-name" label="Full name">
                <Input id="onb-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
                  placeholder="John Doe" />
              </Field>

              <Field id="onb-email" label="Work email" error={emailError && !emailVerified ? emailError : undefined}>
                <div className="kc-onb-inline">
                  <Input id="onb-email" type="email" autoComplete="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} required
                    disabled={emailVerified}
                    aria-invalid={emailError && !emailVerified ? 'true' : undefined}
                    className={emailVerified ? 'kc-onb-locked' : undefined}
                    placeholder="you@company.com" />
                  {emailVerified ? (
                    <span className="kc-onb-verified"><Icon name="check" size={14} stroke={2.2} />Verified</span>
                  ) : (
                    <Button variant="secondary" size="lg" onClick={handleSendOtp}
                      disabled={!email.trim() || emailValidating || otpSending || resendCooldown > 0}>
                      {otpSending || emailValidating
                        ? 'Sending…'
                        : resendCooldown > 0
                          ? `Resend ${resendCooldown}s`
                          : otpSent ? 'Resend' : 'Verify'}
                    </Button>
                  )}
                </div>
                {otpSent && !emailVerified && (
                  <div className="kc-onb-otp">
                    <p>We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.</p>
                    <div className="kc-onb-inline">
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-label="6-digit code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                        placeholder="000000"
                        aria-invalid={otpError ? 'true' : undefined}
                        className="kc-onb-code"
                      />
                      <Button variant="secondary" size="lg" onClick={handleVerifyOtp}
                        disabled={otp.length !== 6 || otpVerifying}>
                        {otpVerifying ? 'Verifying…' : 'Confirm'}
                      </Button>
                    </div>
                    {otpError && <div className="kc-onb-err" role="alert"><Icon name="warn" size={14} />{otpError}</div>}
                  </div>
                )}
              </Field>

              {emailVerified && (
                <>
                  <Field id="onb-password" label="Password" hint="At least 8 characters.">
                    <PasswordInput id="onb-password" wrapperClassName="kc-pass" className="kc-input" autoComplete="new-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                      required minLength={8}
                      placeholder="Min 8 characters" />
                  </Field>
                  <Field id="onb-password-confirm" label="Confirm password" error={passwordError || undefined}>
                    <PasswordInput id="onb-password-confirm" wrapperClassName="kc-pass" className="kc-input" autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                      required minLength={8}
                      aria-invalid={passwordError ? 'true' : undefined}
                      placeholder="Re-enter password" />
                  </Field>
                </>
              )}

              {/* Avatar upload */}
              <Field id="onb-avatar" label={<>Profile photo <span className="kc-onb-opt">(optional)</span></>}>
                <div className="kc-onb-avatar-row">
                  <button type="button" id="onb-avatar" onClick={() => avatarRef.current?.click()} className="kc-onb-avatar" aria-label={avatarPreview ? 'Change photo' : 'Upload photo'}>
                    {avatarPreview ? <img src={avatarPreview} alt="" /> : <Icon name="user" size={20} />}
                  </button>
                  <button type="button" onClick={() => avatarRef.current?.click()} className="kc-link">
                    {avatarPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }}
                    className="hidden" />
                </div>
              </Field>

              <div className="kc-onb-actions">
                <Button variant="secondary" size="lg" onClick={handleBack}>Back</Button>
                <Button type="submit" variant="primary" size="lg" className="grow"
                  disabled={!emailVerified || !name.trim() || password.length < 8 || password !== confirmPassword}
                  title={!emailVerified ? 'Verify your email to continue' : undefined}>
                  Continue
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ===== STEP 3: PLAN ===== */}
      {currentStep === 'payment' && (
        <>
          <AuthHeading title="Choose your plan">Start free without a card, or subscribe now.</AuthHeading>

          <div className="kc-auth-stack">
            <div className="kc-onb-plans" role="radiogroup" aria-label="Plans">
              {livePlans === null ? (
                <>
                  {[1, 2].map((i) => (
                    <div key={i} className="kc-onb-skel animate-pulse" />
                  ))}
                </>
              ) : livePlans.length === 0 ? (
                <p className="kc-onb-empty">
                  No plans are available right now. Please contact support.
                </p>
              ) : (
                livePlans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={cx('kc-onb-plan', isSelected && 'on')}
                    >
                      <div className="kc-onb-plan-top">
                        <span className="kc-onb-radio" aria-hidden="true" />
                        <b>{plan.name}</b>
                        {plan.popular && <Badge tone="review">Most popular</Badge>}
                        <span className="kc-onb-price">
                          {plan.priceLabel}
                          {plan.period && <small>{plan.period}</small>}
                        </span>
                      </div>
                      {plan.features.length > 0 && (
                        <ul className="kc-onb-feats">
                          {plan.features.map((f, i) => (
                            <li key={i}><Icon name="check" size={13} stroke={2} />{f}</li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {error && <Banner tone="danger">{error}</Banner>}

            <div className="kc-onb-actions">
              <Button variant="secondary" size="lg" onClick={handleBack}>Back</Button>
              <Button variant="primary" size="lg" className="grow" onClick={handleFinish} disabled={loading || livePlans === null || !selectedPlan}>
                {loading
                  ? 'Setting up your workspace...'
                  : (() => {
                      if (selectedPlan === TRIAL_PLAN_ID) return `Start ${trialDays}-day free trial`;
                      const p = (livePlans || []).find((x) => x.id === selectedPlan);
                      const isFree = p && (p.price === 0 || p.price == null);
                      return isFree ? 'Start with Free' : 'Continue to payment';
                    })()}
              </Button>
            </div>

            <p className="kc-onb-note">
              {(() => {
                if (selectedPlan === TRIAL_PLAN_ID) {
                  return `No credit card required. We'll email you before your ${trialDays}-day trial ends so you can pick a plan in Settings → Billing.`;
                }
                const p = (livePlans || []).find((x) => x.id === selectedPlan);
                const isFree = p && (p.price === 0 || p.price == null);
                return isFree
                  ? 'No credit card required. You can upgrade any time from Settings → Billing.'
                  : "You'll be redirected to a secure payment gateway after we set up your workspace.";
              })()}
            </p>
          </div>
        </>
      )}
    </OnboardingLayout>
  );
}

// ──────────────────────────────────────────────────────────────────
// Layout: the sign-in screens' structure (components/layout/AuthLayout),
// with an optional wider form column for the plan step.
// ──────────────────────────────────────────────────────────────────

function OnboardingLayout({ wide = false, children }) {
  const year = new Date().getFullYear();
  return (
    <div className="kc kc-auth">
      <aside className="kc-auth-art">
        <a href="/" className="kc-auth-logo" aria-label="Kommently home"><Logo size={28} wordmark onDark /></a>
        <div className="kc-auth-art-in" aria-hidden="true">
          <CoverArt className="kc-auth-cover" />
          <p className="kc-auth-promise">Point at the page. Say what to change.</p>
          <p className="kc-auth-sub">Pins on live websites and PDFs, a thread on each one, and a clear status for every project.</p>
        </div>
        <p className="kc-auth-foot">&copy; {year} Kommently</p>
      </aside>
      <main className="kc-auth-form">
        <a href="/" className="kc-auth-logo kc-auth-logo-sm" aria-label="Kommently home"><Logo size={28} wordmark /></a>
        <div className={cx('kc-auth-body', wide && 'kc-onb-wide')}>{children}</div>
        <p className="kc-auth-foot kc-auth-foot-sm">&copy; {year} Kommently</p>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Setting-up + Retry views
// ──────────────────────────────────────────────────────────────────

function StageRow({ status, label, sublabel }) {
  if (status === 'skipped') return null;
  return (
    <li className={cx('kc-onb-stage', status)}>
      <span className="kc-onb-stage-ico" aria-hidden="true">
        {status === 'done' ? <Icon name="check" size={14} stroke={2.4} /> : status === 'active' ? <span className="kc-onb-spin animate-spin" /> : null}
      </span>
      <span className="kc-onb-stage-text">
        <b>{label}</b>
        {sublabel && status === 'active' && <small>{sublabel}</small>}
      </span>
    </li>
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
    <div className="animate-fade-in" role="status" aria-live="polite">
      <div className="kc-auth-state">
        <span className="ico info"><Icon name="arrow" size={20} stroke={2} /></span>
        <h1 className="kc-display">Setting up your workspace</h1>
        <p>
          {!paidPlan
            ? 'This will only take a moment.'
            : planName && priceLabel
              ? <>You'll be charged <strong>{priceLabel}{period}</strong> for the {planName} plan after checkout.</>
              : 'This will only take a moment.'}
        </p>
      </div>

      <ol className="kc-onb-stages">
        <StageRow status={stages.account} label={labels.account.label} sublabel={labels.account.sub} />
        <StageRow status={stages.workspace} label={labels.workspace.label} sublabel={labels.workspace.sub} />
        <StageRow status={stages.avatar} label={labels.avatar.label} sublabel={labels.avatar.sub} />
        {paidPlan && <StageRow status={stages.checkout} label={labels.checkout.label} sublabel={labels.checkout.sub} />}
      </ol>

      <Progress value={progress} label="Setup progress" />

      <p className="kc-onb-note kc-onb-note-gap">
        Don't close this window — your secure checkout will open in a moment.
      </p>
    </div>
  );
}

function RetryView({ reason, planName, onRetry, onSkip }) {
  return (
    <div className="animate-fade-in kc-auth-state">
      <span className="ico kc-onb-ico-warn"><Icon name="warn" size={20} stroke={2} /></span>
      <h1 className="kc-display">Payment paused</h1>
      <p>{reason}</p>
      <div className="kc-onb-actions kc-onb-actions-gap">
        <Button variant="secondary" size="lg" onClick={onSkip}>Skip to dashboard</Button>
        <Button variant="primary" size="lg" className="grow" onClick={onRetry}>
          Try {planName ? `${planName} ` : ''}checkout again
        </Button>
      </div>
      <p className="kc-onb-note">
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
      <div className="kc-auth-state">
        <span className="ico info"><Icon name="card" size={20} /></span>
        <h1 className="kc-display">Complete your payment</h1>
        {plan && (
          <p>{plan.priceLabel}{plan.period} for the {plan.name} plan</p>
        )}
      </div>

      <div className="kc-auth-stack kc-onb-pay">
        <div className="kc-onb-paybox">
          <p className="kc-onb-paybox-title">Pay with PayPal</p>
          <div ref={containerRef} />
        </div>

        {error && <Banner tone="danger">{error}</Banner>}

        <Button variant="secondary" size="lg" block onClick={onCancel}>
          Skip payment for now
        </Button>
      </div>
      <p className="kc-onb-note kc-onb-note-gap">
        You can pay any time from Settings → Billing.
      </p>
    </div>
  );
}
