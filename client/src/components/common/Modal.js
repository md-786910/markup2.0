import React, { useEffect, useId, useRef } from 'react';
import { IconButton } from '../kc';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

// Centered dialog. Closes on Escape and backdrop click, moves focus into the
// panel and gives it back on close. With `title` it renders the header and a
// padded body; without, `children` is the whole panel (e.g. ConfirmHost).
export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', className, labelledBy }) {
  const panelRef = useRef(null);
  const titleId = useId();
  // Latest onClose without re-running the focus effect: parents often pass a
  // new function on every render, which used to move focus out of the dialog
  // (and back) while someone was typing in it.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onCloseRef.current?.();
        return;
      }
      // Keep Tab inside the dialog (only when focus is in this panel, so menus
      // rendered elsewhere and dialogs stacked on top keep their own keys)
      const panel = panelRef.current;
      if (e.key !== 'Tab' || !panel || !panel.contains(document.activeElement)) return;
      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [isOpen]);

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
