import React, { useRef, useEffect, useState } from 'react';

const FIXED_WIDTH = 1440;

export default function IframeContainer({ proxyUrl, pinMode, pins, selectedPinId, loading, onLoad }) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: FIXED_WIDTH, height: 900 });

  // Track container size and compute scale factor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setScaleFactor(width / FIXED_WIDTH);
        setContainerSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
      const pinData = pins.map((pin) => ({
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
  }, [pins, selectedPinId]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        title="Website Preview"
        style={{
          width: `${FIXED_WIDTH}px`,
          height: `${containerSize.height / scaleFactor}px`,
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left',
          border: 'none',
        }}
        sandbox="allow-scripts allow-same-origin allow-forms"
        onLoad={onLoad}
      />
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-medium text-gray-500">Loading site...</p>
        </div>
      )}
    </div>
  );
}
