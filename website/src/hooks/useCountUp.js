import { useRef, useState, useEffect } from 'react';

export default function useCountUp({ end, duration = 2000, suffix = '', decimals = 0 }) {
  const ref = useRef(null);
  const [value, setValue] = useState('0' + suffix);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            observer.unobserve(entry.target);

            const startTime = performance.now();
            const animate = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const raw = eased * end;
              const current = decimals > 0 ? Number(raw.toFixed(decimals)) : Math.round(raw);
              setValue(current.toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              }) + suffix);

              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };
            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [decimals, end, duration, suffix]);

  return { ref, value };
}
