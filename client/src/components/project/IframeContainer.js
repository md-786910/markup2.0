import React, { useRef, useEffect } from 'react';

export default function IframeContainer({ proxyUrl, pinMode, pins, selectedPinId, loading, onLoad }) {
  const iframeRef = useRef(null);

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
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        src={proxyUrl}
        title="Website Preview"
        className="w-full h-full border-0"
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
