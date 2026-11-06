import React, { useEffect, useState } from 'react';
import { chatAvailable, openChat, CHAT_CLOSED_EVENT } from '../utils/supportChat';
import { Icon } from './site';

// Floating "Chat with us" button (only when live chat is configured). Loads
// the chat on click; hidden while the chat or the cookie banner is open.
export default function ChatLauncher({ hidden = false }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onClosed = () => setOpen(false);
    window.addEventListener(CHAT_CLOSED_EVENT, onClosed);
    return () => window.removeEventListener(CHAT_CLOSED_EVENT, onClosed);
  }, []);

  if (!chatAvailable || hidden || open) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      await openChat();
      setOpen(true);
    } catch {
      window.location.href = '/support#contact';
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kc">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={loading ? 'Opening chat' : 'Chat with us'}
        title="Chat with us"
        className="kc-btn pri"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 70,
          width: 52,
          height: 52,
          padding: 0,
          borderRadius: '50%',
          boxShadow: 'var(--shadow-menu)',
          opacity: loading ? 0.8 : 1,
        }}
      >
        <Icon name="chat" size={22} stroke={1.8} />
      </button>
    </div>
  );
}
