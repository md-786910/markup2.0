import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, PageHeader, Toggle } from '../components/common/ui';
import { Pill } from '../components/common/StatusBadge';
import { getPaymentSettingsApi, updatePaymentSettingsApi } from '../services/adminService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast, toastError } from '../utils/toast';

const PROVIDERS = [
  {
    id: 'razorpay',
    name: 'Razorpay',
    currency: (rate) => `INR. Plans without an INR price are converted at ₹${rate || '—'} per $1.`,
    description: 'Cards, UPI, netbanking and wallets, for customers in India.',
    requiredEnv: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    currency: () => 'USD.',
    description: 'PayPal balance and cards, for international customers.',
    requiredEnv: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'],
  },
];

export default function PaymentsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftActive, setDraftActive] = useState(null);
  const [draftEnabled, setDraftEnabled] = useState({ razorpay: false, paypal: false });
  const [draftAllowDowngrades, setDraftAllowDowngrades] = useState(false);

  const applySettings = (data) => {
    setSettings(data);
    setDraftActive(data.activeProvider || null);
    setDraftEnabled({ razorpay: !!data.providers?.razorpay?.enabled, paypal: !!data.providers?.paypal?.enabled });
    setDraftAllowDowngrades(!!data.allowDowngrades);
  };

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await getPaymentSettingsApi();
      applySettings(data);
    } catch (err) {
      toastError(err, 'Could not load the payment settings.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Turning off the active provider leaves no provider active
  const setEnabled = (id, on) => {
    setDraftEnabled((prev) => ({ ...prev, [id]: on }));
    if (!on && draftActive === id) setDraftActive(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updatePaymentSettingsApi({
        activeProvider: draftActive,
        providers: { razorpay: { enabled: draftEnabled.razorpay }, paypal: { enabled: draftEnabled.paypal } },
        allowDowngrades: draftAllowDowngrades,
      });
      applySettings(data);
      toast.success('Payment settings saved.');
    } catch (err) {
      toastError(err, 'Could not save the payment settings.');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!settings) {
    return (
      <div className="py-16 text-center">
        <p className="text-body-sm text-gray-500">Could not load the payment settings.</p>
        <Button className="mt-4" onClick={() => { setLoading(true); fetchSettings(); }}>Try again</Button>
      </div>
    );
  }

  const savedActive = settings.activeProvider || null;
  const dirty =
    savedActive !== draftActive ||
    !!settings.providers?.razorpay?.enabled !== draftEnabled.razorpay ||
    !!settings.providers?.paypal?.enabled !== draftEnabled.paypal ||
    !!settings.allowDowngrades !== draftAllowDowngrades;

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader
        title="Payment settings"
        description="Choose which payment provider takes new payments. Renewals of existing subscriptions stay with the provider they started on."
      />

      {draftActive === null && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
          <span className="font-medium">No provider is active.</span> Customers can't start a checkout and see "We're facing payment issues".
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {PROVIDERS.map((meta) => {
          const status = settings.providers?.[meta.id] || { configured: false };
          const active = draftActive === meta.id;
          return (
            <Card key={meta.id} className={active ? 'ring-2 ring-blue-600' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-body font-semibold text-gray-900">{meta.name}</h2>
                  <p className="mt-0.5 text-body-sm text-gray-500">{meta.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {status.configured ? <Pill tone="green" dot>Configured</Pill> : <Pill tone="gray" dot>Not set up</Pill>}
                  {active && <Pill tone="blue">Active</Pill>}
                </div>
              </div>

              <p className="mt-3 text-caption text-gray-500">Currency: {meta.currency(settings.usdInrRate)}</p>

              {!status.configured && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-caption text-gray-600">
                  <p className="mb-1 font-medium text-gray-700">Set these on the server, then restart it:</p>
                  <ul className="space-y-0.5">
                    {meta.requiredEnv.map((e) => <li key={e} className="font-mono">{e}</li>)}
                  </ul>
                </div>
              )}

              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                <Toggle
                  checked={draftEnabled[meta.id]}
                  onChange={(on) => setEnabled(meta.id, on)}
                  label="Enabled"
                  hint={draftEnabled[meta.id] ? undefined : 'Turn it on to make it the active provider.'}
                />
                <label className={`flex items-center gap-2.5 text-body-sm ${!draftEnabled[meta.id] || !status.configured ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
                  <input
                    type="radio"
                    name="activeProvider"
                    checked={active}
                    disabled={!draftEnabled[meta.id] || !status.configured}
                    onChange={() => setDraftActive(meta.id)}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="font-medium">Use for new payments</span>
                </label>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5">
        <label className="flex cursor-pointer items-start gap-2.5 text-body-sm">
          <input
            type="radio"
            name="activeProvider"
            checked={draftActive === null}
            onChange={() => setDraftActive(null)}
            className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
          />
          <span>
            <span className="block font-medium text-gray-900">None: pause all payments</span>
            <span className="block text-caption text-gray-500">Customers see "We're facing payment issues" and can't start a checkout.</span>
          </span>
        </label>
      </Card>

      <Card className="mt-5" title="Billing policy" description="Applies to every organization's billing page.">
        <Toggle
          checked={draftAllowDowngrades}
          onChange={setDraftAllowDowngrades}
          label="Allow plan downgrades"
          hint="On: owners can move to a lower plan in Settings → Billing. Off: the Downgrade button is turned off and the API refuses downgrades."
        />
      </Card>

      <div className="mt-6 flex justify-end gap-2">
        {dirty && <Button variant="ghost" onClick={() => applySettings(settings)} disabled={saving}>Discard changes</Button>}
        <Button variant="primary" onClick={handleSave} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </div>
  );
}
