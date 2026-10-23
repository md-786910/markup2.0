// In-app replacement for window.confirm (rendered by components/common/ConfirmHost.js).
//   if (!(await confirmDialog({ title: 'Delete version?', confirmLabel: 'Delete', danger: true }))) return;
let host = null;

export function registerConfirmHost(fn) {
  host = fn;
  return () => {
    if (host === fn) host = null;
  };
}

export function confirmDialog({ title, message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  if (!host) return Promise.resolve(window.confirm([title, message].filter(Boolean).join('\n\n')));
  return new Promise((resolve) => host({ title, message, confirmLabel, cancelLabel, danger, resolve }));
}
