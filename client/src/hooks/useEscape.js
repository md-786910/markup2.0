import { useEffect, useRef } from 'react';

// Calls onEscape when Escape is pressed while `active` (modals, popovers)
export default function useEscape(onEscape, active = true) {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      // Skip keys another widget already handled (e.g. closing an @mention list)
      if (e.key === 'Escape' && !e.defaultPrevented) handler.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}
