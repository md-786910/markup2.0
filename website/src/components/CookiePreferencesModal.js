import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function PreferenceToggle({ title, description, checked, disabled, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={onChange}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[#003dff]' : 'bg-slate-200'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? 'right-0.5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default function CookiePreferencesModal({
  open,
  preferences,
  onClose,
  onSave,
  onAcceptAll,
  onRejectAll,
  onToggle,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-slate-950/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
            className="fixed inset-x-4 top-[12vh] z-[100] mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h2 id="cookie-preferences-title" className="text-lg font-semibold text-slate-900">Cookie settings</h2>
                <p className="mt-1 text-sm text-slate-500">Essential cookies are always on. The rest are your choice.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close cookie settings"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="divide-y divide-slate-100 px-6 py-1">
              <PreferenceToggle
                title="Essential cookies"
                description="Security, navigation and remembering this choice."
                checked
                disabled
              />
              <PreferenceToggle
                title="Analytics cookies"
                description="Anonymous usage statistics (Google Analytics) to improve the site."
                checked={preferences.analytics}
                onChange={() => onToggle('analytics')}
              />
              <PreferenceToggle
                title="Preference cookies"
                description="Remember interface choices between visits."
                checked={preferences.preferences}
                onChange={() => onToggle('preferences')}
              />
              <PreferenceToggle
                title="Marketing cookies"
                description="Measure which campaigns bring visitors."
                checked={preferences.marketing}
                onChange={() => onToggle('marketing')}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
              <Link to="/cookie-policy" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 hover:underline">Cookie policy</Link>
              <div className="flex gap-2">
                <button type="button" onClick={onRejectAll} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">
                  Reject all
                </button>
                <button type="button" onClick={onSave} className="rounded-lg bg-[#003dff] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#0031d1]">
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}



