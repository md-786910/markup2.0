import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './site';

function PreferenceToggle({ title, description, checked, disabled, onChange, first }) {
  return (
    <div
      className="flex items-start justify-between gap-4"
      style={{ padding: '14px 0', borderTop: first ? 0 : '1px solid var(--border)' }}
    >
      <div className="kc-field min-w-0" style={{ gap: 2 }}>
        <span className="lbl" style={{ color: 'var(--text)' }}>{title}</span>
        <span className="hint">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        aria-label={title}
        disabled={disabled}
        onClick={onChange}
        className="kc-toggle"
        style={{ marginTop: 2, ...(disabled ? { cursor: 'not-allowed', opacity: 0.6 } : null) }}
      >
        <span className="track" />
      </button>
    </div>
  );
}

export default function CookiePreferencesModal({
  open,
  preferences,
  onClose,
  onSave,
  onAcceptAll,
  onRejectAll,
  onToggle,
}) {
  if (!open) return null;
  return (
    <div className="kc">
      <div
        className="fixed inset-0 z-[90]"
        style={{ background: 'var(--scrim)' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-preferences-title"
        className="fixed inset-x-4 top-[12vh] z-[100] mx-auto max-w-lg"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div className="flex items-start justify-between gap-4" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 id="cookie-preferences-title" className="km-h3" style={{ color: 'var(--text)' }}>Cookie settings</h2>
            <p className="km-note" style={{ margin: '4px 0 0' }}>Essential cookies are always on. The rest are your choice.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close cookie settings" className="kc-icb">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ padding: '4px 24px' }}>
          <PreferenceToggle
            first
            title="Essential cookies"
            description="Security, navigation and remembering this choice."
            checked
            disabled
          />
          <PreferenceToggle
            title="Analytics cookies"
            description="Anonymous usage statistics (Google Analytics) to improve the site."
            checked={preferences.analytics}
            onChange={() => onToggle('analytics')}
          />
          <PreferenceToggle
            title="Preference cookies"
            description="Remember interface choices between visits."
            checked={preferences.preferences}
            onChange={() => onToggle('preferences')}
          />
          <PreferenceToggle
            title="Marketing cookies"
            description="Measure which campaigns bring visitors."
            checked={preferences.marketing}
            onChange={() => onToggle('marketing')}
          />
        </div>

        <div className="flex items-center justify-between gap-3" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <Link to="/cookie-policy" onClick={onClose} className="kc-link" style={{ color: 'var(--text-secondary)' }}>Cookie policy</Link>
          <div className="flex gap-2">
            <button type="button" onClick={onRejectAll} className="kc-btn sec">
              Reject all
            </button>
            <button type="button" onClick={onSave} className="kc-btn pri">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
