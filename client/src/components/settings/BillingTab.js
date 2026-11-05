import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTrialStatus } from "../../hooks/useTrialStatus";
import { getPlanApi, getPublicPlansApi, cancelSubscriptionApi, resumeSubscriptionApi } from "../../services/billingService";
import { PLANS as STATIC_PLANS, PLAN_LIST as STATIC_PLAN_LIST } from "../../config/plans";
import { confirmDialog } from "../../utils/confirm";
import { toast, toastError } from "../../utils/toast";
import { Badge, Banner, Button, Progress, Row, Section } from "../kc";
import SettingsLayout, { Muted } from "./SettingsLayout";
import BillingDetailsForm from "./BillingDetailsForm";
import InvoicesTab from "./InvoicesTab";
import PlanPickerModal from "./PlanPickerModal";
import UpgradeModal from "./UpgradeModal";
import DowngradeModal from "./DowngradeModal";

function UsageRow({ label, used, max }) {
  const unlimited = max >= 999;
  const percent = unlimited ? (used > 0 ? 4 : 0) : Math.min(100, (used / max) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-ui">
        <span className="text-gray-700">{label}</span>
        <span className={`tabular-nums ${!unlimited && percent >= 80 ? "text-amber-700" : "text-gray-500"}`}>
          {used} of {unlimited ? "unlimited" : max}
        </span>
      </div>
      <Progress value={Math.max(percent, 2)} label={`${label} used`} />
    </div>
  );
}

