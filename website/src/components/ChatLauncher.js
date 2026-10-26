import React, { useEffect, useState } from 'react';
import { chatAvailable, openChat, CHAT_CLOSED_EVENT } from '../utils/supportChat';

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
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label="Chat with us"
      className="fixed bottom-5 right-5 z-[70] inline-flex h-12 items-center gap-2 rounded-full bg-[#003dff] px-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#0031d1] disabled:opacity-80"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6l2.6-2.6A2 2 0 018 17h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
      </svg>
      <span className="hidden sm:inline">{loading ? 'Opening…' : 'Chat with us'}</span>
    </button>
  );
}
