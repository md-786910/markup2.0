import React, { useState, useEffect, useRef } from 'react';
import {
  getInvoicesApi,
  verifyPaymentApi,
  downloadInvoicePdfApi,
} from '../../services/billingService';
import { useAuth } from '../../hooks/useAuth';
import { toastError } from '../../utils/toast';
import Modal from '../common/Modal';
import { Badge, Button, Card, EmptyState, FilterMenu, Notice } from '../ui';
import useEscape from '../../hooks/useEscape';

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

function formatAmount(invoice) {
  const major = (invoice.amount || 0) / 100;
  if (invoice.currency === 'USD') {
    return '$' + major.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
  return '₹' + major.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function PaypalPayInvoiceModal({ invoice, paypalClientId, onClose, onPaid }) {
  useEscape(onClose);
  const containerRef = useRef(null);
  const renderedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paypalClientId) {
      setError('PayPal is not configured.');
      return;
    }
    if (renderedRef.current) return;
    let cancelled = false;
    (async () => {
      const sdkUrl =
        `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}` +
        `&currency=USD&intent=capture&components=buttons`;
      const ok = await loadScript(sdkUrl, 'paypal-sdk-script');
      if (cancelled) return;
      if (!ok || !window.paypal || !containerRef.current) {
        setError('Failed to load PayPal SDK.');
        return;
      }
      renderedRef.current = true;
      try {
        window.paypal
          .Buttons({
            style: { layout: 'vertical', color: 'blue', shape: 'rect' },
            createOrder: () => invoice.paypalOrderId,
            onApprove: async (data) => {
              try {
                await verifyPaymentApi({ paypalOrderId: data.orderID });
                onPaid();
              } catch (err) {
                setError(err.response?.data?.message || 'Payment verification failed.');
              }
            },
            onError: (err) => setError((err && err.message) || 'PayPal checkout failed.'),
          })
          .render(containerRef.current);
      } catch (err) {
        setError('Failed to render PayPal Buttons.');
      }
    })();
    return () => { cancelled = true; };
  }, [paypalClientId, invoice, onPaid]);

  return (
    <Modal isOpen onClose={onClose} title="Pay with PayPal" size="sm">
      <div className="space-y-4">
        <p className="text-body-sm text-gray-600">Amount <span className="font-semibold text-gray-900">{formatAmount(invoice)}</span></p>
        <div ref={containerRef} />
        {error && <Notice tone="red">{error}</Notice>}
      </div>
    </Modal>
  );
}

