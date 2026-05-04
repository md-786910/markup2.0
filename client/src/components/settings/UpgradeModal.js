import React, { useState, useEffect, useRef } from 'react';
import {
  createCheckoutSessionApi,
  upgradePlanApi,
  verifyPaymentApi,
  getBillingConfigApi,
} from '../../services/billingService';
import { useAuth } from '../../hooks/useAuth';

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

export default function UpgradeModal({ selectedPlan, currentPlanId, currentPlanName, onClose, onUpgradeComplete }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const paypalContainerRef = useRef(null);
  const paypalRenderedRef = useRef(false);

  const currentLabel = currentPlanId === 'trial' ? 'Free Trial' : (currentPlanName || 'Free');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getBillingConfigApi();
        if (!cancelled) setConfig(res.data);
      } catch (err) {
        if (!cancelled) setError('Unable to load payment options. Please try again.');
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeProvider = config?.activeProvider;
  const providerLabel =
    activeProvider === 'razorpay' ? 'Razorpay' :
    activeProvider === 'paypal'   ? 'PayPal'   : null;

  const handleRazorpayUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await createCheckoutSessionApi(selectedPlan.id);
      const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js', 'razorpay-checkout-script');
      if (!isLoaded) {
        setError('Failed to load Razorpay SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }
      const options = {
        key: res.data.key_id,
        order_id: res.data.orderId,
        name: 'Feedbackly',
        description: `Upgrade to ${selectedPlan.name}`,
        handler: async function (response) {
          try {
            const verifyRes = await verifyPaymentApi({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            onUpgradeComplete(verifyRes.data.user);
            window.location.href = '/settings?tab=billing&status=success';
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || 'Payment verification failed. Please contact support.');
            setLoading(false);
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#2563eb' },
        modal: { ondismiss: () => setLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(response.error.description || 'Payment failed. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      if (err.response?.status === 503) {
        setError(err.response.data.message || "We're facing payment issues. Please try again later.");
      } else {
        setError(err.response?.data?.message || 'Failed to start checkout. Please try again.');
      }
      setLoading(false);
    }
  };

  // PayPal flow: render PayPal Buttons. createOrder hits our backend (which calls
  // PayPal createOrder server-side); onApprove forwards orderID to verify-payment
  // which captures server-side. We deliberately do NOT call actions.order.capture()
  // in the browser — capture must happen on the server.
  useEffect(() => {
    if (activeProvider !== 'paypal') return;
    if (!config?.paypal?.clientId) return;
    if (paypalRenderedRef.current) return;

    let cancelled = false;
    (async () => {
      const sdkUrl =
        `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypal.clientId)}` +
        `&currency=USD&intent=capture&components=buttons`;
      const ok = await loadScript(sdkUrl, 'paypal-sdk-script');
      if (cancelled) return;
      if (!ok || !window.paypal || !paypalContainerRef.current) {
        setError('Failed to load PayPal SDK. Please check your internet connection.');
        return;
      }
      paypalRenderedRef.current = true;
      try {
        window.paypal
          .Buttons({
            style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' },
            createOrder: async () => {
              setError('');
              setLoading(true);
              try {
                const res = await createCheckoutSessionApi(selectedPlan.id);
                if (!res.data?.paypalOrderId) throw new Error('No PayPal order id from server.');
                return res.data.paypalOrderId;
              } catch (err) {
                if (err.response?.status === 503) {
                  setError(err.response.data.message);
                } else {
                  setError(err.response?.data?.message || err.message || 'Failed to start checkout.');
                }
                setLoading(false);
                throw err;
              }
            },
            onApprove: async (data) => {
              try {
                const verifyRes = await verifyPaymentApi({ paypalOrderId: data.orderID });
                onUpgradeComplete(verifyRes.data.user);
                window.location.href = '/settings?tab=billing&status=success';
              } catch (verifyErr) {
                setError(verifyErr.response?.data?.message || 'Payment verification failed. Please contact support.');
                setLoading(false);
              }
            },
            onCancel: () => setLoading(false),
            onError: (err) => {
              setError((err && err.message) || 'PayPal checkout failed. Please try again.');
              setLoading(false);
            },
          })
          .render(paypalContainerRef.current);
      } catch (err) {
        setError('Failed to render PayPal Buttons.');
      }
    })();
    return () => { cancelled = true; };
  }, [activeProvider, config?.paypal?.clientId, selectedPlan.id, onUpgradeComplete]);

  const handleConfirmClick = async () => {
    if (activeProvider === 'razorpay') {
      return handleRazorpayUpgrade();
    }
    // PayPal renders its own buttons — clicking the main confirm shouldn't happen
    // because we hide the confirm button when paypal is active.
  };

  const noProvider = !configLoading && !activeProvider;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="flex flex-col items-center pt-8 pb-4 px-8 border-b border-gray-100 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-blue-100">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.438 4.438 0 002.736-2.736m8.244-9.05a4.493 4.493 0 00-4.306 1.757 4.438 4.438 0 002.736-2.736zm-2.485-2.29A11.96 11.96 0 0112 3a11.96 11.96 0 014.242 1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight text-center">Upgrade your Workspace</h3>
          <p className="text-sm text-gray-500 mt-1.5 text-center">You are about to unlock premium features.</p>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between gap-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <div className="flex-1 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Current</p>
              <p className="text-sm font-semibold text-gray-700">{currentLabel}</p>
            </div>
            <div className="flex flex-col items-center justify-center text-blue-400 shrink-0 px-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="flex-1 text-center bg-white shadow-sm border border-blue-100 py-2.5 px-3 rounded-xl transform scale-105 transition-transform">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">New Plan</p>
              <p className="text-sm font-bold text-blue-700">{selectedPlan.name}</p>
            </div>
          </div>

          <div className="text-center py-2">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{selectedPlan.priceLabel}</span>
              {selectedPlan.period && (
                <span className="text-base font-medium text-gray-500">{selectedPlan.period}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">Billed automatically. Cancel anytime.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              What's included
            </p>
            <ul className="space-y-3">
              {(selectedPlan.features || []).map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* PayPal Buttons render here when active */}
          {activeProvider === 'paypal' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 text-center">Pay with PayPal</p>
              <div ref={paypalContainerRef} />
            </div>
          )}

          {/* Secure Payment Notice */}
          {providerLabel && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-xs font-medium text-slate-600">
                Guaranteed safe & secure checkout via {providerLabel}.
              </p>
            </div>
          )}

          {noProvider && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-amber-800">We're facing payment issues.</p>
              <p className="text-xs text-amber-700 mt-1">Please try again later.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-sm text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
          )}
        </div>

        <div className="p-6 pt-0 border-t border-gray-50 bg-gray-50/50 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            {activeProvider === 'paypal' ? 'Close' : 'Cancel'}
          </button>
          {activeProvider === 'razorpay' && (
            <button
              onClick={handleConfirmClick}
              disabled={loading || configLoading}
              className="flex-[2] px-5 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : (
                <>
                  Confirm Upgrade
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
