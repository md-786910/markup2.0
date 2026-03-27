import React, { useRef, useEffect, useState } from 'react';

const DESKTOP_WIDTH = 1440;

export default function IframeContainer({ proxyUrl, targetUrl, pinMode, pins, selectedPinId, loading, hidePins, onLoad, viewportWidth = DESKTOP_WIDTH }) {
  const isDesktop = viewportWidth >= DESKTOP_WIDTH;
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: viewportWidth, height: 900 });
  const prevTargetUrl = useRef(targetUrl);

  // Track container size and compute scale factor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        const rawScale = width / viewportWidth;
        setScaleFactor(isDesktop ? rawScale : Math.min(rawScale, 1));
        setContainerSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [viewportWidth]);

  // Recompute scale when viewportWidth changes
  useEffect(() => {
    if (containerSize.width) {
      const rawScale = containerSize.width / viewportWidth;
      setScaleFactor(isDesktop ? rawScale : Math.min(rawScale, 1));
    }
  }, [viewportWidth, containerSize.width, isDesktop]);

  // Navigate within iframe via postMessage when targetUrl changes (avoids full remount)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !targetUrl) return;
    // Skip the initial render — the iframe src already handles the first load
    if (prevTargetUrl.current === targetUrl) return;
    prevTargetUrl.current = targetUrl;
    try {
      iframe.contentWindow.postMessage(
        { type: 'MARKUP_NAVIGATE', url: targetUrl },
        '*'
      );
    } catch {
      // If postMessage fails (cross-origin), fall back to setting src directly
      // This shouldn't happen since iframe is same-origin (proxy), but just in case
    }
  }, [targetUrl]);

  // Send pin mode state to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendPinMode = () => {
      iframe.contentWindow.postMessage(
        { type: 'MARKUP_PIN_MODE', enabled: pinMode },
        '*'
      );
    };

    // Send immediately and also when iframe loads
    sendPinMode();
    iframe.addEventListener('load', sendPinMode);
    return () => iframe.removeEventListener('load', sendPinMode);
  }, [pinMode]);

  // Send pins to iframe for rendering
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendPins = () => {
      const pinData = hidePins ? [] : pins.map((pin) => ({
        id: pin._id,
        xPercent: pin.xPercent,
        yPercent: pin.yPercent,
        selector: pin.selector || null,
        elementOffsetX: pin.elementOffsetX != null ? pin.elementOffsetX : null,
        elementOffsetY: pin.elementOffsetY != null ? pin.elementOffsetY : null,
        status: pin.status,
        pinNumber: pin.pinNumber,
        documentWidth: pin.documentWidth || null,
        documentHeight: pin.documentHeight || null,
        selected: pin._id === selectedPinId,
      }));
      iframe.contentWindow.postMessage(
        { type: 'MARKUP_UPDATE_PINS', pins: pinData },
        '*'
      );
    };

    sendPins();
    iframe.addEventListener('load', sendPins);
    return () => iframe.removeEventListener('load', sendPins);
  }, [pins, selectedPinId, hidePins]);

  // Center the iframe when it's narrower than the container (tablet/mobile only)
  const iframeScaledWidth = viewportWidth * scaleFactor;
  const offsetX = !isDesktop && iframeScaledWidth < containerSize.width ? (containerSize.width - iframeScaledWidth) / 2 : 0;

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${isDesktop ? '' : 'bg-gray-100'}`}>
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        title="Website Preview"
        className="transition-opacity duration-300 ease-out"
        style={{
          width: `${viewportWidth}px`,
          height: `${containerSize.height / scaleFactor}px`,
          transform: `translateX(${offsetX}px) scale(${scaleFactor})`,
          transformOrigin: 'top left',
          border: 'none',
          opacity: loading ? 0 : 1,
        }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        onLoad={onLoad}
      />
      <div
        className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity duration-300 ease-out"
        style={{ opacity: loading ? 1 : 0, pointerEvents: loading ? 'auto' : 'none' }}
      >
        <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-gray-500">Loading site...</p>
      </div>
    </div>
  );
}
