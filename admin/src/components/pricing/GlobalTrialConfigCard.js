import React, { useState } from 'react';
import SetGlobalTrialModal from './SetGlobalTrialModal';
import { Button, Card } from '../common/ui';
import { Pill } from '../common/StatusBadge';
import { formatDate } from '../../utils/formatters';

// Trial length for new signups (admin trial settings)
export default function GlobalTrialConfigCard({ trialSettings, onSettingsUpdated }) {
  const [modalOpen, setModalOpen] = useState(false);
  const loaded = !!trialSettings;
  const defaultDays = trialSettings?.defaultDays;
  const activeCount = trialSettings?.activeTrialOrgsCount || 0;

  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-body font-semibold text-gray-900">Free trial</h2>
            {loaded && <Pill tone="blue">{defaultDays} days</Pill>}
          </div>
          <p className="mt-1 max-w-xl text-body-sm text-gray-500">
            {loaded
              ? 'How long new organizations can use the Pro plan for free, without a card.'
              : 'Could not load the trial settings.'}
          </p>
          {loaded && (
            <p className="mt-1.5 text-caption text-gray-500">
              {activeCount} running {activeCount === 1 ? 'trial' : 'trials'}
              {trialSettings.updatedAt && <> · changed {formatDate(trialSettings.updatedAt)}</>}
            </p>
          )}
        </div>
        <Button className="shrink-0" onClick={() => (loaded ? setModalOpen(true) : onSettingsUpdated?.())}>
          {loaded ? 'Change trial length' : 'Try again'}
        </Button>
      </div>

      {modalOpen && (
        <SetGlobalTrialModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          currentDays={defaultDays}
          activeTrialOrgsCount={activeCount}
          onSaved={(next) => onSettingsUpdated?.(next)}
        />
      )}
    </Card>
  );
}
