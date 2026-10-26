import React, { useEffect, useRef, useState } from "react";

const IFRAME_WIDTH = 1440;
const IFRAME_HEIGHT = 900;

// Live preview of a website: the proxied page at 1440×900, scaled to the box
export default function SiteThumbnail({ src, title }) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const computeScale = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / IFRAME_WIDTH);
    };
    computeScale();
    const observer = new ResizeObserver(computeScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 bg-white"
      style={{ overflow: "hidden" }}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms"
        style={{
          width: `${IFRAME_WIDTH}px`,
          height: `${IFRAME_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: "none",
          pointerEvents: "none",
          background: "white",
        }}
      />
    </div>
  );
}
