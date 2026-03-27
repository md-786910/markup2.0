import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTrialStatus } from '../../hooks/useTrialStatus';
import { getPlanApi } from '../../services/billingService';
import { PLANS, PLAN_LIST } from '../../config/plans';
import UpgradeModal from './UpgradeModal';

const badgeColors = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-purple-50 text-purple-700',
  amber: 'bg-amber-50 text-amber-700',
};

function UsageBar({ label, used, max }) {
  const percent = max >= 999 ? (used > 0 ? 5 : 0) : Math.min(100, (used / max) * 100);
  const isUnlimited = max >= 999;
  const isNearLimit = !isUnlimited && percent >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-sm font-medium ${isNearLimit ? 'text-amber-600' : 'text-gray-900'}`}>
          {used} / {isUnlimited ? 'Unlimited' : max}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingTab() {
  const { user, isOwner, updateUser } = useAuth();
  const { daysLeft, trialDays, progressPercent, isTrialActive, urgency } = useTrialStatus();

  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeTarget, setUpgradeTarget] = useState(null);

  useEffect(() => {
    getPlanApi()
      .then((res) => setPlanData(res.data))
      .catch((err) => console.error('Failed to load plan:', err))
      .finally(() => setLoading(false));
  }, []);

  const currentPlanId = user?.orgPlan || 'trial';
  const currentOrder = currentPlanId === 'trial' ? -1 : (PLANS[currentPlanId]?.order ?? -1);

  const handleUpgradeComplete = (userData) => {
    updateUser(userData);
    // Refresh plan data
    getPlanApi()
      .then((res) => setPlanData(res.data))
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const usage = planData?.usage || { projects: 0, members: 0, guests: 0 };
  const limits = planData?.limits || user?.orgLimits || { maxProjects: 5, maxMembers: 10, maxGuests: 5 };

  return (
    <div className="space-y-8">
      {/* Current Plan Card */}
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentPlanId === 'trial' ? 'Free Trial' : (PLANS[currentPlanId]?.name || 'Free')}
              </h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                badgeColors[PLANS[currentPlanId]?.badgeColor || 'gray']
              }`}>
                Current Plan
              </span>
            </div>
            {isTrialActive && (
              <p className="text-sm text-gray-500">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining in your {trialDays}-day trial
              </p>
            )}
            {!isTrialActive && currentPlanId === 'trial' && user?.orgLocked && (
              <p className="text-sm text-red-500 font-medium">
                Your trial has expired. Upgrade to continue using all features.
              </p>
            )}
            {currentPlanId !== 'trial' && (
              <p className="text-sm text-gray-500">
                {PLANS[currentPlanId]?.priceLabel}{PLANS[currentPlanId]?.period}
              </p>
            )}
          </div>
        </div>

        {/* Trial progress */}
        {isTrialActive && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">Trial progress</span>
              <span className={`text-xs font-semibold ${
                urgency === 'critical' ? 'text-red-500' : urgency === 'warning' ? 'text-amber-500' : 'text-blue-600'
              }`}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  urgency === 'critical' ? 'bg-red-500' : urgency === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Usage stats */}
        <div className="space-y-4">
          <UsageBar label="Projects" used={usage.projects} max={limits.maxProjects} />
          <UsageBar label="Team Members" used={usage.members} max={limits.maxMembers} />
          <UsageBar label="Guests" used={usage.guests} max={limits.maxGuests} />
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_LIST.filter((p) => p.id !== 'enterprise').map((plan) => {
            const isCurrent =
              plan.id === currentPlanId ||
              (currentPlanId === 'trial' && plan.id === 'free');
            const isUpgrade = plan.order > currentOrder;
            const isDowngrade = plan.order <= currentOrder && !isCurrent;

            return (
              <div
                key={plan.id}
                className={`relative border rounded-xl p-5 transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-600 text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{plan.name}</h4>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-gray-900">{plan.priceLabel}</span>
                    {plan.period && (
                      <span className="text-sm text-gray-400">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent && (
                  <button
                    disabled
                    className="w-full py-2.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg cursor-default"
                  >
                    Current Plan
                  </button>
                )}
                {isUpgrade && isOwner && (
                  <button
                    onClick={() => setUpgradeTarget(plan)}
                    className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upgrade to {plan.name}
                  </button>
                )}
                {isUpgrade && !isOwner && (
                  <button
                    disabled
                    className="w-full py-2.5 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                    title="Only the workspace owner can upgrade"
                  >
                    Ask owner to upgrade
                  </button>
                )}
                {isDowngrade && (
                  <button
                    disabled
                    className="w-full py-2.5 text-sm font-medium text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed"
                  >
                    Downgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise callout */}
      <div className="border border-gray-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Enterprise</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Need custom limits, SLA, or dedicated support? Contact us for a tailored plan.
          </p>
        </div>
        <button
          disabled
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
        >
          Contact Sales
        </button>
      </div>

      {/* Upgrade Modal */}
      {upgradeTarget && (
        <UpgradeModal
          selectedPlan={upgradeTarget}
          currentPlanId={currentPlanId}
          onClose={() => setUpgradeTarget(null)}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}
    </div>
  );
}
