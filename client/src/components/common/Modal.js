import React, { useEffect, useId, useRef } from 'react';
import { IconButton } from '../kc';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
};

// Centered dialog. Closes on Escape and backdrop click, moves focus into the
// panel and gives it back on close. With `title` it renders the header and a
// padded body; without, `children` is the whole panel (e.g. ConfirmHost).
export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', className, labelledBy }) {
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
      className="kc-modal-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : labelledBy}
        tabIndex={-1}
        className={`kc-modal w-full ${className || SIZE_CLASSES[size] || SIZE_CLASSES.md} outline-none`}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'visible',
        }}
      >
        {title ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <h3 id={titleId} style={{ margin: 0, font: '600 16px/22px var(--font-sans)', color: 'var(--text)' }}>
                {title}
              </h3>
              <IconButton icon="x" label="Close" onClick={onClose} size="sm" />
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
            {footer ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--slate-50)',
                }}
              >
                {footer}
              </div>
            ) : null}
          </>
        ) : children}
      </div>
    </div>
  );
}
