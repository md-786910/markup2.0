import React, { useState } from 'react';
import { createCheckoutSessionApi, upgradePlanApi } from '../../services/billingService';
import { PLANS } from '../../config/plans';

export default function UpgradeModal({ selectedPlan, currentPlanId, onClose, onUpgradeComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentLabel = currentPlanId === 'trial' ? 'Free Trial' : (PLANS[currentPlanId]?.name || 'Free');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      // Try Stripe Checkout first
      const res = await createCheckoutSessionApi(selectedPlan.id);
      if (res.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = res.data.url;
        return;
      }
    } catch (err) {
      // If Stripe is not configured, fall back to direct upgrade
      if (err.response?.status === 400 && err.response?.data?.message?.includes('Stripe price not configured')) {
        try {
          const res = await upgradePlanApi(selectedPlan.id);
          onUpgradeComplete(res.data.user);
          onClose();
          return;
        } catch (fallbackErr) {
          setError(fallbackErr.response?.data?.message || 'Failed to upgrade. Please try again.');
          setLoading(false);
          return;
        }
      }
      setError(err.response?.data?.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Upgrade Plan</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Upgrade summary */}
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Current</p>
              <p className="text-sm font-semibold text-gray-700">{currentLabel}</p>
            </div>
            <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex-1 text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">New Plan</p>
              <p className="text-sm font-semibold text-blue-700">{selectedPlan.name}</p>
            </div>
          </div>

          {/* Price */}
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-900">{selectedPlan.priceLabel}</span>
            <span className="text-sm text-gray-400 ml-1">{selectedPlan.period}</span>
          </div>

          {/* Features */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What you get</p>
            <ul className="space-y-2">
              {selectedPlan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Secure payment notice */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-xs text-blue-700">
              Secure payment powered by Stripe. You'll be redirected to a secure checkout page.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Redirecting...' : `Upgrade to ${selectedPlan.name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
