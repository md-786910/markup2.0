import React, { useEffect, useId, useRef } from 'react';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

// Centered dialog. Closes on Escape and backdrop click, moves focus into the
// panel and gives it back on close. With `title` it renders the header and a
// padded body; without, `children` is the whole panel (e.g. ConfirmHost).
export default function Modal({ isOpen, onClose, title, children, size = '2xl', className, labelledBy }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : labelledBy}
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-xl w-full ${className || SIZE_CLASSES[size] || SIZE_CLASSES['2xl']} mx-4 outline-none animate-scale-in`}
      >
        {title ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">{children}</div>
          </>
        ) : children}
      </div>
    </div>
  );
}
