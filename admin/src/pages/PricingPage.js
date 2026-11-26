import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Field, PageHeader, Toggle, inputClass } from '../components/common/ui';
import { Pill, PlanBadge } from '../components/common/StatusBadge';
import { getPlansApi, updatePlanApi, togglePlanApi, getPlanUsageImpactApi, getTrialSettingsApi } from '../services/adminService';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import GlobalTrialConfigCard from '../components/pricing/GlobalTrialConfigCard';
import { toast, toastError } from '../utils/toast';
import { confirmDialog } from '../utils/confirm';

const PLAN_ORDER = ['free', 'starter', 'pro', 'enterprise'];
// Plans bought online: they always need a price above 0
const PRICED = ['starter', 'pro'];
const BADGE_COLOR_OPTIONS = [['gray', 'Gray'], ['blue', 'Blue'], ['purple', 'Purple'], ['amber', 'Amber']];
const LIMIT_FIELDS = [
  ['maxProjects', 'Projects'],
  ['maxWorkspaces', 'Workspaces'],
  ['maxMembers', 'Members'],
  ['maxGuests', 'Guests'],
];
const FEATURE_TOGGLES = [
  ['hasIntegrations', 'Integrations', 'Slack, Microsoft Teams, Discord and Jira.'],
  ['hasActivityLogs', 'Activity log', 'The project activity timeline.'],
  ['hasVersionHistory', 'Version history', 'Save and compare review rounds.'],
  ['hasDeadlines', 'Feedback deadlines', 'Close a review on a set date.'],
];
const LIMIT_LABELS = { maxProjects: 'Projects', maxWorkspaces: 'Workspaces', maxMembers: 'Members', maxGuests: 'Guests', maxStorageMB: 'Storage (MB)' };

