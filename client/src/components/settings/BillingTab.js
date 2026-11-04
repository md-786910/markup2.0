import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTrialStatus } from "../../hooks/useTrialStatus";
import { getPlanApi, getPublicPlansApi, cancelSubscriptionApi, resumeSubscriptionApi } from "../../services/billingService";
import BillingDetailsForm from "./BillingDetailsForm";
import {
  PLANS as STATIC_PLANS,
  PLAN_LIST as STATIC_PLAN_LIST,
} from "../../config/plans";
import UpgradeModal from "./UpgradeModal";
import { confirmDialog } from "../../utils/confirm";
import DowngradeModal from "./DowngradeModal";
import { Badge, Button, Card, Notice } from '../ui';
import { toastError } from '../../utils/toast';


function UsageBar({ label, used, max }) {
  const isUnlimited = max >= 999;
  const percent = isUnlimited ? (used > 0 ? 4 : 0) : Math.min(100, (used / max) * 100);
  const isNearLimit = !isUnlimited && percent >= 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-body-sm font-medium text-gray-700">{label}</span>
        <span className={`text-caption font-medium tabular-nums ${isNearLimit ? 'text-amber-700' : 'text-gray-500'}`}>
          {used} / {isUnlimited ? 'Unlimited' : max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isNearLimit ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    </div>
  );
}

