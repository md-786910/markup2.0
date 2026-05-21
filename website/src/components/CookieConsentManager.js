import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CookieBanner from './CookieBanner';
import CookiePreferencesModal from './CookiePreferencesModal';
import {
  createConsentPayload,
  DEFAULT_COOKIE_PREFERENCES,
  readCookieConsent,
  writeCookieConsent,
} from '../utils/cookieConsent';

export default function CookieConsentManager() {
  const [mounted, setMounted] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [savedConsent, setSavedConsent] = useState(null);
  const [draftPreferences, setDraftPreferences] = useState(DEFAULT_COOKIE_PREFERENCES);

  useEffect(() => {
    const existingConsent = readCookieConsent();
    setSavedConsent(existingConsent);
    setDraftPreferences(existingConsent?.preferences || DEFAULT_COOKIE_PREFERENCES);
    setMounted(true);

    if (!existingConsent) {
      const timer = window.setTimeout(() => setBannerVisible(true), 450);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, []);

  const hasDecision = useMemo(() => !!savedConsent, [savedConsent]);

  function persistConsent(status, preferences) {
    const payload = createConsentPayload(status, preferences);
    writeCookieConsent(payload);
    setSavedConsent(payload);
    setDraftPreferences(payload.preferences);
    setBannerVisible(false);
    setModalOpen(false);
  }

  function handleAcceptAll() {
    persistConsent('accepted', {
      necessary: true,
      analytics: true,
      preferences: true,
      marketing: true,
    });
  }

  function handleRejectOptional() {
    persistConsent('rejected', DEFAULT_COOKIE_PREFERENCES);
  }

  function handleSavePreferences() {
    persistConsent('customized', draftPreferences);
  }

  function handleTogglePreference(key) {
    setDraftPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleOpenPreferences() {
    setModalOpen(true);
    setDraftPreferences(savedConsent?.preferences || DEFAULT_COOKIE_PREFERENCES);
  }

  if (!mounted) return null;

  return (
    <>
      <CookieBanner
        visible={bannerVisible}
        onAccept={handleAcceptAll}
        onReject={handleRejectOptional}
        onOpenPreferences={handleOpenPreferences}
      />

      <CookiePreferencesModal
        open={modalOpen}
        preferences={draftPreferences}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePreferences}
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectOptional}
        onToggle={handleTogglePreference}
      />

      <AnimatePresence>
        {hasDecision && !bannerVisible ? (
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.28 }}
            type="button"
            onClick={handleOpenPreferences}
            className="fixed bottom-4 left-4 z-[70] rounded-full border border-emerald-100 bg-white/85 px-4 py-2 text-sm font-medium text-[#365047] shadow-[0_16px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:border-emerald-200 hover:bg-white dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200"
            aria-label="Open cookie preferences"
          >
            Cookie preferences
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}


