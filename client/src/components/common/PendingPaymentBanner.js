import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { verifyPaymentApi } from '../../services/billingService';

function formatInr(amountInPaise) {
  const rupees = (amountInPaise || 0) / 100;
  return '₹' + rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

export default function PendingPaymentBanner() {
  const { user, updateUser } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const inv = user?.orgPendingInvoice;
  if (!inv) return null;

  const days = inv.daysUntilDue ?? null;
  const overdueLikely = typeof days === 'number' && days <= 2;

  const handlePayNow = async () => {
    if (!inv.razorpayOrderId || !inv.razorpayKeyId) {
      setError('This invoice cannot be paid here — open Settings → Invoices.');
      return;
    }
    setError('');
    setPaying(true);

    const ok = await loadRazorpayScript();
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
      theme: { color: '#2563eb' },
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
      modal: {
        ondismiss: () => setPaying(false),
      },
    });
    rzp.on('payment.failed', (resp) => {
      setError(resp.error?.description || 'Payment failed. Please try again.');
      setPaying(false);
    });
    rzp.open();
  };

  return (
    <div className={`px-4 py-2.5 flex items-center justify-center gap-3 border-b ${
      overdueLikely
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <svg className={`w-4 h-4 shrink-0 ${overdueLikely ? 'text-red-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className={`text-sm ${overdueLikely ? 'text-red-800' : 'text-amber-800'}`}>
        <span className="font-medium">Unpaid invoice ({formatInr(inv.amount)}).</span>
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
  );
}
