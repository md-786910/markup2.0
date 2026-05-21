import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function PreferenceToggle({ title, description, checked, disabled, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-100 bg-[#f4faf4]/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="min-w-0">
        <p className="font-semibold text-[#10231f] dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#53645f] dark:text-[#8a9b94]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={onChange}
        className={`relative mt-1 h-6 w-11 rounded-full transition ${
          checked ? 'bg-[#176b57]' : 'bg-slate-300 dark:bg-slate-700'
        } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
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
            className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-[30px] border border-emerald-100 bg-white/92 shadow-[0_30px_100px_rgba(15,23,42,0.2)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/92 sm:bottom-8"
          >
            <div className="border-b border-emerald-100 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-emerald-100 bg-[#eaf6ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#176b57] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Cookie preferences
                  </span>
                  <h2 id="cookie-preferences-title" className="mt-4 font-display text-2xl font-semibold text-[#10231f] dark:text-white">
                    Control how cookies are used
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[#53645f] dark:text-[#8a9b94]">
                    Essential cookies stay enabled. Everything else is optional and can be updated whenever you want.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close cookie preferences"
                  className="rounded-full border border-emerald-100 px-3 py-1.5 text-sm text-[#53645f] transition hover:border-emerald-200 hover:bg-[#f4faf4] dark:border-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <PreferenceToggle
                title="Essential cookies"
                description="Required for security, navigation, consent memory, and core website behavior."
                checked
                disabled
              />
              <PreferenceToggle
                title="Analytics cookies"
                description="Help measure traffic, understand page usage, and improve conversion and performance."
                checked={preferences.analytics}
                onChange={() => onToggle('analytics')}
              />
              <PreferenceToggle
                title="Preference cookies"
                description="Remember interface choices like UI state, layout preferences, and similar non-essential settings."
                checked={preferences.preferences}
                onChange={() => onToggle('preferences')}
              />
              <PreferenceToggle
                title="Marketing cookies"
                description="Support campaign attribution and optional remarketing measurement across landing experiences."
                checked={preferences.marketing}
                onChange={() => onToggle('marketing')}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-emerald-100 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#53645f] dark:text-[#8a9b94]">
                <Link to="/cookie-policy" className="hover:underline">Cookie Policy</Link>
                <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
                <Link to="/terms" className="hover:underline">Terms</Link>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onRejectAll}
                  className="rounded-full border border-emerald-100 bg-[#f4faf4] px-4 py-2.5 text-sm font-semibold text-[#365047] transition hover:border-emerald-200 hover:bg-[#eaf6ef] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Reject optional
                </button>
                <button
                  type="button"
                  onClick={onAcceptAll}
                  className="rounded-full border border-emerald-200 bg-[#eaf6ef] px-4 py-2.5 text-sm font-semibold text-[#0f5f4c] transition hover:bg-[#d9f0df] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-full bg-[#176b57] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(23,107,87,0.22)] transition hover:-translate-y-px"
                >
                  Save preferences
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}



