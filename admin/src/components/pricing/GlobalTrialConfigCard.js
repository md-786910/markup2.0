import React, { useState } from 'react';
import SetGlobalTrialModal from './SetGlobalTrialModal';
import { Button } from '../common/ui';

export default function GlobalTrialConfigCard({
  trialSettings,
  onSettingsUpdated,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const defaultDays = trialSettings?.defaultDays || 14;
  const activeCount = trialSettings?.activeTrialOrgsCount || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-gray-900">Global Workspace Trial Period</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {defaultDays} Days
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-xl">
              Configures the default trial duration granted to new workspaces upon signup. Changes can be applied to future signups or synced across all active trials.
            </p>
            <div className="flex items-center gap-4 mt-2 text-[11.5px] text-gray-400">
              <span>Active trial workspaces: <strong className="text-gray-700">{activeCount}</strong></span>
              {trialSettings?.updatedAt && (
                <span>&bull; Last modified: <strong className="text-gray-600">{new Date(trialSettings.updatedAt).toLocaleDateString()}</strong></span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Configure Trial Period
          </Button>
        </div>
      </div>

      {modalOpen && (
        <SetGlobalTrialModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          currentDays={defaultDays}
          activeTrialOrgsCount={activeCount}
          onSaved={(newSettings) => {
            if (onSettingsUpdated) onSettingsUpdated(newSettings);
          }}
        />
      )}
    </div>
  );
}

