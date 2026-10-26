import React, { useEffect, useState } from 'react';
import CookieBanner from './CookieBanner';
import ChatLauncher from './ChatLauncher';
import CookiePreferencesModal from './CookiePreferencesModal';
import {
  createConsentPayload,
  DEFAULT_COOKIE_PREFERENCES,
  readCookieConsent,
  writeCookieConsent,
} from '../utils/cookieConsent';

const OPEN_EVENT = 'kommently:cookie-settings';

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

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

  // Reopened from the footer's "Cookie settings" link (openCookieSettings)
  useEffect(() => {
    const open = () => {
      setModalOpen(true);
      setDraftPreferences(savedConsent?.preferences || DEFAULT_COOKIE_PREFERENCES);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [savedConsent]);

  if (!mounted) return null;

  return (
    <>
      <ChatLauncher hidden={bannerVisible || modalOpen} />
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

    </>
  );
}


