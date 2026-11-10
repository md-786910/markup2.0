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
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ ...consent, preferences }));
  } catch {
    // Storage blocked (private mode, strict settings): the choice still applies
    // for this visit; the banner asks again next time
  }
  updateAnalyticsConsent(preferences);
  if (!preferences.analytics) clearAnalyticsCookies();
}

// Withdrawing analytics consent removes the Google Analytics cookies already set
// (_ga, _ga_<id>), on this host and its parent domains
function clearAnalyticsCookies() {
  if (typeof document === 'undefined') return;
  const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga(_|$)/.test(n) || n === '_gid');
  if (!names.length) return;
  const labels = window.location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < labels.length - 1; i += 1) domains.push(`; domain=.${labels.slice(i).join('.')}`);
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
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
