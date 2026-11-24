import { useState, useEffect, useCallback, useRef } from "react";

// The review iframe is served by the API (website proxy); messages from any
// other window are ignored. If the API address isn't absolute, no check is made.
export const PROXY_ORIGIN = (() => {
  try {
    return new URL(process.env.REACT_APP_BASE_URL || "http://localhost:5000/api").origin;
  } catch {
    return null;
  }
})();

// The review iframe (IframeContainer) carries this attribute. Messages must come
// from its window: the proxy origin alone also matches frames nested inside the
// reviewed page and windows it opens (SEC-13).
export const REVIEW_FRAME_ATTR = "data-markup-review";

// Where parent -> iframe messages may go: the proxy origin when known
export const PROXY_TARGET_ORIGIN = PROXY_ORIGIN || "*";

export function isReviewFrameMessage(event) {
  if (PROXY_ORIGIN && event.origin !== PROXY_ORIGIN) return false;
  if (!event.source) return false;
  const frames = document.querySelectorAll(`iframe[${REVIEW_FRAME_ATTR}]`);
  for (let i = 0; i < frames.length; i += 1) {
    if (frames[i].contentWindow === event.source) return true;
  }
  return false;
}

const KNOWN_TYPES = new Set([
  "MARKUP_READY",
  "MARKUP_NAVIGATING",
  "MARKUP_SCROLL",
  "MARKUP_CLICK",
  "MARKUP_SCREENSHOT",
  "MARKUP_PIN_CLICK",
  "MARKUP_BLOCKED",
]);

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
// Optional number: null/undefined stay null, anything else must be finite
const optNum = (v) => (v == null ? null : isNum(v) ? v : undefined);
const optStr = (v, max) => (v == null ? null : typeof v === "string" && v.length <= max ? v : undefined);
const isPageUrl = (v) => typeof v === "string" && v.length <= 4096 && /^https?:\/\//i.test(v);

// Checks a MARKUP_* message's fields; returns false for anything malformed
function validMessage(data) {
  switch (data.type) {
    case "MARKUP_NAVIGATING":
      return true;
    case "MARKUP_BLOCKED":
      return data.domain == null || (typeof data.domain === "string" && data.domain.length <= 255);
    case "MARKUP_READY":
      return (data.pageUrl == null || isPageUrl(data.pageUrl))
        && optNum(data.documentWidth) !== undefined && optNum(data.documentHeight) !== undefined;
    case "MARKUP_SCROLL":
      return ["scrollX", "scrollY", "documentWidth", "documentHeight", "viewportWidth", "viewportHeight"]
        .every((k) => isNum(data[k]));
    case "MARKUP_CLICK":
      return isNum(data.xPercent) && isNum(data.yPercent)
        && ["viewportXPercent", "viewportYPercent", "elementOffsetX", "elementOffsetY", "documentWidth", "documentHeight"]
          .every((k) => optNum(data[k]) !== undefined)
        && optStr(data.clickId, 100) !== undefined
        && optStr(data.selector, 20000) !== undefined
        && isPageUrl(data.pageUrl)
        && (data.context == null || (typeof data.context === "object" && !Array.isArray(data.context)));
    case "MARKUP_SCREENSHOT":
      return optStr(data.clickId, 100) !== undefined
        && (data.screenshot == null || (typeof data.screenshot === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(data.screenshot)));
    case "MARKUP_PIN_CLICK":
      return typeof data.pinId === "string" && data.pinId.length <= 64;
    default:
      return false;
  }
}

export function useIframeMessages() {
  // Scroll data stored in ref — updates do NOT trigger re-renders
  const scrollRef = useRef({
    scrollX: 0,
    scrollY: 0,
    documentWidth: 0,
    documentHeight: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  });

  // Only data that drives UI re-renders goes in state
  const [state, setState] = useState({
    ready: false,
    navigating: false,
    lastClick: null,
    currentPageUrl: null,
    screenshot: null,
    // The pin-mode click the screenshot belongs to (frame's clickId)
    screenshotClickId: null,
    // Set when the proxy could not load the site: { kind: 'blocked'|'unreachable', domain }
    blocked: null,
  });

  // Screenshot messages go to subscribers one by one (state would merge two
  // that arrive together into the last one)
  const screenshotListeners = useRef(new Set());
  const onScreenshot = useCallback((fn) => {
    screenshotListeners.current.add(fn);
    return () => screenshotListeners.current.delete(fn);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const data = event.data;
      if (!data || typeof data.type !== "string" || !data.type.startsWith("MARKUP_")) return;
      if (!isReviewFrameMessage(event) || !KNOWN_TYPES.has(data.type) || !validMessage(data)) {
        // Forged or malformed: also keep it from the page's other MARKUP_*
        // listeners (ProjectView's pin-click handler is registered after this one)
        event.stopImmediatePropagation();
        return;
      }

      switch (data.type) {
        case "MARKUP_NAVIGATING":
          setState((prev) => ({
            ...prev,
            navigating: true,
            ready: false,
            blocked: null,
          }));
          break;
        case "MARKUP_BLOCKED":
          setState((prev) => ({
            ...prev,
            blocked: { kind: data.kind === 'blocked' ? 'blocked' : 'unreachable', domain: data.domain || '' },
          }));
          break;
        case "MARKUP_READY":
          setState((prev) => ({
            ...prev,
            ready: true,
            navigating: false,
            blocked: null,
            currentPageUrl: data.pageUrl || prev.currentPageUrl,
          }));
          scrollRef.current.documentWidth = data.documentWidth;
          scrollRef.current.documentHeight = data.documentHeight;
          break;
        case "MARKUP_SCROLL":
          // Update ref only — no re-render needed
          scrollRef.current = {
            scrollX: data.scrollX,
            scrollY: data.scrollY,
            documentWidth: data.documentWidth,
            documentHeight: data.documentHeight,
            viewportWidth: data.viewportWidth,
            viewportHeight: data.viewportHeight,
          };
          break;
        case "MARKUP_CLICK":
          setState((prev) => ({
            ...prev,
            screenshot: null,
            screenshotClickId: null,
            lastClick: {
              clickId: data.clickId || null,
              xPercent: data.xPercent,
              yPercent: data.yPercent,
              viewportXPercent: data.viewportXPercent != null ? data.viewportXPercent : null,
              viewportYPercent: data.viewportYPercent != null ? data.viewportYPercent : null,
              pageUrl: data.pageUrl,
              selector: data.selector || null,
              elementOffsetX: data.elementOffsetX != null ? data.elementOffsetX : null,
              elementOffsetY: data.elementOffsetY != null ? data.elementOffsetY : null,
              documentWidth: data.documentWidth != null ? data.documentWidth : null,
              documentHeight: data.documentHeight != null ? data.documentHeight : null,
              context: data.context || null,
            },
          }));
          break;
        case "MARKUP_SCREENSHOT":
          screenshotListeners.current.forEach((fn) => fn({
            clickId: data.clickId || null,
            screenshot: data.screenshot || null,
          }));
          setState((prev) => ({
            ...prev,
            screenshot: data.screenshot,
            screenshotClickId: data.clickId || null,
          }));
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const clearLastClick = useCallback(() => {
    setState((prev) => ({ ...prev, lastClick: null }));
  }, []);

  const resetReady = useCallback(() => {
    setState((prev) => ({ ...prev, ready: false }));
  }, []);

  const clearScreenshot = useCallback(() => {
    setState((prev) => ({ ...prev, screenshot: null, screenshotClickId: null }));
  }, []);

  return { ...state, scroll: scrollRef, clearLastClick, resetReady, clearScreenshot, onScreenshot };
}
