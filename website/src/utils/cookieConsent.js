export const COOKIE_CONSENT_STORAGE_KEY = 'kommently.cookie-consent';

export const DEFAULT_COOKIE_PREFERENCES = {
  necessary: true,
  analytics: false,
  preferences: false,
  marketing: false,
};

export function readCookieConsent() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...parsed,
      preferences: {
        ...DEFAULT_COOKIE_PREFERENCES,
        ...(parsed.preferences || {}),
        necessary: true,
      },
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent) {
  if (typeof window === 'undefined') return;
  const preferences = {
    ...DEFAULT_COOKIE_PREFERENCES,
    ...(consent.preferences || {}),
    necessary: true,
  };
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ ...consent, preferences }));
  updateAnalyticsConsent(preferences);
}

// Google Analytics (public/index.html) runs in Consent Mode: pass the choice on
function updateAnalyticsConsent(preferences) {
  if (typeof window.gtag !== 'function') return;
  const marketing = preferences.marketing ? 'granted' : 'denied';
  window.gtag('consent', 'update', {
    analytics_storage: preferences.analytics ? 'granted' : 'denied',
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  });
}

export function createConsentPayload(status, preferences) {
  return {
    version: 1,
    status,
    updatedAt: new Date().toISOString(),
    preferences: {
      ...DEFAULT_COOKIE_PREFERENCES,
      ...preferences,
      necessary: true,
    },
  };
}
