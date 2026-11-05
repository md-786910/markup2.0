import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { verifyPaymentApi } from '../../services/billingService';
import { Banner, Button } from '../kc';
import { loadScript, formatAmount, PaypalPayModal, RAZORPAY_SDK } from '../settings/payments';

// Top of the content area while the organization has an unpaid renewal
// invoice (user.orgPendingInvoice): pay it here with Razorpay or PayPal.
export default function PendingPaymentBanner() {
  const { user, updateUser } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paypalOpen, setPaypalOpen] = useState(false);

  const onPaypalPaid = useCallback((updatedUser) => {
    setPaypalOpen(false);
    if (updatedUser) updateUser(updatedUser);
  }, [updateUser]);

  const inv = user?.orgPendingInvoice;
  if (!inv) return null;

  const days = inv.daysUntilDue ?? null;
  const urgent = typeof days === 'number' && days <= 2;
  const cantPayHere = 'This invoice can\'t be paid here. Open Plan and billing to pay it.';

  const payWithRazorpay = async () => {
    if (!inv.razorpayOrderId || !inv.razorpayKeyId) {
      setError(cantPayHere);
      return;
    }
    setError('');
    setPaying(true);
    const ok = await loadScript(RAZORPAY_SDK, 'razorpay-checkout-script');
    if (!ok) {
      setPaying(false);
      setError('Could not load the payment window. Check your connection.');
      return;
    }
    const rzp = new window.Razorpay({
      key: inv.razorpayKeyId,
      amount: inv.amount,
      currency: inv.currency || 'INR',
      order_id: inv.razorpayOrderId,
      name: 'Kommently',
      description: `${(inv.plan || '').charAt(0).toUpperCase() + (inv.plan || '').slice(1)} plan invoice`,
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#003dff' },
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
      setError(resp.error?.description || 'Payment failed. Try again.');
      setPaying(false);
    });
    rzp.open();
  };

  const payNow = () => {
    setError('');
    if (inv.provider === 'paypal') {
      if (!inv.paypalOrderId || !inv.paypalClientId) {
        setError(cantPayHere);
        return;
      }
      setPaypalOpen(true);
      return;
    }
    payWithRazorpay();
  };

  const message = error
    || (typeof days === 'number'
      ? days <= 0
        ? 'Due today. Pay it now to keep your organization unlocked.'
        : `Due in ${days} day${days === 1 ? '' : 's'}. Pay before then to keep your organization active.`
      : 'Pay it to keep your organization active.');

  return (
    <div style={{ marginBottom: 16 }}>
      <Banner
        tone={urgent ? 'danger' : 'warning'}
        title={`Unpaid invoice of ${formatAmount(inv.amount, inv.currency)}`}
        action={error === cantPayHere
          ? <Link to="/settings?tab=billing" className="kc-btn sec">Open plan and billing</Link>
          : <Button loading={paying} onClick={payNow}>Pay invoice</Button>}
      >
        {message}
      </Banner>
      {paypalOpen && (
        <PaypalPayModal
          amount={inv.amount}
          currency={inv.currency}
          paypalOrderId={inv.paypalOrderId}
          clientId={inv.paypalClientId}
          onClose={() => setPaypalOpen(false)}
          onPaid={onPaypalPaid}
        />
      )}
    </div>
  );
}
