// Opens the Help & support panel from anywhere (top bar, sidebar menu,
// notifications, the ?support=<id> email link). The panel listens in
// components/support/SupportPanel.js.
export const OPEN_SUPPORT_EVENT = 'kommently:open-support';

export const SUPPORT_EMAIL = 'hello@kommently.app';

// view: 'home' | 'new'; ticketId opens that request
export function openSupport({ view = 'home', ticketId = null } = {}) {
  window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT, { detail: { view, ticketId } }));
}
