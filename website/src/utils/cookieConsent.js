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
  loadGoogleAnalytics(preferences);
  updateAnalyticsConsent(preferences);
  if (!preferences.analytics) clearAnalyticsCookies();
}

// Google Analytics 4 (REACT_APP_GA_MEASUREMENT_ID; off when empty). gtag.js is
// not requested at all until the visitor allows analytics: on a saved choice
// (startAnalytics, from CookieConsentManager) or when the banner grants it.
// Consent Mode is still set first, so marketing stays denied unless allowed.
const GA_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || '';
let gaLoaded = false;

function loadGoogleAnalytics(preferences) {
  if (gaLoaded || !preferences || !preferences.analytics) return;
  if (typeof window === 'undefined' || !/^G-[A-Z0-9]+$/.test(GA_ID)) return;
  gaLoaded = true;
  const marketing = preferences.marketing ? 'granted' : 'denied';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

// Starts analytics for a visitor who allowed it on an earlier visit
export function startAnalytics(consent) {
  if (consent && consent.preferences) loadGoogleAnalytics(consent.preferences);
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

// Google Analytics runs in Consent Mode: pass a changed choice on (withdrawing
// analytics after gtag.js loaded stops storage and hits for the rest of the visit)
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
