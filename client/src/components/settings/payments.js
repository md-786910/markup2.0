import React, { useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import { verifyPaymentApi } from '../../services/billingService';
import { Banner, Button } from '../kc';

// Shared by the invoices list, the upgrade dialog and PendingPaymentBanner.

export function loadScript(src, id) {
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

// Invoice amounts are in minor units (paise / cents)
export function formatAmount(amount, currency) {
  const major = (amount || 0) / 100;
  if (currency === 'USD') {
    return '$' + major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '₹' + major.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const RAZORPAY_SDK = 'https://checkout.razorpay.com/v1/checkout.js';
export const paypalSdkUrl = (clientId) =>
  `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;

/**
 * Pay an existing PayPal invoice (its order was created by the server).
 * Capture happens on the server through verify-payment.
 * onPaid(user) receives the refreshed user from the verify call.
 */
export function PaypalPayModal({ amount, currency, paypalOrderId, clientId, onClose, onPaid }) {
  const containerRef = useRef(null);
  const renderedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId) {
      setError('PayPal is not configured.');
      return undefined;
    }
    if (renderedRef.current) return undefined;
    let cancelled = false;
    (async () => {
      const ok = await loadScript(paypalSdkUrl(clientId), 'paypal-sdk-script');
      if (cancelled) return;
      if (!ok || !window.paypal || !containerRef.current) {
        setError('Could not load PayPal. Check your connection.');
        return;
      }
      renderedRef.current = true;
      try {
        window.paypal
          .Buttons({
            style: { layout: 'vertical', color: 'blue', shape: 'rect' },
            createOrder: () => paypalOrderId,
            onApprove: async (data) => {
              try {
                const res = await verifyPaymentApi({ paypalOrderId: data.orderID });
                onPaid(res.data?.user);
              } catch (err) {
                setError(err.response?.data?.message || 'Payment verification failed.');
              }
            },
            onError: (err) => setError((err && err.message) || 'PayPal checkout failed.'),
          })
          .render(containerRef.current);
      } catch (err) {
        setError('Could not show the PayPal buttons.');
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, paypalOrderId, onPaid]);

  return (
    <Modal isOpen onClose={onClose} title="Pay with PayPal" size="sm">
      <div className="flex flex-col gap-4">
        <p className="m-0 text-ui text-gray-600">Amount <span className="font-semibold text-gray-900 tabular-nums">{formatAmount(amount, currency)}</span></p>
        <div ref={containerRef} />
        {error && <Banner tone="danger">{error}</Banner>}
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
