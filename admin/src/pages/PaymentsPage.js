import React, { useEffect, useState } from 'react';
import {
  getPaymentSettingsApi,
  updatePaymentSettingsApi,
} from '../services/adminService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PROVIDER_META = {
  razorpay: {
    name: 'Razorpay',
    currency: 'INR (USD × 84)',
    description: 'Cards, UPI, netbanking, wallets — for Indian customers.',
    requiredEnv: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
    accent: 'from-blue-500 to-indigo-500',
  },
  paypal: {
    name: 'PayPal',
    currency: 'USD',
    description: 'PayPal balance + cards — for international customers.',
    requiredEnv: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'],
    accent: 'from-yellow-400 to-blue-600',
  },
};

export default function PaymentsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [draftActive, setDraftActive] = useState(null);
  const [draftEnabled, setDraftEnabled] = useState({ razorpay: true, paypal: false });
  const [draftAllowDowngrades, setDraftAllowDowngrades] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data } = await getPaymentSettingsApi();
      setSettings(data);
      setDraftActive(data.activeProvider);
      setDraftEnabled({
        razorpay: !!data.providers?.razorpay?.enabled,
        paypal: !!data.providers?.paypal?.enabled,
      });
      setDraftAllowDowngrades(!!data.allowDowngrades);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payment settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await updatePaymentSettingsApi({
        activeProvider: draftActive,
        providers: {
          razorpay: { enabled: draftEnabled.razorpay },
          paypal: { enabled: draftEnabled.paypal },
        },
        allowDowngrades: draftAllowDowngrades,
      });
      setSettings(data);
      setSuccess('Payment settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const dirty =
    settings?.activeProvider !== draftActive ||
    !!settings?.providers?.razorpay?.enabled !== draftEnabled.razorpay ||
    !!settings?.providers?.paypal?.enabled !== draftEnabled.paypal ||
    !!settings?.allowDowngrades !== draftAllowDowngrades;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose which payment provider is active for new orders. If "None" is
          selected, customers see "We're facing payment issues" and cannot
          start checkout.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-lg">
          {success}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {Object.entries(PROVIDER_META).map(([id, meta]) => {
          const status = settings?.providers?.[id] || { configured: false };
          return (
            <div
              key={id}
              className={`relative bg-white border rounded-2xl shadow-sm overflow-hidden ${
                draftActive === id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
              }`}
            >
              <div className={`h-2 w-full bg-gradient-to-r ${meta.accent}`} />
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{meta.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                  </div>
                  {status.configured ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                      Configured
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                      Missing env
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Currency:</span> {meta.currency}
                </div>

                {!status.configured && (
                  <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                    <p className="font-semibold mb-1 text-gray-700">Required env vars:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {meta.requiredEnv.map((e) => <li key={e} className="font-mono">{e}</li>)}
                    </ul>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftEnabled[id]}
                      onChange={(e) =>
                        setDraftEnabled((prev) => ({ ...prev, [id]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Enabled</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="activeProvider"
                      checked={draftActive === id}
                      disabled={!draftEnabled[id] || !status.configured}
                      onChange={() => setDraftActive(id)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-semibold">
                      {draftActive === id ? 'Active for payments' : 'Set as active'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="activeProvider"
            checked={draftActive === null}
            onChange={() => setDraftActive(null)}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700 font-semibold">
            None — disable all payments
          </span>
          <span className="text-xs text-gray-500 ml-2">
            Customers see "We're facing payment issues."
          </span>
        </label>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-gray-900 mb-1">Billing policy</h2>
        <p className="text-xs text-gray-500 mb-4">
          Global rules that apply to every workspace's billing tab.
        </p>

        <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-900">Allow plan downgrades</p>
            <p className="text-xs text-gray-500 leading-snug mt-0.5">
              When enabled, workspace owners can move to a lower-tier plan from
              Settings → Billing. When disabled, the Downgrade button is grayed
              out and the API rejects downgrade requests.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={draftAllowDowngrades}
              onChange={(e) => setDraftAllowDowngrades(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
