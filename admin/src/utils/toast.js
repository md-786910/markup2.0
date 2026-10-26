// Tiny app-wide toast bus (rendered by components/common/Toaster.js).
//   toast.success('Saved')
//   toast.error('Could not save', { action: { label: 'Retry', onClick } })
//   toastError(err, 'Could not delete the pin')  -> server message or fallback
const listeners = new Set();
let nextId = 1;

function show(type, message, { action, duration } = {}) {
  const item = {
    id: nextId++,
    type,
    message,
    action,
    duration: duration ?? (type === 'error' ? 7000 : 4000),
  };
  listeners.forEach((fn) => fn(item));
  return item.id;
}

export const toast = {
  success: (message, opts) => show('success', message, opts),
  error: (message, opts) => show('error', message, opts),
  info: (message, opts) => show('info', message, opts),
};

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// The server's message when it sent one, else the fallback. Errors already
// shown by the API layer (plan limits, locked workspace) are not repeated.
export function toastError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err || err.__notified || err.name === 'CanceledError') return;
  const serverMessage = err.response?.data?.message;
  const offline = !err.response && err.message === 'Network Error';
  toast.error(offline ? 'You appear to be offline. Check your connection and try again.' : serverMessage || fallback);
}
