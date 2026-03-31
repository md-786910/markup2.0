import { useRef, useEffect } from 'react';

export default function useScrollReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targets = entry.target.querySelectorAll('[data-reveal]');
            if (targets.length > 0) {
              targets.forEach((el) => el.setAttribute('data-revealed', 'true'));
            } else if (entry.target.hasAttribute('data-reveal')) {
              entry.target.setAttribute('data-revealed', 'true');
            }
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px 0px -50px 0px',
      }
    );

    const revealElements = node.querySelectorAll('[data-reveal]');
    if (revealElements.length > 0) {
      observer.observe(node);
    } else if (node.hasAttribute('data-reveal')) {
      observer.observe(node);
    }

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return ref;
}
