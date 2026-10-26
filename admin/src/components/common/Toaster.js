import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToasts } from '../../utils/toast';

const ACCENT = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-600',
};

const ICON = {
  success: 'M5 13l4 4L19 7',
  error: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const ICON_COLOR = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-blue-600',
};

// Bottom-right stack of toasts published through utils/toast.js
export default function Toaster() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => subscribeToasts((item) => {
    setItems((list) => [...list.filter((x) => x.message !== item.message), item].slice(-4));
    if (item.duration > 0) {
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== item.id)), item.duration);
    }
  }), []);

  const dismiss = (id) => setItems((list) => list.filter((x) => x.id !== id));

  if (!items.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100000] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.type === 'error' ? 'alert' : 'status'}
          className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-3 shadow-lg"
        >
          <span className={`absolute inset-y-0 left-0 w-1 ${ACCENT[item.type]}`} />
          <svg className={`mt-0.5 h-4 w-4 flex-none ${ICON_COLOR[item.type]}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={ICON[item.type]} />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-800">{item.message}</p>
            {item.action ? (
              <button
                type="button"
                onClick={() => {
                  dismiss(item.id);
                  if (item.action.to) navigate(item.action.to);
                  else if (item.action.onClick) item.action.onClick();
                }}
                className="mt-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Dismiss"
            className="rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