export default function InvoicesTab() {
  const [statusFilter, setStatusFilter] = useState(null);
  const { user, isOwner, updateUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [keyId, setKeyId] = useState('');
  const [paypalClientId, setPaypalClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [paypalInvoice, setPaypalInvoice] = useState(null);

  const handleDownloadPdf = async (invoice) => {
    setDownloadingId(invoice._id);
    try {
      const res = await downloadInvoicePdfApi(invoice._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber || invoice._id.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await getInvoicesApi();
      setInvoices(res.data.invoices);
      setKeyId(res.data.key_id);
      setPaypalClientId(res.data.paypalClientId || null);
    } catch (err) {
      toastError(err, 'Could not load invoices.');
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleRazorpayPay = async (invoice) => {
    setPayingInvoiceId(invoice._id);
    setError('');

    const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js', 'razorpay-checkout-script');
    if (!isLoaded) {
      setError('Failed to load Razorpay SDK. Please check your internet connection.');
      setPayingInvoiceId(null);
      return;
    }

    const options = {
      key: keyId,
      amount: invoice.amount,
      currency: invoice.currency,
      order_id: invoice.razorpayOrderId,
      name: 'Kommently',
      description: `Payment for ${invoice.plan} plan`,
      handler: async function (response) {
        try {
          const verifyRes = await verifyPaymentApi({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          updateUser(verifyRes.data.user);
          fetchInvoices();
        } catch (err) {
          setError(err.response?.data?.message || 'Payment verification failed.');
        } finally {
          setPayingInvoiceId(null);
        }
      },
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#003dff' },
      modal: { ondismiss: () => setPayingInvoiceId(null) },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      setError(response.error.description || 'Payment failed. Please try again.');
      setPayingInvoiceId(null);
    });
    rzp.open();
  };

  const handlePayNow = (invoice) => {
    setError('');
    if (invoice.provider === 'paypal') {
      setPaypalInvoice(invoice);
      return;
    }
    handleRazorpayPay(invoice);
  };

  const STATUS_TONE = { paid: 'green', pending: 'amber', refunded: 'gray', void: 'gray', failed: 'red' };
  const STATUS_LABEL = { paid: 'Paid', pending: 'Due', refunded: 'Refunded', void: 'Void', failed: 'Failed' };
  const statusOptions = Object.keys(STATUS_LABEL).filter((st) => invoices.some((inv) => inv.status === st)).map((st) => ({ value: st, label: STATUS_LABEL[st] }));
  const shown = statusFilter ? invoices.filter((inv) => inv.status === statusFilter) : invoices;

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3 animate-pulse">
        <div className="h-5 w-40 bg-gray-100 rounded" />
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <Notice tone="red">{error}</Notice>}

      <Card
        flush
        title="Invoices"
        description="Every invoice for your organization. Download a PDF for your records."
        actions={invoices.length > 0 && statusOptions.length > 1 && (
          <FilterMenu
            label="Status"
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        )}
      >
        {invoices.length === 0 ? (
          <EmptyState
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
            title="No invoices yet"
            description="Invoices appear here once you are on a paid plan."
          />
        ) : (
          <>
          {/* Small screens: one card per invoice */}
          <ul className="md:hidden divide-y divide-gray-100">
            {shown.map((inv) => (
              <li key={inv._id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-gray-900">{new Date(inv.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · <span className="tabular-nums">{formatAmount(inv)}</span></p>
                  <p className="text-caption text-gray-500 mt-0.5 truncate"><span className="font-mono">{inv.invoiceNumber || inv._id.slice(-8).toUpperCase()}</span> · <span className="capitalize">{inv.plan}</span></p>
                  <div className="mt-1.5"><Badge tone={STATUS_TONE[inv.status] || 'gray'} dot>{STATUS_LABEL[inv.status] || inv.status}</Badge></div>
                </div>
                {inv.status === 'pending' && isOwner ? (
                  <Button size="sm" variant="primary" loading={payingInvoiceId === inv._id} onClick={() => handlePayNow(inv)}>Pay now</Button>
                ) : inv.status !== 'pending' && (
                  <Button size="sm" variant="secondary" loading={downloadingId === inv._id} onClick={() => handleDownloadPdf(inv)}>PDF</Button>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-caption font-medium text-gray-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Paid with</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <p className="text-body-sm font-medium text-gray-900">{new Date(inv.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      <p className="text-caption text-gray-500 font-mono mt-0.5">{inv.invoiceNumber || inv._id.slice(-8).toUpperCase()}</p>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-body-sm text-gray-700 capitalize">{inv.plan}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-body-sm font-semibold text-gray-900 tabular-nums">{formatAmount(inv)}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-body-sm text-gray-600">{inv.provider === 'paypal' ? 'PayPal' : 'Razorpay'}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap"><Badge tone={STATUS_TONE[inv.status] || 'gray'} dot>{STATUS_LABEL[inv.status] || inv.status}</Badge></td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      {inv.status === 'pending' && isOwner ? (
                        <Button size="sm" variant="primary" loading={payingInvoiceId === inv._id} onClick={() => handlePayNow(inv)}>Pay now</Button>
                      ) : inv.status === 'pending' ? (
                        <span className="text-caption text-gray-500">The owner can pay it</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={downloadingId === inv._id}
                          icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>}
                          onClick={() => handleDownloadPdf(inv)}
                        >
                          PDF
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      {paypalInvoice && (
        <PaypalPayInvoiceModal
          invoice={paypalInvoice}
          paypalClientId={paypalClientId}
          onClose={() => setPaypalInvoice(null)}
          onPaid={() => {
            setPaypalInvoice(null);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
