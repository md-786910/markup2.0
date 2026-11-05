import React, { useState, useEffect, useRef } from 'react';
import {
  createCheckoutSessionApi,
  verifyPaymentApi,
  getBillingConfigApi,
} from '../../services/billingService';
import { useAuth } from '../../hooks/useAuth';
import { track } from '../../monitoring/analytics';
import Modal from '../common/Modal';
import { Banner, Button, Icon } from '../kc';
import { loadScript, paypalSdkUrl, RAZORPAY_SDK } from './payments';

// Checkout for a paid plan: Razorpay (INR) opens its checkout from the
// confirm button; PayPal (USD) renders its own buttons. Both verify on the
// server, then reload Plan and billing with ?status=success.
export default function UpgradeModal({ selectedPlan, currentPlanId, currentPlanName, onClose, onUpgradeComplete }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const paypalContainerRef = useRef(null);
  const paypalRenderedRef = useRef(false);

  const currentLabel = currentPlanId === 'trial' ? 'Pro trial' : (currentPlanName || 'Free');

  useEffect(() => {
    track('upgrade_clicked', { plan: selectedPlan?.id || selectedPlan || null, from: currentPlanId || null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getBillingConfigApi();
        if (!cancelled) setConfig(res.data);
      } catch (err) {
        if (!cancelled) setError('Could not load the payment options. Try again.');
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeProvider = config?.activeProvider;
  // Razorpay charges in INR: show the exact amount the customer will pay
  const chargeLabel = activeProvider === 'razorpay' && selectedPlan.priceInr != null
    ? `₹${Number(selectedPlan.priceInr).toLocaleString('en-IN')}`
    : selectedPlan.priceLabel;
  const providerLabel = activeProvider === 'razorpay' ? 'Razorpay' : activeProvider === 'paypal' ? 'PayPal' : null;

  const handleRazorpayUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await createCheckoutSessionApi(selectedPlan.id);
      const isLoaded = await loadScript(RAZORPAY_SDK, 'razorpay-checkout-script');
      if (!isLoaded) {
        setError('Could not load Razorpay. Check your internet connection.');
        setLoading(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: res.data.key_id,
        order_id: res.data.orderId,
        name: 'Kommently',
        description: `Upgrade to ${selectedPlan.name}`,
        handler: async (response) => {
          try {
            const verifyRes = await verifyPaymentApi({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            onUpgradeComplete(verifyRes.data.user);
            window.location.href = '/settings?tab=billing&status=success';
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || 'Payment verification failed. Contact support.');
            setLoading(false);
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#003dff' },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed. Try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      if (err.response?.status === 503) {
        setError(err.response.data.message || 'Payments are unavailable right now. Try again later.');
      } else {
        setError(err.response?.data?.message || 'Could not start the checkout. Try again.');
      }
      setLoading(false);
    }
  };

  // PayPal: createOrder hits our backend (which creates the PayPal order);
  // onApprove forwards the orderID to verify-payment, which captures it on the
  // server. We never call actions.order.capture() in the browser.
  useEffect(() => {
    if (activeProvider !== 'paypal') return undefined;
    if (!config?.paypal?.clientId) return undefined;
    if (paypalRenderedRef.current) return undefined;

    let cancelled = false;
    (async () => {
      const ok = await loadScript(paypalSdkUrl(config.paypal.clientId), 'paypal-sdk-script');
      if (cancelled) return;
      if (!ok || !window.paypal || !paypalContainerRef.current) {
        setError('Could not load PayPal. Check your internet connection.');
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
                if (!res.data?.paypalOrderId) throw new Error('No PayPal order id from the server.');
                return res.data.paypalOrderId;
              } catch (err) {
                if (err.response?.status === 503) {
                  setError(err.response.data.message);
                } else {
                  setError(err.response?.data?.message || err.message || 'Could not start the checkout.');
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
                setError(verifyErr.response?.data?.message || 'Payment verification failed. Contact support.');
                setLoading(false);
              }
            },
            onCancel: () => setLoading(false),
            onError: (err) => {
              setError((err && err.message) || 'PayPal checkout failed. Try again.');
              setLoading(false);
            },
          })
          .render(paypalContainerRef.current);
      } catch (err) {
        setError('Could not show the PayPal buttons.');
      }
    })();
    return () => { cancelled = true; };
  }, [activeProvider, config?.paypal?.clientId, selectedPlan.id, onUpgradeComplete]);

  const noProvider = !configLoading && !activeProvider;

  return (
    <Modal isOpen onClose={onClose} title={`Upgrade to ${selectedPlan.name}`} size="md">
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-3 text-ui text-gray-600">
          <span>{currentLabel}</span>
          <Icon name="arrow" size={16} className="text-gray-400" />
          <span className="font-semibold text-gray-900">{selectedPlan.name}</span>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-page-title text-gray-900">{chargeLabel}</span>
            {selectedPlan.period && <span className="text-ui text-gray-500">{selectedPlan.period}</span>}
          </div>
          {chargeLabel !== selectedPlan.priceLabel && (
            <p className="m-0 mt-1 text-caption text-gray-500">Charged in INR ({selectedPlan.priceLabel} list price)</p>
          )}
          <p className="m-0 mt-1 text-caption text-gray-500">Billed monthly. We email an invoice before each renewal. Cancel anytime.</p>
        </div>

        {(selectedPlan.features || []).length > 0 && (
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="m-0 mb-3 text-ui-label text-gray-700">What's included</p>
            <ul className="m-0 p-0 list-none flex flex-col gap-2">
              {selectedPlan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-ui text-gray-600">
                  <Icon name="check" size={14} stroke={2} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeProvider === 'paypal' && <div ref={paypalContainerRef} />}

        {providerLabel && (
          <p className="m-0 flex items-center gap-2 text-caption text-gray-500">
            <Icon name="lock" size={14} />
            Secure checkout with {providerLabel}.
          </p>
        )}

        {noProvider && (
          <Banner tone="warning" title="Payments are unavailable right now">Try again later.</Banner>
        )}
        {error && <Banner tone="danger">{error}</Banner>}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>{activeProvider === 'paypal' ? 'Close' : 'Cancel'}</Button>
        {activeProvider === 'razorpay' && (
          <Button variant="primary" loading={loading} disabled={configLoading} onClick={handleRazorpayUpgrade}>
            Confirm upgrade
          </Button>
        )}
      </div>
    </Modal>
  );
}
