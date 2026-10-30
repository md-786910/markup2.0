/**
 * clientEnv.js - Client-side environment extraction for Developer-Ready Reports
 */

export function detectBrowserAndOS() {
  const ua = navigator.userAgent || '';
  let browser = 'Unknown';
  let os = 'Unknown';

  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) {
    const match = ua.match(/Mac OS X ([0-9_]+)/i);
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android ([0-9.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS ([0-9_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  if (/Edg\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([0-9]+)/i);
    browser = `Edge ${match ? match[1] : ''}`.trim();
  } else if (/OPR\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/OPR\/([0-9]+)/i);
    browser = `Opera ${match ? match[1] : ''}`.trim();
  } else if (/Chrome\/([0-9]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9]+)/i);
    browser = `Chrome ${match ? match[1] : ''}`.trim();
  } else if (/Firefox\/([0-9]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9]+)/i);
    browser = `Firefox ${match ? match[1] : ''}`.trim();
  } else if (/Version\/([0-9]+).*Safari/i.test(ua)) {
    const match = ua.match(/Version\/([0-9]+)/i);
    browser = `Safari ${match ? match[1] : ''}`.trim();
  }

  return { browser, os };
}

export function getClientEnvironment() {
  const { browser, os } = detectBrowserAndOS();

  let timeZone = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    // ignore
  }

  const screenInfo = typeof window !== 'undefined' && window.screen ? {
    w: window.screen.width || null,
    h: window.screen.height || null,
    dpr: window.devicePixelRatio || 1,
  } : null;

  return {
    browser,
    os,
    screen: screenInfo,
    timeZone,
    language: typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage || null) : null,
  };
}

