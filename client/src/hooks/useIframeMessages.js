import { useState, useEffect, useCallback, useRef } from "react";

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
    lastClick: null,
    currentPageUrl: null,
    screenshot: null,
  });

  useEffect(() => {
    const handler = (event) => {
      const data = event.data;
      if (
        !data ||
        typeof data.type !== "string" ||
        !data.type.startsWith("MARKUP_")
      )
        return;

      switch (data.type) {
        case "MARKUP_READY":
          setState((prev) => ({
            ...prev,
            ready: true,
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
            lastClick: {
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
            },
          }));
          break;
        case "MARKUP_SCREENSHOT":
          setState((prev) => ({
            ...prev,
            screenshot: data.screenshot,
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
    setState((prev) => ({ ...prev, screenshot: null }));
  }, []);

  return { ...state, scroll: scrollRef, clearLastClick, resetReady, clearScreenshot };
}
