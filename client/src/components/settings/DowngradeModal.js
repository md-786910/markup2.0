import React, { useState } from 'react';
import { upgradePlanApi } from '../../services/billingService';
import Modal from '../common/Modal';
import { Banner, Button, Icon } from '../kc';

// Move to a lower plan (POST /billing/upgrade never takes payment)
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
      setError(err.response?.data?.message || 'Could not change the plan. Try again.');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={loading ? undefined : onClose} title={`Switch to ${targetPlan?.name}`} size="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-ui text-gray-600">
          <span>{currentPlan?.name || 'Current plan'}</span>
          <Icon name="arrow" size={16} className="text-gray-400" />
          <span className="font-semibold text-gray-900">{targetPlan?.name}</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-page-title text-gray-900">{targetPlan?.priceLabel}</span>
          {targetPlan?.period && <span className="text-ui text-gray-500">{targetPlan.period}</span>}
        </div>

        {losingFeatures.length > 0 && (
          <Banner tone="warning" title="You lose access to">
            {losingFeatures.join(' · ')}. Existing data is kept; new usage is capped to the {targetPlan?.name} limits.
          </Banner>
        )}

        {error && <Banner tone="danger">{error}</Banner>}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={loading} onClick={onClose}>Keep current plan</Button>
        <Button variant="primary" loading={loading} onClick={handleConfirm}>Switch to {targetPlan?.name}</Button>
      </div>
    </Modal>
  );
}
