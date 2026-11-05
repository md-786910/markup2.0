import React from 'react';
import Modal from '../common/Modal';
import { Badge, Button, Icon, cx } from '../kc';

// "Choose a plan": the plans from /api/plans (names, prices and features come
// from the product, never from here). Picking one opens the upgrade or
// downgrade dialog through onUpgrade / onDowngrade.
export default function PlanPickerModal({ plans, currentPlanId, currentOrder, allowDowngrades, isOwner, onUpgrade, onDowngrade, onClose }) {
  const onTrial = currentPlanId === 'trial';
  const list = (plans || []).filter((p) => p.id !== 'enterprise' && p.enabled !== false);

  return (
    <Modal isOpen onClose={onClose} title="Choose a plan" className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <p className="m-0 mb-4 text-ui text-gray-600">One plan covers every workspace in your organization.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {list.map((plan) => {
          // A trial runs with Pro features: Pro is what they're trying, and
          // Free is not "current" (nor an upgrade) during the trial
          const isCurrent = plan.id === currentPlanId;
          const isTrying = onTrial && plan.id === 'pro';
          const trialFree = onTrial && plan.id === 'free';
          const isUpgrade = !isCurrent && !trialFree && plan.order > currentOrder;
          const isDowngrade = !isCurrent && !trialFree && plan.order <= currentOrder;
          const highlighted = isCurrent || isTrying;
          return (
            <div
              key={plan.id}
              className={cx('flex flex-col rounded-xl p-4 bg-white border', highlighted ? 'border-blue-600' : 'border-gray-200')}
              style={highlighted ? { boxShadow: '0 0 0 1px var(--brand-600)' } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 text-card-title text-gray-900">{plan.name}</h3>
                {isTrying ? <Badge status="review">Your trial</Badge> : isCurrent ? <Badge status="review">Current</Badge> : plan.popular ? <Badge tone="neutral">Most popular</Badge> : null}
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-page-title text-gray-900">{plan.priceLabel}</span>
                {plan.period && <span className="text-ui text-gray-500">{plan.period}</span>}
              </div>
              <ul className="flex-1 my-4 p-0 list-none flex flex-col gap-2">
                {(plan.features || []).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-ui text-gray-600">
                    <Icon name="check" size={14} stroke={2} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-gray-100">
                {trialFree && <p className="m-0 h-8 flex items-center justify-center text-ui text-gray-500">Free forever, no card needed</p>}
                {isCurrent && <Button block disabled>Current plan</Button>}
                {isUpgrade && isOwner && <Button block variant="primary" onClick={() => onUpgrade(plan)}>Upgrade to {plan.name}</Button>}
                {isUpgrade && !isOwner && <Button block disabled title="Only the organization owner can upgrade">Ask the owner to upgrade</Button>}
                {isDowngrade && allowDowngrades && isOwner && <Button block onClick={() => onDowngrade(plan)}>Switch to {plan.name}</Button>}
                {isDowngrade && allowDowngrades && !isOwner && <Button block disabled title="Only the organization owner can change the plan">Ask the owner to switch</Button>}
                {isDowngrade && !allowDowngrades && <Button block disabled title="Plan downgrades are turned off">Not available</Button>}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
