import React, { useState, useEffect, useRef } from 'react';
import {
  getInvoicesApi,
  verifyPaymentApi,
  downloadInvoicePdfApi,
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

function formatAmount(invoice) {
  const major = (invoice.amount || 0) / 100;
  if (invoice.currency === 'USD') {
    return '$' + major.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
  return '₹' + major.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function PaypalPayInvoiceModal({ invoice, paypalClientId, onClose, onPaid }) {
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
            Amount: <span className="font-bold text-gray-900">{formatAmount(invoice)}</span>
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

export default function InvoicesTab() {
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
      a.download = `invoice-${invoice._id.slice(-8).toUpperCase()}.pdf`;
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
      console.error('Failed to load invoices:', err);
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
      name: 'Feedbackly',
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
      theme: { color: '#2563eb' },
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-gray-100 rounded-lg mb-6" />
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Billing History</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your invoices and track your payments.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h4 className="text-base font-semibold text-gray-900">No invoices yet</h4>
          <p className="text-sm text-gray-500 mt-1">Upgrade your plan to see your billing history here.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Billing Date</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Plan Detail</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5 uppercase">{inv._id.slice(-8)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${inv.plan === 'pro' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                      <span className="text-sm font-bold text-gray-700 capitalize">{inv.plan} Plan</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-extrabold text-gray-900">{formatAmount(inv)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {inv.provider || 'razorpay'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                      inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      inv.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {inv.status === 'paid' && <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {inv.status === 'pending' && isOwner ? (
                      <button
                        onClick={() => handlePayNow(inv)}
                        disabled={payingInvoiceId === inv._id}
                        className="inline-flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                      >
                        {payingInvoiceId === inv._id ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Wait...
                          </>
                        ) : 'Pay Now'}
                      </button>
                    ) : inv.status === 'pending' ? (
                      <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">Waiting for owner</span>
                    ) : (
                      <button
                        onClick={() => handleDownloadPdf(inv)}
                        disabled={downloadingId === inv._id}
                        className="inline-flex items-center gap-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {downloadingId === inv._id ? (
                          <>
                            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            ...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                            PDF
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
