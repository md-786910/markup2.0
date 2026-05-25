import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTrialStatus } from "../../hooks/useTrialStatus";
import { getPlanApi, getPublicPlansApi } from "../../services/billingService";
import {
  PLANS as STATIC_PLANS,
  PLAN_LIST as STATIC_PLAN_LIST,
} from "../../config/plans";
import UpgradeModal from "./UpgradeModal";
import DowngradeModal from "./DowngradeModal";

const badgeColors = {
  gray: "bg-gray-100 text-gray-600 border border-gray-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
};

function UsageBar({ label, used, max, color = "blue" }) {
  const percent =
    max >= 999 ? (used > 0 ? 5 : 0) : Math.min(100, (used / max) * 100);
  const isUnlimited = max >= 999;
  const isNearLimit = !isUnlimited && percent >= 80;

  const colorClasses = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };

  const activeColor = isNearLimit
    ? colorClasses.amber
    : colorClasses[color] || colorClasses.blue;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span
          className={`text-xs font-semibold ${isNearLimit ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100" : "text-gray-500"}`}
        >
          {used} / {isUnlimited ? "∞" : max}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ${activeColor}`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingTab() {
  const { user, isOwner, updateUser } = useAuth();
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
      .catch((err) => console.error("Failed to load plan:", err))
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

  const usage = planData?.usage || { projects: 0, members: 0, guests: 0 };
  const limits = planData?.limits ||
    user?.orgLimits || { maxProjects: 5, maxMembers: 10, maxGuests: 5 };
  const hasPaidSubscription =
    planData?.subscription?.status === "active" &&
    planData?.subscription?.razorpayCustomerId;

  return (
    <div className="space-y-8 pb-10">
      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium shadow-sm ${statusMessage.includes("successful")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            {statusMessage.includes("successful") ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            )}
          </svg>
          {statusMessage}
        </div>
      )}

      {/* Top Grid: Subscription & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Subscription Card */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-6 -right-6 text-blue-50 opacity-[0.04] pointer-events-none">
            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Current Plan
              </h3>
              {hasPaidSubscription && isOwner && (
                <button
                  onClick={() => setSearchParams({ tab: "invoices" })}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <svg
                    className="w-3.5 h-3.5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  View Invoices
                </button>
              )}
            </div>

            <div className="flex items-end gap-3 mb-2">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {currentPlanId === "trial"
                  ? "Free Trial"
                  : livePlans[currentPlanId]?.name || "Free"}
              </h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${badgeColors[livePlans[currentPlanId]?.badgeColor || "gray"]
                  }`}
              >
                {currentPlanId === "trial" ? "Trial" : "Active"}
              </span>
            </div>

            {isTrialActive && (
              <p className="text-sm text-gray-500 font-medium">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining in your{" "}
                {trialDays}-day trial.
              </p>
            )}
            {!isTrialActive && currentPlanId === "trial" && user?.orgLocked && (
              <div className="inline-flex items-center gap-1.5 mt-2 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 font-medium">
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  ></path>
                </svg>
                Trial expired. Please upgrade.
              </div>
            )}
            {currentPlanId !== "trial" && (
              <p className="text-sm text-gray-500 font-medium">
                {livePlans[currentPlanId]?.priceLabel}{" "}
                <span className="text-gray-400 font-normal">
                  {livePlans[currentPlanId]?.period}
                </span>
              </p>
            )}
          </div>

          {isTrialActive && (
            <div className="mt-6 pt-5 border-t border-gray-100 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Trial Progress
                </span>
                <span
                  className={`text-xs font-bold ${urgency === "critical"
                      ? "text-red-600"
                      : urgency === "warning"
                        ? "text-amber-600"
                        : "text-blue-600"
                    }`}
                >
                  {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${urgency === "critical"
                      ? "bg-red-500"
                      : urgency === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Workspace Usage Card */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 mb-6">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
              />
            </svg>
            Workspace Usage
          </h3>
          <div className="space-y-5">
            <UsageBar
              label="Projects"
              used={usage.projects}
              max={limits.maxProjects}
              color="purple"
            />
            <UsageBar
              label="Team Members"
              used={usage.members}
              max={limits.maxMembers}
              color="blue"
            />
            <UsageBar
              label="Guest Reviewers"
              used={usage.guests}
              max={limits.maxGuests}
              color="emerald"
            />
          </div>
        </section>
      </div>

      {/* Available Plans Section */}
      <section className="pt-4">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Upgrade your workspace
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Unlock premium features, remove limits, and collaborate seamlessly
            with your entire team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {livePlanList
            .filter((p) => p.id !== "enterprise" && p.enabled !== false)
            .map((plan) => {
              const isCurrent =
                plan.id === currentPlanId ||
                (currentPlanId === "trial" && plan.id === "free");
              const isUpgrade = !isCurrent && plan.order > currentOrder;
              const isDowngrade = !isCurrent && plan.order <= currentOrder;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col bg-white rounded-2xl p-6 transition-all duration-200 ${isCurrent
                      ? "border-2 border-blue-500 shadow-md transform -translate-y-1"
                      : "border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h4 className="text-base font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {plan.priceLabel}
                      </span>
                      {plan.period && (
                        <span className="text-sm font-medium text-gray-500">
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <ul className="space-y-3 mb-8">
                      {(plan.features || []).map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-gray-600"
                        >
                          <div className="mt-0.5 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <svg
                              className="w-2.5 h-2.5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100">
                    {isCurrent && (
                      <button
                        disabled
                        className="w-full py-2.5 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl cursor-default"
                      >
                        Current Plan
                      </button>
                    )}
                    {isUpgrade && isOwner && (
                      <button
                        onClick={() => setUpgradeTarget(plan)}
                        className="w-full py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm hover:shadow flex justify-center items-center gap-2"
                      >
                        Upgrade to {plan.name}
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          ></path>
                        </svg>
                      </button>
                    )}
                    {isUpgrade && !isOwner && (
                      <button
                        disabled
                        className="w-full py-2.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl cursor-not-allowed border border-gray-200"
                        title="Only the workspace owner can upgrade"
                      >
                        Ask owner to upgrade
                      </button>
                    )}
                    {isDowngrade && allowDowngrades && isOwner && (
                      <button
                        onClick={() => setDowngradeTarget(plan)}
                        className="w-full py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors flex justify-center items-center gap-2"
                      >
                        Downgrade to {plan.name}
                      </button>
                    )}
                    {isDowngrade && allowDowngrades && !isOwner && (
                      <button
                        disabled
                        className="w-full py-2.5 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl cursor-not-allowed border border-gray-200"
                        title="Only the workspace owner can change the plan"
                      >
                        Ask owner to downgrade
                      </button>
                    )}
                    {isDowngrade && !allowDowngrades && (
                      <button
                        disabled
                        className="w-full py-2.5 text-sm font-bold text-gray-400 bg-gray-50 rounded-xl cursor-not-allowed border border-gray-200"
                        title="Downgrades are disabled by your admin"
                      >
                        Downgrade
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Enterprise Callout */}
      {/* <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="text-left">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a.75.75 0 01.673.418l2.67 5.412 5.968.869a.75.75 0 01.416 1.279l-4.318 4.208 1.019 5.944a.75.75 0 01-1.088.791L10 18.347l-5.34 2.808a.75.75 0 01-1.088-.791l1.019-5.944-4.318-4.208a.75.75 0 01.416-1.279l5.968-.869 2.67-5.412A.75.75 0 0110 2z" clipRule="evenodd" />
            </svg>
            Enterprise Plan
          </h4>
          <p className="text-sm text-gray-300 mt-1 max-w-xl">
            Need custom limits, single sign-on (SSO), SLA guarantees, or dedicated priority support? Contact our sales team for a fully tailored solution.
          </p>
        </div>
        <button
          disabled
          className="px-6 py-2.5 text-sm font-bold text-gray-900 bg-white rounded-xl hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
        >
          Contact Sales
        </button>
      </section> */}

      {/* Upgrade Modal */}
      {upgradeTarget && (
        <UpgradeModal
          selectedPlan={upgradeTarget}
          currentPlanId={currentPlanId}
          currentPlanName={livePlans[currentPlanId]?.name}
          onClose={() => setUpgradeTarget(null)}
          onUpgradeComplete={handleUpgradeComplete}
        />
      )}

      {/* Downgrade Modal */}
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
