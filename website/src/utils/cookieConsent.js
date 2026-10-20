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
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({
    ...consent,
    preferences: {
      ...DEFAULT_COOKIE_PREFERENCES,
      ...(consent.preferences || {}),
      necessary: true,
    },
  }));
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
