import { useState, useEffect, useCallback } from "react";

const INITIAL_STATE = {
  scrollX: 0,
  scrollY: 0,
  documentWidth: 0,
  documentHeight: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  ready: false,
  lastClick: null,
  currentPageUrl: null,
};

export function useIframeMessages() {
  const [state, setState] = useState(INITIAL_STATE);

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
            documentWidth: data.documentWidth,
            documentHeight: data.documentHeight,
            currentPageUrl: data.pageUrl || prev.currentPageUrl,
          }));
          break;
        case "MARKUP_SCROLL":
          setState((prev) => ({
            ...prev,
            scrollX: data.scrollX,
            scrollY: data.scrollY,
            documentWidth: data.documentWidth,
            documentHeight: data.documentHeight,
            viewportWidth: data.viewportWidth,
            viewportHeight: data.viewportHeight,
          }));
          break;
        case "MARKUP_CLICK":
          setState((prev) => ({
            ...prev,
            lastClick: {
              xPercent: data.xPercent,
              yPercent: data.yPercent,
              pageUrl: data.pageUrl,
              selector: data.selector || null,
              elementOffsetX: data.elementOffsetX != null ? data.elementOffsetX : null,
              elementOffsetY: data.elementOffsetY != null ? data.elementOffsetY : null,
            },
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

  return { ...state, clearLastClick, resetReady };
}
