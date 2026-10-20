import React from 'react';
import { Sentry } from '../../monitoring/sentry';

function ErrorFallback({ resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">
          An unexpected error occurred. Our team has been notified. Please try again.
        </p>
        <button
          onClick={() => { resetError(); window.location.reload(); }}
          className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

// Top-level boundary: a render crash shows a recovery screen instead of a blank
// page, and is reported to Sentry when configured.
export default function AppErrorBoundary({ children }) {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
