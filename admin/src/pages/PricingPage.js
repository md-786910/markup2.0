import React, { useState, useEffect } from 'react';
import { getPlansApi, updatePlanApi, togglePlanApi } from '../services/adminService';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PLAN_COLORS } from '../config/plans';

const BADGE_COLOR_OPTIONS = ['gray', 'blue', 'purple', 'amber'];

function emptyForm() {
  return {
    name: '',
    price: '',
    priceLabel: '',
    period: '',
    order: 0,
    badgeColor: 'gray',
    popular: false,
    maxProjects: 0,
    maxMembers: 0,
    maxGuests: 0,
    hasIntegrations: false,
    hasActivityLogs: false,
    hasVersionHistory: false,
    features: [],
    razorpayPlanId: '',
  };
}

export default function PricingPage() {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlans = async () => {
    try {
      const { data } = await getPlansApi();
      setPlans(data.plans);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleToggle = async (planId) => {
    try {
      const { data } = await togglePlanApi(planId);
      setPlans(data.plans);
    } catch {}
  };

  const handleEdit = (planId) => {
    const plan = plans[planId];
    setForm({
      name: plan.name || '',
      price: plan.price == null ? '' : String(plan.price),
      priceLabel: plan.priceLabel || '',
      period: plan.period || '',
      order: plan.order ?? 0,
      badgeColor: plan.badgeColor || 'gray',
      popular: !!plan.popular,
      maxProjects: plan.limits?.maxProjects ?? 0,
      maxMembers: plan.limits?.maxMembers ?? 0,
      maxGuests: plan.limits?.maxGuests ?? 0,
      hasIntegrations: !!plan.limits?.hasIntegrations,
      hasActivityLogs: !!plan.limits?.hasActivityLogs,
      hasVersionHistory: !!plan.limits?.hasVersionHistory,
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      razorpayPlanId: plan.razorpayPlanId || '',
    });
    setError('');
    setEditModal(planId);
  };

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updateFeature = (i, value) => {
    setForm((f) => {
      const next = [...f.features];
      next[i] = value;
      return { ...f, features: next };
    });
  };

  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, ''] }));
  const removeFeature = (i) => setForm((f) => ({
    ...f,
    features: f.features.filter((_, idx) => idx !== i),
  }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        price: form.price === '' ? null : Number(form.price),
        priceLabel: form.priceLabel,
        period: form.period,
        order: Number(form.order),
        badgeColor: form.badgeColor,
        popular: !!form.popular,
        maxProjects: Number(form.maxProjects),
        maxMembers: Number(form.maxMembers),
        maxGuests: Number(form.maxGuests),
        hasIntegrations: form.hasIntegrations,
        hasActivityLogs: form.hasActivityLogs,
        hasVersionHistory: form.hasVersionHistory,
        features: form.features.map((f) => f.trim()).filter(Boolean),
        razorpayPlanId: form.razorpayPlanId.trim(),
      };
      const { data } = await updatePlanApi(editModal, payload);
      setPlans(data.plans);
      setEditModal(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save plan.');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!plans) return <p className="text-gray-500 py-10 text-center">Failed to load plans.</p>;

  const planOrder = ['free', 'starter', 'pro', 'enterprise'];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pricing Management</h1>
      <p className="text-sm text-gray-500 mb-6">
        Edits here are reflected immediately on the in-app billing tab and marketing site.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planOrder.map((key) => {
          const plan = plans[key];
          if (!plan) return null;
          return (
            <div key={key} className={`bg-white rounded-xl border border-gray-200 p-5 ${plan.enabled === false ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <Badge label={plan.name} color={PLAN_COLORS[key] || 'gray'} />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.enabled !== false}
                    onChange={() => handleToggle(key)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <p className="text-2xl font-bold text-gray-900">
                {plan.price != null ? `$${plan.price}` : 'Custom'}
                {plan.period && <span className="text-sm font-normal text-gray-500">{plan.period}</span>}
              </p>
              {plan.popular && (
                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Most Popular
                </span>
              )}

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Projects</span>
                  <span className="font-medium text-gray-900">{plan.limits.maxProjects >= 999 ? 'Unlimited' : plan.limits.maxProjects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Members</span>
                  <span className="font-medium text-gray-900">{plan.limits.maxMembers >= 999 ? 'Unlimited' : plan.limits.maxMembers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Guests</span>
                  <span className="font-medium text-gray-900">{plan.limits.maxGuests >= 999 ? 'Unlimited' : plan.limits.maxGuests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Features</span>
                  <span className="font-medium text-gray-900">{plan.features?.length || 0}</span>
                </div>
              </div>

              <button
                onClick={() => handleEdit(key)}
                className="w-full mt-4 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Edit Plan
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Edit ${editModal ? plans[editModal]?.name : ''} Plan`}
        maxWidth="max-w-3xl"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-6">
          
          {/* General Section */}
          <section className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              General Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Plan Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Price (number)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    placeholder="Custom"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Price Label</label>
                <input
                  type="text"
                  value={form.priceLabel}
                  onChange={(e) => updateField('priceLabel', e.target.value)}
                  placeholder="$29 or Custom"
                  maxLength={40}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Period</label>
                <input
                  type="text"
                  value={form.period}
                  onChange={(e) => updateField('period', e.target.value)}
                  placeholder="/month, forever, ..."
                  maxLength={40}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Badge Color</label>
                <select
                  value={form.badgeColor}
                  onChange={(e) => updateField('badgeColor', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {BADGE_COLOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => updateField('order', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div className="flex items-center justify-between col-span-2 pt-1">
                <div>
                  <p className="text-sm font-medium text-gray-900">Most Popular Badge</p>
                  <p className="text-xs text-gray-500">Highlight this plan as the most popular choice.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.popular} onChange={(e) => updateField('popular', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Razorpay Section */}
          <section className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
              Billing (Razorpay)
            </h4>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Razorpay Plan ID</label>
              <input
                type="text"
                value={form.razorpayPlanId}
                onChange={(e) => updateField('razorpayPlanId', e.target.value)}
                placeholder="price_xxxxxxxxxxxxxx"
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <p className="text-[10.5px] text-gray-500 mt-2 leading-relaxed">
                Create a recurring Price in your Razorpay dashboard, then paste the <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-[10px]">price_…</code> ID here. 
                The display price above is just visual — customers are charged whatever this Razorpay Plan dictates. Keep them in sync!
              </p>
            </div>
          </section>
          
          </div> {/* End Left Column */}

          {/* Right Column */}
          <div className="space-y-6">

          {/* Limits Section */}
          <section className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                Usage Limits
              </h4>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Use 999+ for unlimited</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Projects</label>
                <input type="number" value={form.maxProjects} onChange={(e) => updateField('maxProjects', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Members</label>
                <input type="number" value={form.maxMembers} onChange={(e) => updateField('maxMembers', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Guests</label>
                <input type="number" value={form.maxGuests} onChange={(e) => updateField('maxGuests', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
              </div>
            </div>
          </section>

          {/* Features Toggle Section */}
          <section className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Feature Access
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-900">Integrations</p>
                  <p className="text-[11px] text-gray-500">Allow Slack, Discord, and Jira integrations.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.hasIntegrations} onChange={(e) => updateField('hasIntegrations', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-900">Activity Logs</p>
                  <p className="text-[11px] text-gray-500">Access to the project activity timeline.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.hasActivityLogs} onChange={(e) => updateField('hasActivityLogs', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-900">Version History</p>
                  <p className="text-[11px] text-gray-500">Create and view project versions.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.hasVersionHistory} onChange={(e) => updateField('hasVersionHistory', e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Features List Section */}
          <section className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                Marketing Bullet Points
              </h4>
              <button type="button" onClick={addFeature} className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md transition-colors">
                + Add Item
              </button>
            </div>
            
            <div className="space-y-2">
              {form.features.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-2">No features listed. Add some bullet points.</p>
              )}
              {form.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Priority support"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Remove feature"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
          
          </div> {/* End Right Column */}

          {error && (
            <div className="col-span-1 lg:col-span-2">

            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
          <button onClick={() => setEditModal(null)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