export default function BillingTab() {
  const { user, isOwner, isAdmin, updateUser } = useAuth();
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const { daysLeft, trialDays, progressPercent, isTrialActive, urgency } =
    useTrialStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [downgradeTarget, setDowngradeTarget] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [livePlans, setLivePlans] = useState(STATIC_PLANS);
  const [livePlanList, setLivePlanList] = useState(STATIC_PLAN_LIST);
  const [allowDowngrades, setAllowDowngrades] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setStatusMessage("Payment successful! Your plan has been upgraded.");
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setStatusMessage(""), 5000);
    } else if (status === "canceled") {
      setStatusMessage("Upgrade canceled. No charges were made.");
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setStatusMessage(""), 5000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getPlanApi()
      .then((res) => setPlanData(res.data))
      .catch((err) => toastError(err, 'Could not load your plan details.'))
      .finally(() => setLoading(false));

    getPublicPlansApi()
      .then((res) => {
        if (res.data?.plans) setLivePlans(res.data.plans);
        if (res.data?.planList) setLivePlanList(res.data.planList);
        setAllowDowngrades(!!res.data?.allowDowngrades);
      })
      .catch(() => { });
  }, []);

  const currentPlanId = user?.orgPlan || "trial";
  const currentOrder =
    currentPlanId === "trial" ? -1 : (livePlans[currentPlanId]?.order ?? -1);

  const handleUpgradeComplete = (userData) => {
    updateUser(userData);
    getPlanApi()
      .then((res) => setPlanData(res.data))
      .catch(() => { });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-6">
          <div className="h-48 flex-1 bg-gray-100 rounded-2xl" />
          <div className="h-48 flex-1 bg-gray-100 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Paid plan period and cancellation state
  const subscription = planData?.subscription || {};
  const cancelAtPeriodEnd = !!subscription.cancelAtPeriodEnd;
  const periodEnd = ["starter", "pro"].includes(currentPlanId) && subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  const refreshPlan = async (user) => {
    if (user) updateUser(user);
    const res = await getPlanApi();
    setPlanData(res.data);
  };

  const handleCancel = async () => {
    const ok = await confirmDialog({
      title: 'Cancel your subscription?',
      message: `You keep your plan until ${periodEnd} and won't be charged again. You can resume before then.`,
      confirmLabel: 'Cancel subscription',
      cancelLabel: 'Keep plan',
      danger: true,
    });
    if (!ok) return;
    setSubscriptionBusy(true);
    try {
      const res = await cancelSubscriptionApi();
      await refreshPlan(res.data.user);
      setStatusMessage(`Subscription cancelled. You keep your plan until ${periodEnd}.`);
    } catch (err) {
      setStatusMessage(err.response?.data?.message || "Could not cancel the subscription.");
    }
    setSubscriptionBusy(false);
  };

  const handleResume = async () => {
    setSubscriptionBusy(true);
    try {
      const res = await resumeSubscriptionApi();
      await refreshPlan(res.data.user);
      setStatusMessage("Subscription resumed.");
    } catch (err) {
      setStatusMessage(err.response?.data?.message || "Could not resume the subscription.");
    }
    setSubscriptionBusy(false);
  };

  const usage = planData?.usage || { projects: 0, members: 0, guests: 0 };
  const limits = planData?.limits ||
    user?.orgLimits || { maxProjects: 5, maxMembers: 10, maxGuests: 5 };
  const hasPaidSubscription =
    planData?.subscription?.status === "active" &&
    planData?.subscription?.razorpayCustomerId;

  const planName = currentPlanId === 'trial' ? 'Pro trial' : livePlans[currentPlanId]?.name || 'Free';
  const statusTone = statusMessage && statusMessage.includes('successful') ? 'green' : 'amber';

  return (
    <div className="space-y-6">
      {statusMessage && <Notice tone={statusTone}>{statusMessage}</Notice>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Current plan"
          actions={hasPaidSubscription && isOwner && (
            <Button size="sm" variant="secondary" onClick={() => setSearchParams({ tab: 'invoices' })}>View invoices</Button>
          )}
        >
          <div className="flex items-center gap-2.5">
            <p className="text-h3 font-semibold text-gray-900">{planName}</p>
            {currentPlanId !== 'trial' && !user?.orgLocked && <Badge tone={cancelAtPeriodEnd ? 'amber' : 'green'} dot>{cancelAtPeriodEnd ? 'Cancelling' : 'Active'}</Badge>}
            {user?.orgLocked && <Badge tone="red" dot>Locked</Badge>}
          </div>
          {currentPlanId !== 'trial' && (
            <p className="text-body-sm text-gray-500 mt-1">
              {livePlans[currentPlanId]?.priceLabel} <span className="text-gray-400">{livePlans[currentPlanId]?.period}</span>
            </p>
          )}
          {isTrialActive && (
            <p className="text-body-sm text-gray-500 mt-1">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left of your {trialDays}-day trial with every Pro feature.</p>
          )}
          {!isTrialActive && currentPlanId === 'trial' && user?.orgLocked && (
            <div className="mt-3"><Notice tone="red">Your trial has ended. Choose a plan below to keep working.</Notice></div>
          )}
          {periodEnd && (
            <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-body-sm ${cancelAtPeriodEnd ? 'text-amber-700' : 'text-gray-600'}`}>
                {cancelAtPeriodEnd ? `Cancelled. You keep this plan until ${periodEnd}.` : `Renews on ${periodEnd}. We email an invoice before then.`}
              </p>
              {isOwner && (
                <Button size="sm" variant="secondary" loading={subscriptionBusy} onClick={cancelAtPeriodEnd ? handleResume : handleCancel}>
                  {cancelAtPeriodEnd ? 'Resume subscription' : 'Cancel subscription'}
                </Button>
              )}
            </div>
          )}
          {isTrialActive && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-body-sm font-medium text-gray-700">Trial</span>
                <span className={`text-caption font-medium ${urgency === 'critical' ? 'text-red-600' : urgency === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${urgency === 'critical' ? 'bg-red-500' : urgency === 'warning' ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}
        </Card>

        <Card title="Usage" description="What your organization uses of the plan.">
          <div className="space-y-5">
            <UsageBar label="Projects" used={usage.projects} max={limits.maxProjects} />
            {limits.maxWorkspaces != null && <UsageBar label="Workspaces" used={usage.workspaces || 1} max={limits.maxWorkspaces} />}
            <UsageBar label="Team members" used={usage.members} max={limits.maxMembers} />
            <UsageBar label="Guest reviewers" used={usage.guests} max={limits.maxGuests} />
            {limits.maxStorageMB != null && (
              <UsageBar
                label="Storage (GB)"
                used={Math.round(((usage.storageMB || 0) / 1024) * 100) / 100}
                max={Math.round((limits.maxStorageMB / 1024) * 10) / 10}
              />
            )}
          </div>
        </Card>
      </div>

      <BillingDetailsForm canEdit={isOwner || isAdmin} />

      <Card title="Plans" description="One plan covers every workspace in your organization.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {livePlanList
            .filter((p) => p.id !== 'enterprise' && p.enabled !== false)
            .map((plan) => {
              // A trial runs with Pro features: Pro is what they're trying,
              // and Free is not "current" (nor an upgrade) during the trial
              const onTrial = currentPlanId === 'trial';
              const isCurrent = plan.id === currentPlanId;
              const isTrying = onTrial && plan.id === 'pro';
              const trialFree = onTrial && plan.id === 'free';
              const isUpgrade = !isCurrent && !trialFree && plan.order > currentOrder;
              const isDowngrade = !isCurrent && !trialFree && plan.order <= currentOrder;
              const highlighted = isCurrent || isTrying;
              return (
                <div key={plan.id} className={`relative flex flex-col rounded-xl p-5 transition-colors ${highlighted ? 'border-2 border-blue-600 bg-blue-50/30' : 'border border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-body-sm font-semibold text-gray-900">{plan.name}</h4>
                    {isTrying ? <Badge tone="blue">Your trial</Badge> : isCurrent ? <Badge tone="blue">Current</Badge> : plan.popular ? <Badge tone="blue">Most popular</Badge> : null}
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-h3 font-semibold text-gray-900">{plan.priceLabel}</span>
                    {plan.period && <span className="text-body-sm text-gray-500">{plan.period}</span>}
                  </div>
                  <ul className="space-y-2.5 my-5 flex-1">
                    {(plan.features || []).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-body-sm text-gray-600">
                        <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        <span className="">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-gray-100">
                    {trialFree && <p className="h-9 flex items-center justify-center text-body-sm text-gray-500">Free forever, no card needed</p>}
                    {isCurrent && <Button className="w-full" variant="secondary" disabled>Current plan</Button>}
                    {isUpgrade && isOwner && <Button className="w-full" variant="primary" onClick={() => setUpgradeTarget(plan)}>Upgrade to {plan.name}</Button>}
                    {isUpgrade && !isOwner && <Button className="w-full" variant="secondary" disabled title="Only the organization owner can upgrade">Ask the owner to upgrade</Button>}
                    {isDowngrade && allowDowngrades && isOwner && <Button className="w-full" variant="secondary" onClick={() => setDowngradeTarget(plan)}>Switch to {plan.name}</Button>}
                    {isDowngrade && allowDowngrades && !isOwner && <Button className="w-full" variant="secondary" disabled title="Only the organization owner can change the plan">Ask the owner to switch</Button>}
                    {isDowngrade && !allowDowngrades && <Button className="w-full" variant="secondary" disabled title="Plan downgrades are turned off">Not available</Button>}
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      {upgradeTarget && (
        <UpgradeModal
          selectedPlan={upgradeTarget}
          currentPlanId={currentPlanId}
          currentPlanName={livePlans[currentPlanId]?.name}
          onClose={() => setUpgradeTarget(null)}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}
      {downgradeTarget && (
        <DowngradeModal
          targetPlan={downgradeTarget}
          currentPlan={livePlans[currentPlanId] || null}
          onClose={() => setDowngradeTarget(null)}
          onDowngradeComplete={(userData) => {
            handleUpgradeComplete(userData);
            setDowngradeTarget(null);
          }}
        />
      )}
    </div>
  );
}
