import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Button, Field, inputClass } from '../common/ui';
import { updateTrialSettingsApi } from '../../services/adminService';
import { toast, toastError } from '../../utils/toast';

const PRESETS = [7, 14, 30, 60];

const chipClass = (active) => `rounded-lg border px-3 py-2 text-label transition-colors ${
  active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
}`;

export default function SetGlobalTrialModal({ isOpen, onClose, currentDays, activeTrialOrgsCount = 0, onSaved }) {
  const isPreset = PRESETS.includes(currentDays);
  const [selected, setSelected] = useState(isPreset ? currentDays : 'custom');
  const [customDays, setCustomDays] = useState(isPreset ? '' : String(currentDays ?? ''));
  const [syncActive, setSyncActive] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const days = selected === 'custom' ? Number(customDays) : selected;
  const valid = Number.isInteger(days) && days >= 1 && days <= 365;
  const changed = valid && (days !== currentDays || syncActive);

  const save = async () => {
    if (!valid) {
      toast.error('Choose a trial length of 1 to 365 days.');
      return;
    }
    setSaving(true);
    try {
      const res = await updateTrialSettingsApi({ defaultDays: days, syncActiveTrials: syncActive, reason: reason.trim() });
      toast.success(res.data?.message || `New signups now get a ${days}-day trial.`);
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toastError(err, 'Could not change the trial length.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trial length" maxWidth="max-w-lg">
      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-label text-gray-700">Days</span>
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setSelected(p)} className={chipClass(selected === p)}>{p}</button>
            ))}
            <button type="button" onClick={() => setSelected('custom')} className={chipClass(selected === 'custom')}>Other</button>
          </div>
        </div>

        {selected === 'custom' && (
          <Field label="Number of days" hint="1 to 365.">
            <input type="number" min="1" max="365" value={customDays} onChange={(e) => setCustomDays(e.target.value)} className={inputClass} placeholder="e.g. 21" autoFocus />
          </Field>
        )}

        <fieldset className="space-y-3 border-t border-gray-100 pt-4">
          <legend className="mb-2 text-label text-gray-700">Applies to</legend>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input type="radio" name="scope" checked={!syncActive} onChange={() => setSyncActive(false)} className="mt-1 text-blue-600 focus:ring-blue-600" />
            <span>
              <span className="block text-body-sm font-medium text-gray-900">New signups only</span>
              <span className="block text-caption text-gray-500">Running trials keep their end dates.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input type="radio" name="scope" checked={syncActive} onChange={() => setSyncActive(true)} className="mt-1 text-blue-600 focus:ring-blue-600" />
            <span>
              <span className="block text-body-sm font-medium text-gray-900">New signups and running trials ({activeTrialOrgsCount})</span>
              <span className="block text-caption text-gray-500">
                Running trials are extended to end {valid ? days : 'N'} days after signup. A trial already set to end later keeps its date: none are shortened.
              </span>
            </span>
          </label>
        </fieldset>

        <Field label="Reason (optional)" hint="Saved in the action log.">
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={inputClass} placeholder="e.g. Longer evaluations for agencies" />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving || !changed}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  );
}