const unlimited = (n) => n >= 999;
const showCount = (n) => (n == null ? '—' : unlimited(n) ? 'Unlimited' : n);
const showStorage = (mb) => (mb == null ? '—' : mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10} GB` : `${mb} MB`);

function formFromPlan(plan) {
  return {
    name: plan.name || '',
    price: plan.price == null ? '' : String(plan.price),
    // Only an admin-set INR price is filled in; empty keeps following the USD price
    priceInr: plan.priceInrCustom && plan.priceInr != null ? String(plan.priceInr) : '',
    priceLabel: plan.priceLabel || '',
    period: plan.period || '',
    order: plan.order ?? 0,
    badgeColor: plan.badgeColor || 'gray',
    popular: !!plan.popular,
    maxProjects: plan.limits?.maxProjects ?? '',
    maxMembers: plan.limits?.maxMembers ?? '',
    maxGuests: plan.limits?.maxGuests ?? '',
    maxWorkspaces: plan.limits?.maxWorkspaces ?? '',
    maxStorageMB: plan.limits?.maxStorageMB ?? '',
    hasIntegrations: !!plan.limits?.hasIntegrations,
    hasActivityLogs: !!plan.limits?.hasActivityLogs,
    hasVersionHistory: !!plan.limits?.hasVersionHistory,
    hasDeadlines: !!plan.limits?.hasDeadlines,
    support: {
      tickets: plan.support?.tickets !== false,
      chat: !!plan.support?.chat,
      priority: plan.support?.priority || 'normal',
      replyHours: plan.support?.replyHours ?? '',
    },
    // Bullets: generated from the limits (default) or written by hand
    customFeatures: !!plan.featuresCustom,
    features: Array.isArray(plan.features) ? [...plan.features] : [],
    extraFeatures: Array.isArray(plan.extraFeatures) ? [...plan.extraFeatures] : [],
  };
}

// An editable list of bullet points
function BulletList({ items, onChange, placeholder, emptyText }) {
  const set = (i, value) => onChange(items.map((v, idx) => (idx === i ? value : v)));
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-caption text-gray-500">{emptyText}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="text" value={item} onChange={(e) => set(i, e.target.value)} maxLength={200} placeholder={placeholder} className={inputClass} />
          <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remove bullet">Remove</Button>
        </div>
      ))}
      <Button size="sm" onClick={() => onChange([...items, ''])}>Add bullet</Button>
    </div>
  );
}

function EditPlanDialog({ planId, plan, trialDays, onClose, onSaved }) {
  const [form, setForm] = useState(() => formFromPlan(plan));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [impact, setImpact] = useState(null);
  const priced = PRICED.includes(planId);
  const isFree = planId === 'free';

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateSupport = (key, value) => setForm((f) => ({ ...f, support: { ...f.support, [key]: value } }));

  // The bullets generated now (without the extra ones, shown separately)
  const generated = (plan.featuresCustom ? [] : plan.features || []).filter((f) => !(plan.extraFeatures || []).includes(f));

  const validate = () => {
    if (priced && !(Number(form.price) > 0)) return `${plan.name} needs a monthly price above 0.`;
    if (form.priceInr !== '' && !(Number(form.priceInr) > 0)) return 'The INR price must be above 0, or empty to follow the USD price.';
    for (const [key, label] of [...LIMIT_FIELDS, ['maxStorageMB', 'Storage']]) {
      const v = form[key];
      if (v !== '' && !(Number.isInteger(Number(v)) && Number(v) >= 0)) return `${label} must be a whole number.`;
    }
    const hours = form.support.replyHours;
    if (hours !== '' && !(Number.isInteger(Number(hours)) && Number(hours) >= 1 && Number(hours) <= 720)) return 'The reply target must be 1 to 720 hours.';
    return '';
  };

  const save = async (confirmed = false) => {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    // An empty field keeps the current limit (Number('') would save 0)
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const limits = {
      maxProjects: num(form.maxProjects),
      maxMembers: num(form.maxMembers),
      maxGuests: num(form.maxGuests),
      maxWorkspaces: num(form.maxWorkspaces),
      maxStorageMB: num(form.maxStorageMB),
      hasIntegrations: form.hasIntegrations,
      hasActivityLogs: form.hasActivityLogs,
      hasVersionHistory: form.hasVersionHistory,
      hasDeadlines: form.hasDeadlines,
    };

    // Warn when lower limits would put customers over them
    if (!confirmed) {
      try {
        const { data } = await getPlanUsageImpactApi(planId, Object.fromEntries(Object.entries(limits).filter(([k, v]) => k.startsWith('max') && v != null)));
        if (data?.hasImpact) {
          setImpact(data);
          setSaving(false);
          return;
        }
      } catch {
        // The check is advisory: save anyway
      }
    }

    const clean = (list) => list.map((f) => f.trim()).filter(Boolean);
    const payload = {
      name: form.name.trim() || plan.name,
      priceInr: isFree ? undefined : num(form.priceInr),
      period: form.period,
      order: Number(form.order) || 0,
      badgeColor: form.badgeColor,
      popular: form.popular,
      ...limits,
      support: { ...form.support, replyHours: num(form.support.replyHours) },
      extraFeatures: clean(form.extraFeatures),
      // Generated bullets follow the limits; hand-written ones are kept as they are
      ...(form.customFeatures ? { features: clean(form.features) } : { features: null, deriveFeatures: true }),
    };
    if (!isFree) payload.price = num(form.price);
    if (!priced) payload.priceLabel = form.priceLabel;
    try {
      const { data } = await updatePlanApi(planId, payload);
      toast.success(`${payload.name} saved. The website and the billing page show the change now.`);
      onSaved(data.plans);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save the plan.');
      setImpact(null);
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit ${plan.name}`} maxWidth="max-w-3xl">
      <div className="-mr-2 grid max-h-[70vh] items-start gap-6 overflow-y-auto pr-2 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-body-sm font-semibold text-gray-900">Name and price</h3>
            <Field label="Plan name">
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} maxLength={60} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (USD)" hint={isFree ? 'Free is always $0.' : priced ? 'Above 0. Charged through PayPal.' : 'Empty shows the label instead.'}>
                <input
                  type="number"
                  min={priced ? '0.01' : '0'}
                  step="any"
                  value={isFree ? '0' : form.price}
                  disabled={isFree}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder={priced ? 'e.g. 29' : 'Custom'}
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
                />
              </Field>
              <Field label="Price (INR)" hint={isFree ? 'Free is always ₹0.' : 'Charged through Razorpay. Empty follows the USD price.'}>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={isFree ? '0' : form.priceInr}
                  disabled={isFree}
                  onChange={(e) => update('priceInr', e.target.value)}
                  placeholder={plan.priceInr != null && !plan.priceInrCustom ? `Auto (₹${plan.priceInr})` : 'Auto from USD'}
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
                />
              </Field>
              <Field label="Price label" hint={priced ? 'Follows the USD price.' : 'e.g. $0 or Custom'}>
                <input
                  type="text"
                  value={priced ? (form.price === '' ? '' : `$${form.price}`) : form.priceLabel}
                  disabled={priced}
                  onChange={(e) => update('priceLabel', e.target.value)}
                  maxLength={40}
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
                />
              </Field>
              <Field label="Period" hint="e.g. /month or forever">
                <input type="text" value={form.period} onChange={(e) => update('period', e.target.value)} maxLength={40} className={inputClass} />
              </Field>
              <Field label="Badge color">
                <select value={form.badgeColor} onChange={(e) => update('badgeColor', e.target.value)} className={inputClass}>
                  {BADGE_COLOR_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Order" hint="Position on the pricing pages.">
                <input type="number" value={form.order} onChange={(e) => update('order', e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Toggle checked={form.popular} onChange={(v) => update('popular', v)} label="Most popular" hint="Highlights this plan on the pricing pages." />
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-5">
            <div>
              <h3 className="text-body-sm font-semibold text-gray-900">Pricing page bullets</h3>
              <p className="mt-0.5 text-caption text-gray-500">
                {form.customFeatures
                  ? 'Written by hand: they don\'t change when the limits do.'
                  : 'Generated from the limits and support on the right, so they always match what the plan gives.'}
              </p>
            </div>
            {form.customFeatures ? (
              <>
                <BulletList items={form.features} onChange={(v) => update('features', v)} placeholder="e.g. Priority support" emptyText="No bullets yet." />
                <Button size="sm" variant="ghost" onClick={() => update('customFeatures', false)}>Generate them from the limits instead</Button>
              </>
            ) : (
              <>
                {generated.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-body-sm text-gray-700">
                    {generated.map((f) => <li key={f}>✓ {f}</li>)}
                    <li className="pt-1 text-caption text-gray-500">Updated from your changes when you save.</li>
                  </ul>
                )}
                <p className="pt-1 text-label text-gray-700">Extra bullets</p>
                <BulletList items={form.extraFeatures} onChange={(v) => update('extraFeatures', v)} placeholder="e.g. Onboarding call" emptyText="Added after the generated bullets." />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm((f) => ({ ...f, customFeatures: true, features: f.features.length ? f.features : [...generated, ...f.extraFeatures] }))}
                >
                  Write all bullets by hand
                </Button>
              </>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-body-sm font-semibold text-gray-900">Limits</h3>
              <p className="mt-0.5 text-caption text-gray-500">999 or more means unlimited (not for storage).{planId === 'pro' ? ` Trials (${trialDays} days) get the Pro limits too.` : ''}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {LIMIT_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <input type="number" min="0" value={form[key]} onChange={(e) => update(key, e.target.value)} className={inputClass} />
                </Field>
              ))}
              <Field label="Storage (MB)" hint={form.maxStorageMB !== '' ? showStorage(Number(form.maxStorageMB)) : undefined}>
                <input type="number" min="0" value={form.maxStorageMB} onChange={(e) => update('maxStorageMB', e.target.value)} className={inputClass} />
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-5">
            <h3 className="text-body-sm font-semibold text-gray-900">Features</h3>
            {FEATURE_TOGGLES.map(([key, label, hint]) => (
              <Toggle key={key} checked={form[key]} onChange={(v) => update(key, v)} label={label} hint={hint} />
            ))}
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-5">
            <h3 className="text-body-sm font-semibold text-gray-900">Support</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Priority">
                <select value={form.support.priority} onChange={(e) => updateSupport('priority', e.target.value)} className={inputClass}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Field>
              <Field label="Reply target (hours)" hint="Empty for none.">
                <input type="number" min="1" max="720" value={form.support.replyHours} onChange={(e) => updateSupport('replyHours', e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Toggle checked={form.support.tickets} onChange={(v) => updateSupport('tickets', v)} label="In-app support requests" hint="Help & support panel in the app." />
            <Toggle checked={form.support.chat} onChange={(v) => updateSupport('chat', v)} label="Live chat" />
          </section>
        </div>

        {impact && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-body-sm text-amber-900 lg:col-span-2">
            <p className="font-medium">
              {impact.affectedCount} {impact.affectedCount === 1 ? 'organization is' : 'organizations are'} already over the new limits
            </p>
            <p className="mt-1 text-caption text-amber-800">They keep what they have, but can't add more until they are under the limit again.</p>
            <ul className="mt-3 space-y-1">
              {(impact.details || []).map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-1.5 text-caption">
                  <span className="truncate font-medium text-gray-900">{d.orgName}</span>
                  <span className="shrink-0 text-amber-800">{LIMIT_LABELS[d.limitKey] || d.limitKey}: {d.currentUsage} used, new limit {d.proposedLimit}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" onClick={() => setImpact(null)}>Change the limits</Button>
              <Button size="sm" variant="primary" onClick={() => save(true)} disabled={saving}>Save anyway</Button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-body-sm text-red-700 lg:col-span-2">{error}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => save()} disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</Button>
      </div>
    </Modal>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState(null);
  const [trialSettings, setTrialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);

  const fetchPlans = useCallback(async () => {
    try {
      const [plansRes, trialRes] = await Promise.all([
        getPlansApi(),
        getTrialSettingsApi().catch(() => null),
      ]);
      setPlans(plansRes.data.plans);
      setTrialSettings(trialRes?.data || null);
    } catch (err) {
      toastError(err, 'Could not load the plans.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleToggle = async (planId) => {
    const plan = plans[planId];
    const turningOff = plan.enabled !== false;
    if (turningOff && !(await confirmDialog({
      title: `Turn off ${plan.name}?`,
      message: 'New customers can no longer choose it. Current subscribers keep it and keep renewing.',
      confirmLabel: 'Turn off',
      danger: true,
    }))) return;
    setBusy(planId);
    try {
      const { data } = await togglePlanApi(planId);
      setPlans(data.plans);
      toast.success(`${plan.name} is ${turningOff ? 'off' : 'on'}.`);
    } catch (err) {
      toastError(err, 'Could not change the plan.');
    }
    setBusy(null);
  };

  // Free plan only: when on, new signups skip the trial and start on Free
  const handleAssignToggle = async (next) => {
    setBusy('assign');
    try {
      const { data } = await updatePlanApi('free', { assignToNewSignups: next });
      setPlans(data.plans);
      toast.success(next ? 'New signups now start on Free.' : 'New signups now start with a trial.');
    } catch (err) {
      toastError(err, 'Could not change the signup plan.');
    }
    setBusy(null);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!plans) {
    return (
      <div className="py-16 text-center">
        <p className="text-body-sm text-gray-500">Could not load the plans.</p>
        <Button className="mt-4" onClick={() => { setLoading(true); fetchPlans(); }}>Try again</Button>
      </div>
    );
  }

  const trialDays = trialSettings?.defaultDays;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Plans & pricing" description="Changes apply right away to the in-app billing page and the website's pricing." />

      <GlobalTrialConfigCard trialSettings={trialSettings} onSettingsUpdated={fetchPlans} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((key) => {
          const plan = plans[key];
          if (!plan) return null;
          const off = plan.enabled === false;
          return (
            <Card key={key} className={`flex flex-col ${off ? 'bg-gray-50' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PlanBadge plan={key} />
                  {plan.popular && <Pill tone="blue">Most popular</Pill>}
                  {off && <Pill tone="gray">Off</Pill>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!off}
                  aria-label={`${plan.name} available to new customers`}
                  title={off ? 'Off: new customers can\'t choose it' : 'On: new customers can choose it'}
                  disabled={busy === key}
                  onClick={() => handleToggle(key)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${off ? 'bg-gray-300' : 'bg-blue-600'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${off ? 'translate-x-0.5' : 'translate-x-[18px]'}`} />
                </button>
              </div>

              <p className="mt-4 text-h3 font-semibold text-gray-900">
                {plan.price != null ? `$${plan.price}` : plan.priceLabel || 'Custom'}
                {plan.period && <span className="text-body-sm font-normal text-gray-500"> {plan.period}</span>}
              </p>
              {plan.price > 0 && plan.priceInr != null && (
                <p className="mt-0.5 text-caption text-gray-500">₹{plan.priceInr.toLocaleString('en-IN')} through Razorpay{plan.priceInrCustom ? '' : ' (converted)'}</p>
              )}

              <dl className="mt-4 space-y-2 text-body-sm">
                {[
                  ['Projects', showCount(plan.limits?.maxProjects)],
                  ['Members', showCount(plan.limits?.maxMembers)],
                  ['Guests', showCount(plan.limits?.maxGuests)],
                  ['Storage', showStorage(plan.limits?.maxStorageMB)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>

              {key === 'free' && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <Toggle
                    checked={!!plan.assignToNewSignups}
                    disabled={busy === 'assign'}
                    onChange={handleAssignToggle}
                    label="Start new signups on Free"
                    hint={trialDays ? `Off: new signups get a ${trialDays}-day trial.` : 'Off: new signups get a trial.'}
                  />
                </div>
              )}

              <div className="mt-auto pt-4">
                <Button className="w-full" onClick={() => setEditing(key)}>Edit plan</Button>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && plans[editing] && (
        <EditPlanDialog
          planId={editing}
          plan={plans[editing]}
          trialDays={trialDays || 30}
          onClose={() => setEditing(null)}
          onSaved={(next) => { setPlans(next); setEditing(null); }}
        />
      )}
    </div>
  );
}
