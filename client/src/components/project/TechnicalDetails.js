import React, { useState } from 'react';
import { toast } from '../../utils/toast';

export default function TechnicalDetails({ context, pageUrl, deviceMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  const ctx = context || {};
  const consoleErrors = ctx.consoleErrors || [];
  const failedRequests = ctx.failedRequests || [];
  const hasScreen = !!(ctx.screen && ctx.screen.w != null && ctx.screen.h != null);
  const hasEnv = !!(ctx.browser || ctx.os || hasScreen || ctx.timeZone || ctx.language || pageUrl || deviceMode || ctx.pageTitle || ctx.elementText);
  const hasIssues = consoleErrors.length > 0 || failedRequests.length > 0;

  if (!hasEnv && !hasIssues) return null;

  const handleCopyMarkdown = async (e) => {
    e.stopPropagation();
    const lines = ['### Technical Reproduction Details'];
    if (ctx.browser || ctx.os) lines.push(`- **Environment:** ${ctx.browser || 'Unknown'} on ${ctx.os || 'Unknown'}`);
    if (hasScreen) lines.push(`- **Screen:** ${ctx.screen.w}x${ctx.screen.h} (DPR: ${ctx.screen.dpr || 1})`);
    if (deviceMode) lines.push(`- **Device Mode:** ${deviceMode}`);
    if (pageUrl) lines.push(`- **Page URL:** ${pageUrl}`);
    if (ctx.pageTitle) lines.push(`- **Page Title:** ${ctx.pageTitle}`);
    if (ctx.elementText) {
      const cleanElementText = String(ctx.elementText).replace(/[\r\n]+/g, ' ').replace(/`/g, "'").trim();
      if (cleanElementText) lines.push(`- **Element Target:** \`${cleanElementText}\``);
    }
    if (ctx.timeZone) lines.push(`- **Time Zone:** ${ctx.timeZone}`);
    if (ctx.language) lines.push(`- **Language:** ${ctx.language}`);

    if (consoleErrors.length > 0) {
      lines.push('\n#### Console Errors & Warnings');
      consoleErrors.forEach((err, idx) => {
        lines.push(`${idx + 1}. [${(err.level || 'error').toUpperCase()}] ${err.message}`);
      });
    }

    if (failedRequests.length > 0) {
      lines.push('\n#### Failed Network Requests');
      failedRequests.forEach((req, idx) => {
        lines.push(`${idx + 1}. ${req.method} ${req.url} (Status: ${req.status || 'FAILED'})`);
      });
    }

    const markdownText = lines.join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(markdownText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = markdownText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Technical details copied to clipboard');
    } catch {
      toast.error('Failed to copy technical details');
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/60 overflow-hidden text-xs my-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-left font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Technical Details
          {(consoleErrors.length > 0 || failedRequests.length > 0) && (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
              {consoleErrors.length + failedRequests.length} issues
            </span>
          )}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleCopyMarkdown}
          className="text-primary hover:text-primary-dark underline text-[11px] font-normal"
        >
          Copy Markdown
        </span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2 text-gray-600">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {(ctx.browser || ctx.os) && (
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Browser / OS</span>
                <span className="font-medium text-gray-800">{ctx.browser || 'Unknown'} on {ctx.os || 'Unknown'}</span>
              </div>
            )}
            {hasScreen && (
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Screen & DPR</span>
                <span className="font-medium text-gray-800">{ctx.screen.w}×{ctx.screen.h} @ {ctx.screen.dpr || 1}x</span>
              </div>
            )}
            {deviceMode && (
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Device Mode</span>
                <span className="font-medium capitalize text-gray-800">{deviceMode}</span>
              </div>
            )}
            {(ctx.timeZone || ctx.language) && (
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Locale</span>
                <span className="font-medium text-gray-800">{[ctx.language, ctx.timeZone].filter(Boolean).join(' · ')}</span>
              </div>
            )}
          </div>

          {pageUrl && (
            <div className="text-[11px]">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Page URL</span>
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all truncate block"
              >
                {pageUrl}
              </a>
            </div>
          )}

          {ctx.elementText && (
            <div className="text-[11px]">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Clicked Element</span>
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-700 block truncate">
                {ctx.elementText}
              </span>
            </div>
          )}

          {consoleErrors.length > 0 && (() => {
            const hasErrors = consoleErrors.some((e) => e.level !== 'warn');
            const label = hasErrors
              ? `${consoleErrors.length} Console error${consoleErrors.length > 1 ? 's' : ''}`
              : `${consoleErrors.length} Console warning${consoleErrors.length > 1 ? 's' : ''}`;
            const btnColor = hasErrors ? 'text-rose-600 hover:text-rose-700' : 'text-amber-700 hover:text-amber-800';
            return (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowErrors(!showErrors)}
                  className={`flex items-center gap-1 font-semibold ${btnColor} text-[11px]`}
                >
                  <span>{showErrors ? '▼' : '▶'}</span>
                  <span>{label}</span>
                </button>
                {showErrors && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded border border-gray-200 text-[10px] font-mono">
                    {consoleErrors.map((err, i) => (
                      <div key={i} className={`p-1 rounded ${err.level === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'}`}>
                        <div className="font-semibold">{err.level === 'warn' ? '⚠️ WARN' : '🚨 ERROR'}</div>
                        <div className="whitespace-pre-wrap break-all">{err.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {failedRequests.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRequests(!showRequests)}
                className="flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 text-[11px]"
              >
                <span>{showRequests ? '▼' : '▶'}</span>
                <span>{failedRequests.length} Failed network request{failedRequests.length > 1 ? 's' : ''}</span>
              </button>
              {showRequests && (
                <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded border border-gray-200 text-[10px] font-mono">
                  {failedRequests.map((req, i) => (
                    <div key={i} className="p-1 rounded bg-amber-50 text-amber-800">
                      <span className="font-bold">{req.method}</span> <span className="font-semibold text-rose-600">[{req.status || 'FAILED'}]</span> {req.url}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

