import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { verifyPaymentApi } from '../../services/billingService';

function formatAmount(amount, currency) {
  const major = (amount || 0) / 100;
  if (currency === 'USD') {
    return '$' + major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '₹' + major.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function PaypalQuickPay({ inv, onClose, onPaid }) {
  const containerRef = useRef(null);
  const renderedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inv?.paypalClientId) {
      setError('PayPal is not configured.');
      return;
    }
    if (renderedRef.current) return;
    let cancelled = false;
    (async () => {
      const sdkUrl =
        `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(inv.paypalClientId)}` +
        `&currency=USD&intent=capture&components=buttons`;
      const ok = await loadScript(sdkUrl, 'paypal-sdk-script');
      if (cancelled || !ok || !window.paypal || !containerRef.current) {
        if (!ok) setError('Failed to load PayPal SDK.');
        return;
      }
      renderedRef.current = true;
      window.paypal
        .Buttons({
          style: { layout: 'vertical', color: 'blue', shape: 'rect' },
          createOrder: () => inv.paypalOrderId,
          onApprove: async (data) => {
            try {
              const verifyRes = await verifyPaymentApi({ paypalOrderId: data.orderID });
              onPaid(verifyRes.data.user);
            } catch (err) {
              setError(err.response?.data?.message || 'Payment verification failed.');
            }
          },
          onError: (err) => setError((err && err.message) || 'PayPal checkout failed.'),
        })
        .render(containerRef.current);
    })();
    return () => { cancelled = true; };
  }, [inv, onPaid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
        <div className="px-6 pt-6 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Pay invoice via PayPal</h3>
          <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-700">
            Amount: <span className="font-bold text-gray-900">{formatAmount(inv.amount, inv.currency)}</span>
          </div>
          <div ref={containerRef} />
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PendingPaymentBanner() {
  const { user, updateUser } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paypalOpen, setPaypalOpen] = useState(false);

  const inv = user?.orgPendingInvoice;
  if (!inv) return null;

  const days = inv.daysUntilDue ?? null;
  const overdueLikely = typeof days === 'number' && days <= 2;

  const handleRazorpayPay = async () => {
    if (!inv.razorpayOrderId || !inv.razorpayKeyId) {
      setError('This invoice cannot be paid here — open Settings → Invoices.');
      return;
    }
    setError('');
    setPaying(true);

    const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js', 'razorpay-checkout-script');
    if (!ok) {
      setPaying(false);
      setError('Failed to load the payment SDK. Check your connection.');
      return;
    }

    const rzp = new window.Razorpay({
      key: inv.razorpayKeyId,
      amount: inv.amount,
      currency: inv.currency || 'INR',
      order_id: inv.razorpayOrderId,
      name: 'Feedbackly',
      description: `${(inv.plan || '').charAt(0).toUpperCase() + (inv.plan || '').slice(1)} plan invoice`,
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#176b57' },
      handler: async (resp) => {
        try {
          const verifyRes = await verifyPaymentApi({
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_signature: resp.razorpay_signature,
          });
          updateUser(verifyRes.data.user);
        } catch (err) {
          setError(err.response?.data?.message || 'Payment verification failed.');
        } finally {
          setPaying(false);
        }
      },
      modal: { ondismiss: () => setPaying(false) },
    });
    rzp.on('payment.failed', (resp) => {
      setError(resp.error?.description || 'Payment failed. Please try again.');
      setPaying(false);
    });
    rzp.open();
  };

  const handlePayNow = () => {
    setError('');
    if (inv.provider === 'paypal') {
      if (!inv.paypalOrderId || !inv.paypalClientId) {
        setError('This invoice cannot be paid here — open Settings → Invoices.');
        return;
      }
      setPaypalOpen(true);
      return;
    }
    handleRazorpayPay();
  };

  return (
    <>
      <div className={`px-4 py-2.5 flex items-center justify-center gap-3 border-b ${
        overdueLikely
          ? 'bg-red-50 border-red-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <svg className={`w-4 h-4 shrink-0 ${overdueLikely ? 'text-red-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className={`text-sm ${overdueLikely ? 'text-red-800' : 'text-amber-800'}`}>
          <span className="font-medium">Unpaid invoice ({formatAmount(inv.amount, inv.currency)}).</span>
          {' '}
          {error
            ? error
            : typeof days === 'number'
              ? days <= 0
                ? 'Due today — pay now to avoid lockout.'
                : `Due in ${days} day${days === 1 ? '' : 's'}. Pay before then to keep your workspace active.`
              : 'Pay to keep your workspace active.'}
        </p>
        <button
          onClick={handlePayNow}
          disabled={paying}
          className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors shrink-0 disabled:opacity-50 ${
            overdueLikely
              ? 'text-red-800 bg-red-100 hover:bg-red-200'
              : 'text-amber-800 bg-amber-100 hover:bg-amber-200'
          }`}
        >
          {paying ? 'Opening…' : 'Pay Now'}
        </button>
      </div>
      {paypalOpen && (
        <PaypalQuickPay
          inv={inv}
          onClose={() => setPaypalOpen(false)}
          onPaid={(updatedUser) => {
            setPaypalOpen(false);
            if (updatedUser) updateUser(updatedUser);
          }}
        />
      )}
    </>
  );
}
