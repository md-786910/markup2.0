// Live chat (Crisp); same module as website/src/utils/supportChat.js.
// Off unless REACT_APP_CRISP_WEBSITE_ID is set at build time. Nothing
// third-party loads until someone opens the chat from one of our buttons;
// Crisp's own bubble stays hidden so ours is the only launcher.
const WEBSITE_ID = process.env.REACT_APP_CRISP_WEBSITE_ID || '';
const SCRIPT_URL = 'https://client.crisp.chat/l.js';

export const chatAvailable = Boolean(WEBSITE_ID);
export const CHAT_CLOSED_EVENT = 'kommently:chat-closed';

let loading = null;

function queue(...command) {
  window.$crisp = window.$crisp || [];
  window.$crisp.push(command);
}

function load() {
  if (loading) return loading;
  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = WEBSITE_ID;
  // Hide Crisp's launcher whenever the chat window closes, and tell our
  // launcher buttons (they hide while the chat is open)
  queue('on', 'chat:closed', () => {
    queue('do', 'chat:hide');
    window.dispatchEvent(new Event(CHAT_CLOSED_EVENT));
  });
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      loading = null;
      reject(new Error('Chat could not be loaded'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Opens the chat. Optional visitor details help support answer faster:
 * { email, name, data: { plan: 'pro', organization: 'Acme' } }.
 * Returns false when chat isn't configured (callers fall back to email).
 */
export async function openChat({ email, name, data } = {}) {
  if (!WEBSITE_ID) return false;
  if (email) queue('set', 'user:email', [email]);
  if (name) queue('set', 'user:nickname', [name]);
  if (data) queue('set', 'session:data', [Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])]);
  queue('do', 'chat:show');
  queue('do', 'chat:open');
  await load();
  return true;
}
