import React, { useCallback, useEffect, useState } from 'react';
import { getInvoicesApi, verifyPaymentApi, downloadInvoicePdfApi } from '../../services/billingService';
import { useAuth } from '../../hooks/useAuth';
import { toastError } from '../../utils/toast';
import { Badge, Banner, Button, DataTable, EmptyState, PillMenu, Section } from '../kc';
import { Muted } from './SettingsLayout';
import { loadScript, formatAmount, PaypalPayModal, RAZORPAY_SDK } from './payments';

const STATUS_TONE = { paid: 'approved', pending: 'changes', refunded: 'neutral', void: 'neutral', failed: 'danger' };
const STATUS_LABEL = { paid: 'Paid', pending: 'Due', refunded: 'Refunded', void: 'Void', failed: 'Failed' };

const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const invoiceRef = (inv) => inv.invoiceNumber || inv._id.slice(-8).toUpperCase();

// The "Invoices" section of Plan and billing: every invoice of the organization,
// pay a due one (Razorpay or PayPal, owner only) or download a PDF.
export default function InvoicesTab({ onPaid }) {
  const { user, isOwner, updateUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [keyId, setKeyId] = useState('');
  const [paypalClientId, setPaypalClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [paypalInvoice, setPaypalInvoice] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await getInvoicesApi();
      setInvoices(res.data.invoices || []);
      setKeyId(res.data.key_id);
      setPaypalClientId(res.data.paypalClientId || null);
    } catch (err) {
      toastError(err, 'Could not load invoices.');
      setError('Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const afterPayment = useCallback((paidUser) => {
    if (paidUser) updateUser(paidUser);
    fetchInvoices();
    onPaid?.();
  }, [updateUser, fetchInvoices, onPaid]);

  const downloadPdf = async (invoice) => {
    setDownloadingId(invoice._id);
    try {
      const res = await downloadInvoicePdfApi(invoice._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceRef(invoice)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Could not download the invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const payWithRazorpay = async (invoice) => {
    setPayingId(invoice._id);
    setError('');
    const ok = await loadScript(RAZORPAY_SDK, 'razorpay-checkout-script');
    if (!ok) {
      setError('Could not load Razorpay. Check your internet connection.');
      setPayingId(null);
      return;
    }
    const rzp = new window.Razorpay({
      key: keyId,
      amount: invoice.amount,
      currency: invoice.currency,
      order_id: invoice.razorpayOrderId,
      name: 'Kommently',
      description: `Payment for ${invoice.plan} plan`,
      handler: async (response) => {
        try {
          const verifyRes = await verifyPaymentApi({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          afterPayment(verifyRes.data.user);
        } catch (err) {
          setError(err.response?.data?.message || 'Payment verification failed.');
        } finally {
          setPayingId(null);
        }
      },
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#003dff' },
      modal: { ondismiss: () => setPayingId(null) },
    });
    rzp.on('payment.failed', (response) => {
      setError(response.error?.description || 'Payment failed. Try again.');
      setPayingId(null);
    });
    rzp.open();
  };

  const payNow = (invoice) => {
    setError('');
    if (invoice.provider === 'paypal') {
      setPaypalInvoice(invoice);
      return;
    }
    payWithRazorpay(invoice);
  };

  const onPaypalPaid = useCallback((paidUser) => {
    setPaypalInvoice(null);
    afterPayment(paidUser);
  }, [afterPayment]);

  const statusOptions = Object.keys(STATUS_LABEL)
    .filter((st) => invoices.some((inv) => inv.status === st))
    .map((st) => ({ value: st, label: STATUS_LABEL[st] }));
  const shown = statusFilter ? invoices.filter((inv) => inv.status === statusFilter) : invoices;

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (inv) => (
        <div>
          <div className="font-medium text-gray-900">{formatDate(inv.createdAt)}</div>
          <div className="text-caption text-gray-500 font-mono">{invoiceRef(inv)}</div>
        </div>
      ),
    },
    { key: 'plan', label: 'Plan', render: (inv) => <span className="capitalize">{inv.plan}</span> },
    { key: 'amount', label: 'Amount', render: (inv) => <span className="font-medium tabular-nums">{formatAmount(inv.amount, inv.currency)}</span> },
    { key: 'provider', label: 'Paid with', render: (inv) => (inv.provider === 'paypal' ? 'PayPal' : 'Razorpay') },
    { key: 'status', label: 'Status', render: (inv) => <Badge tone={STATUS_TONE[inv.status] || 'neutral'}>{STATUS_LABEL[inv.status] || inv.status}</Badge> },
    {
      key: 'actions',
      label: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (inv) => {
        if (inv.status === 'pending') {
          return isOwner
            ? <Button size="sm" variant="primary" loading={payingId === inv._id} onClick={() => payNow(inv)}>Pay invoice</Button>
            : <span className="text-caption text-gray-500">The owner can pay it</span>;
        }
        return <Button size="sm" loading={downloadingId === inv._id} onClick={() => downloadPdf(inv)}>Download PDF</Button>;
      },
    },
  ];

  return (
    <>
      <Section
        title="Invoices"
        description="Every invoice for your organization. Download a PDF for your records."
        action={invoices.length > 0 && statusOptions.length > 1 ? (
          <PillMenu label="Status" icon="filter" allLabel="All statuses" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        ) : null}
      >
        {error && <Banner tone="danger">{error}</Banner>}
        {loading ? (
          <Muted>Loading invoices…</Muted>
        ) : invoices.length === 0 ? (
          <EmptyState icon="card" title="No invoices yet">Invoices appear here after your first payment.</EmptyState>
        ) : (
          <DataTable label="Invoices" columns={columns} rows={shown} />
        )}
      </Section>

      {paypalInvoice && (
        <PaypalPayModal
          amount={paypalInvoice.amount}
          currency={paypalInvoice.currency}
          paypalOrderId={paypalInvoice.paypalOrderId}
          clientId={paypalClientId}
          onClose={() => setPaypalInvoice(null)}
          onPaid={onPaypalPaid}
        />
      )}
    </>
  );
}
