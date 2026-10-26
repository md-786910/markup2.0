import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// Compact consent bar: one sentence, policy link, three clear choices
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl sm:inset-x-4 sm:bottom-4"
        >
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-lg sm:flex-row sm:items-center sm:gap-5 sm:px-5">
            <p className="flex-1 text-sm leading-6 text-slate-600">
              We use essential cookies to run the site, and optional ones for analytics only if you allow them.{' '}
              <Link to="/cookie-policy" className="font-medium text-[#003dff] hover:underline">
                Cookie policy
              </Link>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onOpenPreferences}
                className="px-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Customize
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-lg bg-[#003dff] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#0031d1]"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
