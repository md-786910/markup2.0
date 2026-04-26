import React, { useState, useEffect } from 'react';
import { getInvoicesApi, verifyPaymentApi } from '../../services/billingService';
import { useAuth } from '../../hooks/useAuth';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function InvoicesTab() {
  const { user, isOwner, updateUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [keyId, setKeyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);

  const fetchInvoices = async () => {
    try {
      const res = await getInvoicesApi();
      setInvoices(res.data.invoices);
      setKeyId(res.data.key_id);
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

  const handlePayNow = async (invoice) => {
    setPayingInvoiceId(invoice._id);
    setError('');

    const isLoaded = await loadRazorpayScript();
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
      name: 'Markup MVP',
      description: `Payment for ${invoice.plan} plan`,
      handler: async function (response) {
        try {
          const verifyRes = await verifyPaymentApi({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          });
          updateUser(verifyRes.data.user);
          fetchInvoices(); // Refresh the list
        } catch (err) {
          setError(err.response?.data?.message || 'Payment verification failed.');
        } finally {
          setPayingInvoiceId(null);
        }
      },
      prefill: {
        name: user?.name,
        email: user?.email,
      },
      theme: {
        color: '#2563eb', // blue-600
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: 'Pay via UPI',
              instruments: [
                {
                  method: 'upi',
                  flows: ['collect', 'qr', 'intent']
                }
              ]
            }
          },
          sequence: ['block.upi'],
          preferences: {
            show_default_blocks: true
          }
        }
      },
      modal: {
        ondismiss: function() {
          setPayingInvoiceId(null);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      setError(response.error.description || 'Payment failed. Please try again.');
      setPayingInvoiceId(null);
    });
    
    rzp.open();
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
        <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">INR Payments Enabled</span>
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
                    <span className="text-sm font-extrabold text-gray-900">₹{(inv.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-gray-300 italic text-[11px]">Paid Successfully</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}