// Settings → Plan and billing: current plan (trial progress, cancel/resume,
// "Choose a plan" → upgrade/downgrade dialogs), usage, billing details and
// invoices (pay a due one, download PDFs).
export default function BillingTab() {
  const { user, isOwner, isAdmin, updateUser } = useAuth();
  const { daysLeft, trialDays, progressPercent, isTrialActive } = useTrialStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [downgradeTarget, setDowngradeTarget] = useState(null);
  const [status, setStatus] = useState(null); // { tone, text } after a checkout redirect
  const [livePlans, setLivePlans] = useState(STATIC_PLANS);
  const [livePlanList, setLivePlanList] = useState(STATIC_PLAN_LIST);
  const [allowDowngrades, setAllowDowngrades] = useState(false);

  useEffect(() => {
    const s = searchParams.get("status");
    if (s !== "success" && s !== "canceled") return undefined;
    setStatus(s === "success"
      ? { tone: "success", text: "Payment received. Your plan is upgraded." }
      : { tone: "warning", text: "Upgrade cancelled. No charges were made." });
    searchParams.delete("status");
    setSearchParams(searchParams, { replace: true });
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!status) return undefined;
    const t = setTimeout(() => setStatus(null), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const loadPlan = useCallback(
    () => getPlanApi().then((res) => setPlanData(res.data)),
    [],
  );

  useEffect(() => {
    loadPlan()
      .catch((err) => toastError(err, "Could not load your plan details."))
      .finally(() => setLoading(false));
    getPublicPlansApi()
      .then((res) => {
        if (res.data?.plans) setLivePlans(res.data.plans);
        if (res.data?.planList) setLivePlanList(res.data.planList);
        setAllowDowngrades(!!res.data?.allowDowngrades);
      })
      .catch(() => {});
  }, [loadPlan]);

  const handleUpgradeComplete = useCallback((userData) => {
    updateUser(userData);
    loadPlan().catch(() => {});
  }, [updateUser, loadPlan]);

  const refreshAfterPayment = useCallback(() => { loadPlan().catch(() => {}); }, [loadPlan]);

  const currentPlanId = user?.orgPlan || "trial";
  const currentOrder = currentPlanId === "trial" ? -1 : (livePlans[currentPlanId]?.order ?? -1);
  const planName = currentPlanId === "trial" ? "Pro trial" : livePlans[currentPlanId]?.name || "Free";

  const subscription = planData?.subscription || {};
  const cancelAtPeriodEnd = !!subscription.cancelAtPeriodEnd;
  const periodEnd = ["starter", "pro"].includes(currentPlanId) && subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;
  const trialEnds = user?.orgTrialEndsAt
    ? new Date(user.orgTrialEndsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  const refreshPlan = async (nextUser) => {
    if (nextUser) updateUser(nextUser);
    await loadPlan();
  };

  const handleCancel = async () => {
    const ok = await confirmDialog({
      title: "Cancel your subscription?",
      message: `You keep your plan until ${periodEnd} and won't be charged again. You can resume before then.`,
      confirmLabel: "Cancel subscription",
      cancelLabel: "Keep plan",
      danger: true,
    });
    if (!ok) return;
    setSubscriptionBusy(true);
    try {
      const res = await cancelSubscriptionApi();
      await refreshPlan(res.data.user);
      toast.success(`Subscription cancelled. You keep your plan until ${periodEnd}.`);
    } catch (err) {
      toastError(err, "Could not cancel the subscription.");
    }
    setSubscriptionBusy(false);
  };

  const handleResume = async () => {
    setSubscriptionBusy(true);
    try {
      const res = await resumeSubscriptionApi();
      await refreshPlan(res.data.user);
      toast.success("Subscription resumed.");
    } catch (err) {
      toastError(err, "Could not resume the subscription.");
    }
    setSubscriptionBusy(false);
  };

  const usage = planData?.usage || { projects: 0, members: 0, guests: 0 };
  const limits = planData?.limits || user?.orgLimits || { maxProjects: 5, maxMembers: 10, maxGuests: 5 };

  let badge = null;
  if (user?.orgLocked) badge = <Badge tone="danger">Locked</Badge>;
  else if (currentPlanId === "trial") badge = <Badge status="review">Trial</Badge>;
  else if (cancelAtPeriodEnd) badge = <Badge tone="changes">Cancelling</Badge>;
  else badge = <Badge tone="approved">Active</Badge>;

  const priceLine = currentPlanId !== "trial" && livePlans[currentPlanId]?.priceLabel
    ? `${livePlans[currentPlanId].priceLabel}${livePlans[currentPlanId].period ? ` ${livePlans[currentPlanId].period}` : ""}`
    : null;

  return (
    <SettingsLayout title="Plan and billing" subtitle={`Your plan and invoices for ${user?.orgName || "your organization"}.`}>
      {status && <Banner tone={status.tone}>{status.text}</Banner>}

      <Section
        title="Current plan"
        description={priceLine ? `${planName} · ${priceLine}` : planName}
        action={badge}
        footer={<Button variant="primary" onClick={() => setPickerOpen(true)}>Choose a plan</Button>}
      >
        {loading ? (
          <Muted>Loading your plan…</Muted>
        ) : (
          <>
            {isTrialActive && (
              <div className="flex flex-col gap-2">
                <Row title={`${daysLeft} of ${trialDays} days left`} description={trialEnds ? `Trial ends ${trialEnds}. Every Pro feature until then.` : "Every Pro feature until then."} />
                <Progress value={progressPercent} label="Trial used" />
              </div>
            )}
            {!isTrialActive && currentPlanId === "trial" && user?.orgLocked && (
              <Banner tone="danger" title="Your trial has ended">Choose a plan to keep working.</Banner>
            )}
            {periodEnd && (
              <Row
                title={cancelAtPeriodEnd ? `Cancelled. You keep this plan until ${periodEnd}.` : `Renews on ${periodEnd}`}
                description={cancelAtPeriodEnd ? "Resume to keep it after that date." : "We email an invoice before then."}
              >
                {isOwner && (
                  <Button loading={subscriptionBusy} onClick={cancelAtPeriodEnd ? handleResume : handleCancel} style={{ flexShrink: 0 }}>
                    {cancelAtPeriodEnd ? "Resume subscription" : "Cancel subscription"}
                  </Button>
                )}
              </Row>
            )}
            {!isTrialActive && !periodEnd && !(currentPlanId === "trial" && user?.orgLocked) && (
              <Muted>One plan covers every workspace in your organization.</Muted>
            )}
          </>
        )}
      </Section>

      <Section title="Usage" description="What your organization uses of the plan.">
        <UsageRow label="Projects" used={usage.projects} max={limits.maxProjects} />
        {limits.maxWorkspaces != null && <UsageRow label="Workspaces" used={usage.workspaces || 1} max={limits.maxWorkspaces} />}
        <UsageRow label="Team members" used={usage.members} max={limits.maxMembers} />
        <UsageRow label="Guest reviewers" used={usage.guests} max={limits.maxGuests} />
        {limits.maxStorageMB != null && (
          <UsageRow
            label="Storage (GB)"
            used={Math.round(((usage.storageMB || 0) / 1024) * 100) / 100}
            max={Math.round((limits.maxStorageMB / 1024) * 10) / 10}
          />
        )}
      </Section>

      <BillingDetailsForm canEdit={isOwner || isAdmin} />

      <InvoicesTab onPaid={refreshAfterPayment} />

      {pickerOpen && (
        <PlanPickerModal
          plans={livePlanList}
          currentPlanId={currentPlanId}
          currentOrder={currentOrder}
          allowDowngrades={allowDowngrades}
          isOwner={isOwner}
          onClose={() => setPickerOpen(false)}
          onUpgrade={(plan) => { setPickerOpen(false); setUpgradeTarget(plan); }}
          onDowngrade={(plan) => { setPickerOpen(false); setDowngradeTarget(plan); }}
        />
      )}
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
            toast.success("Plan changed.");
          }}
        />
      )}
    </SettingsLayout>
  );
}
