import React, { useState } from 'react';
import { upgradePlanApi } from '../../services/billingService';

export default function DowngradeModal({ targetPlan, currentPlan, onClose, onDowngradeComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentFeatures = currentPlan?.features || [];
  const targetFeatures = targetPlan?.features || [];
  const losingFeatures = currentFeatures.filter((f) => !targetFeatures.includes(f));

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await upgradePlanApi(targetPlan.id);
      onDowngradeComplete(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to downgrade. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

        <div className="flex flex-col items-center pt-8 pb-4 px-8 border-b border-gray-100 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-amber-100">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight text-center">Downgrade your plan</h3>
          <p className="text-sm text-gray-500 mt-1.5 text-center">Confirm before we move you to a lower tier.</p>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between gap-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <div className="flex-1 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Current</p>
              <p className="text-sm font-semibold text-gray-700">{currentPlan?.name || 'Current plan'}</p>
            </div>
            <div className="flex flex-col items-center justify-center text-amber-400 shrink-0 px-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="flex-1 text-center bg-white shadow-sm border border-amber-100 py-2.5 px-3 rounded-xl transform scale-105 transition-transform">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">New plan</p>
              <p className="text-sm font-bold text-amber-700">{targetPlan?.name}</p>
            </div>
          </div>

          <div className="text-center py-2">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{targetPlan?.priceLabel}</span>
              {targetPlan?.period && (
                <span className="text-base font-medium text-gray-500">{targetPlan.period}</span>
              )}
            </div>
          </div>

          {losingFeatures.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                You will lose access to
              </p>
              <ul className="space-y-2">
                {losingFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 mt-3">
                Existing data is preserved, but new usage will be capped to the {targetPlan?.name} limits.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-sm text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="p-6 pt-0 border-t border-gray-50 bg-gray-50/50 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-5 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            Keep current plan
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-[2] px-5 py-3 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Downgrading…
              </>
            ) : (
              <>Confirm downgrade</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
