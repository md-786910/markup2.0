import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Button, Field, inputClass } from '../common/ui';
import { updateTrialSettingsApi } from '../../services/adminService';
import { toast, toastError } from '../../utils/toast';

const PRESETS = [7, 14, 30, 60];

export default function SetGlobalTrialModal({
  isOpen,
  onClose,
  currentDays = 14,
  activeTrialOrgsCount = 0,
  onSaved,
}) {
  const isPreset = PRESETS.includes(currentDays);
  const [selectedPreset, setSelectedPreset] = useState(isPreset ? currentDays : 'custom');
  const [customDays, setCustomDays] = useState(isPreset ? 14 : currentDays);
  const [syncActive, setSyncActive] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const isP = PRESETS.includes(currentDays);
      setSelectedPreset(isP ? currentDays : 'custom');
      setCustomDays(isP ? 14 : currentDays);
      setSyncActive(false);
      setReason('');
      setSaving(false);
    }
  }, [isOpen, currentDays]);

  const effectiveDays = selectedPreset === 'custom' ? Number(customDays) : selectedPreset;
  const isValidDays = Number.isInteger(effectiveDays) && effectiveDays >= 1 && effectiveDays <= 365;
  const isDaysChanged = isValidDays && effectiveDays !== currentDays;
  const isScopeChanged = syncActive === true;
  const hasReason = reason.trim().length > 0;
  const hasChanges = isDaysChanged || isScopeChanged || hasReason;
  const isSaveDisabled = saving || !hasChanges || !isValidDays;

  const handleSave = async () => {
    if (!isValidDays) {
      toast.error('Please enter a valid trial period between 1 and 365 days.');
      return;
    }

    setSaving(true);
    try {
      const res = await updateTrialSettingsApi({
        defaultDays: effectiveDays,
        syncActiveTrials: syncActive,
        reason: reason.trim(),
      });
      toast.success(res.data?.message || `Global trial period updated to ${effectiveDays} days.`);
      if (onSaved) onSaved(res.data);
      onClose();
    } catch (err) {
      toastError(err, 'Failed to update global trial settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Global Trial Period" maxWidth="max-w-lg">
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Default Evaluation Period
          </label>
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSelectedPreset(preset)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                  selectedPreset === preset
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {preset} Days
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedPreset('custom')}
              className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                selectedPreset === 'custom'
                  ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {selectedPreset === 'custom' && (
          <Field label="Custom Trial Days" hint="Enter the number of days for the trial period (1 to 365 days).">
            <input
              type="number"
              min="1"
              max="365"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className={inputClass}
              placeholder="e.g. 21"
            />
          </Field>
        )}

        {/* Application Scope */}
        <div className="border-t border-gray-100 pt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Application Scope
          </label>
          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700">
              <input
                type="radio"
                name="scope"
                checked={!syncActive}
                onChange={() => setSyncActive(false)}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-gray-900">Apply to future signups only</span>
                <p className="text-gray-500 text-[11px] mt-0.5">Existing workspaces keep their current expiration dates.</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700">
              <input
                type="radio"
                name="scope"
                checked={syncActive}
                onChange={() => setSyncActive(true)}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-gray-900">
                  Apply & sync across all active trial workspaces ({activeTrialOrgsCount} workspaces)
                </span>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Recalculates trial end dates based on workspace creation date with at least 2 days grace period for older trials.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Audit Reason */}
        <div className="border-t border-gray-100 pt-4">
          <Field label="Reason (Optional)" hint="Recorded in the admin action audit log for team transparency.">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Standardizing to 14 days evaluation across all workspaces"
              className={inputClass}
            />
          </Field>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaveDisabled}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

