import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function CookieBanner({
  visible,
  onAccept,
  onReject,
  onOpenPreferences,
}) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-[720px]"
        >
          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                  Privacy controls
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold text-slate-950 dark:text-white">
                  We use cookies to keep the product fast, secure, and easier to use.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Essential cookies are always on. Optional analytics, preference, and marketing cookies help improve the experience and measure usage. You can accept, reject, or customize your choices at any time.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <Link to="/cookie-policy" className="font-medium text-[#2854ff] hover:underline">
                    Cookie Policy
                  </Link>
                  <Link to="/privacy" className="hover:underline">
                    Privacy Policy
                  </Link>
                  <Link to="/terms" className="hover:underline">
                    Terms
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onOpenPreferences}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
                >
                  Preferences
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
                >
                  Reject optional
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="rounded-full bg-[#2854ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(40,84,255,0.24)] transition hover:-translate-y-px"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
