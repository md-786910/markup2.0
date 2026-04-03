import React, { useState, useEffect } from 'react';
import { getPlansApi, updatePlanApi, togglePlanApi } from '../services/adminService';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PLAN_COLORS } from '../config/plans';

export default function PricingPage() {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editLimits, setEditLimits] = useState({});
  const [saving, setSaving] = useState(false);

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
    setEditLimits({
      maxProjects: plan.limits.maxProjects,
      maxMembers: plan.limits.maxMembers,
      maxGuests: plan.limits.maxGuests,
    });
    setEditModal(planId);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updatePlanApi(editModal, editLimits);
      setPlans(data.plans);
      setEditModal(null);
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!plans) return <p className="text-gray-500 py-10 text-center">Failed to load plans.</p>;

  const planOrder = ['free', 'starter', 'pro', 'enterprise'];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pricing Management</h1>

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
              </div>

              <button
                onClick={() => handleEdit(key)}
                className="w-full mt-4 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Edit Limits
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title={`Edit ${editModal ? plans[editModal]?.name : ''} Limits`}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Projects</label>
            <input
              type="number"
              value={editLimits.maxProjects || ''}
              onChange={(e) => setEditLimits({ ...editLimits, maxProjects: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
            <input
              type="number"
              value={editLimits.maxMembers || ''}
              onChange={(e) => setEditLimits({ ...editLimits, maxMembers: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests</label>
            <input
              type="number"
              value={editLimits.maxGuests || ''}
              onChange={(e) => setEditLimits({ ...editLimits, maxGuests: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
