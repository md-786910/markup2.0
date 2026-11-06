import React, { useState } from 'react';
import { toast } from '../../utils/toast';

export default function TechnicalDetails({ context, pageUrl, deviceMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [copied, setCopied] = useState(false);

  const ctx = context || {};
  const consoleErrors = ctx.consoleErrors || [];
  const failedRequests = ctx.failedRequests || [];
  const hasScreen = !!(ctx.screen && ctx.screen.w != null && ctx.screen.h != null);
  const hasEnv = !!(ctx.browser || ctx.os || hasScreen || ctx.timeZone || ctx.language || pageUrl || deviceMode || ctx.pageTitle || ctx.elementText);
  const totalIssues = consoleErrors.length + failedRequests.length;
  const hasIssues = totalIssues > 0;

  if (!hasEnv && !hasIssues) return null;

  const handleCopyMarkdown = async (e) => {
    if (e) e.stopPropagation();
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Technical details copied to clipboard');
    } catch {
      toast.error('Failed to copy technical details');
    }
  };

  return (
    <div className="border border-slate-200 rounded-md bg-slate-50 overflow-hidden text-caption transition-all">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex h-[34px] items-center justify-between gap-2 px-2.5 text-left font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <svg
            className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-ui font-medium text-slate-900 whitespace-nowrap truncate">
            Technical details
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasIssues && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2 py-0.5 text-caption font-semibold text-rose-700 whitespace-nowrap shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
            </span>
          )}

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center justify-center h-6 w-6 rounded text-slate-500 hover:text-slate-600 hover:bg-gray-200/70 transition-colors"
            title={copied ? "Copied!" : "Copy technical details (Markdown)"}
            aria-label="Copy technical details as Markdown"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 pt-1.5 border-t border-gray-200/70 space-y-2.5 text-slate-600 bg-white">
          <div className="grid grid-cols-2 gap-2 text-caption pt-1">
            {(ctx.browser || ctx.os) && (
              <div className="bg-gray-50/80 p-1.5 rounded border border-gray-100">
                <span className="text-slate-500 block text-overline">Browser / OS</span>
                <span className="font-medium text-slate-900 truncate block" title={`${ctx.browser || 'Unknown'} on ${ctx.os || 'Unknown'}`}>
                  {ctx.browser || 'Unknown'} on {ctx.os || 'Unknown'}
                </span>
              </div>
            )}
            {hasScreen && (
              <div className="bg-gray-50/80 p-1.5 rounded border border-gray-100">
                <span className="text-slate-500 block text-overline">Screen & DPR</span>
                <span className="font-medium text-slate-900 block">
                  {ctx.screen.w}×{ctx.screen.h} @ {ctx.screen.dpr || 1}x
                </span>
              </div>
            )}
            {deviceMode && (
              <div className="bg-gray-50/80 p-1.5 rounded border border-gray-100">
                <span className="text-slate-500 block text-overline">Device Mode</span>
                <span className="font-medium capitalize text-slate-900 block">{deviceMode}</span>
              </div>
            )}
            {(ctx.timeZone || ctx.language) && (
              <div className="bg-gray-50/80 p-1.5 rounded border border-gray-100">
                <span className="text-slate-500 block text-overline">Locale</span>
                <span className="font-medium text-slate-900 truncate block">
                  {[ctx.language, ctx.timeZone].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
          </div>

          {pageUrl && (
            <div className="text-caption bg-gray-50/80 p-1.5 rounded border border-gray-100">
              <span className="text-slate-500 block text-overline">Page URL</span>
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
            <div className="text-caption bg-gray-50/80 p-1.5 rounded border border-gray-100">
              <span className="text-slate-500 block text-overline">Target Element</span>
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-slate-600 block truncate mt-0.5">
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
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowErrors(!showErrors)}
                  className={`flex items-center gap-1.5 font-semibold ${btnColor} text-caption`}
                >
                  <span className="text-[10px]">{showErrors ? '▼' : '▶'}</span>
                  <span>{label}</span>
                </button>
                {showErrors && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 bg-gray-50 p-2 rounded border border-gray-200 text-caption font-mono scrollbar-thin">
                    {consoleErrors.map((err, i) => (
                      <div key={i} className={`p-1.5 rounded text-[11px] ${err.level === 'warn' ? 'bg-amber-50 text-amber-900 border border-amber-200/60' : 'bg-rose-50 text-rose-900 border border-rose-200/60'}`}>
                        <div className="font-bold flex items-center gap-1">
                          {err.level === 'warn' ? '⚠️ WARN' : '🚨 ERROR'}
                        </div>
                        <div className="whitespace-pre-wrap break-all mt-0.5">{err.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {failedRequests.length > 0 && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowRequests(!showRequests)}
                className="flex items-center gap-1.5 font-semibold text-amber-600 hover:text-amber-700 text-caption"
              >
                <span className="text-[10px]">{showRequests ? '▼' : '▶'}</span>
                <span>{failedRequests.length} Failed network request{failedRequests.length > 1 ? 's' : ''}</span>
              </button>
              {showRequests && (
                <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 bg-gray-50 p-2 rounded border border-gray-200 text-caption font-mono scrollbar-thin">
                  {failedRequests.map((req, i) => (
                    <div key={i} className="p-1.5 rounded text-[11px] bg-amber-50 text-amber-900 border border-amber-200/60 break-all">
                      <span className="font-bold uppercase bg-amber-200/70 px-1 rounded text-[10px] mr-1">{req.method}</span>
                      <span className="font-semibold text-rose-600 mr-1">[{req.status || 'FAILED'}]</span>
                      {req.url}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full copy markdown button inside expanded view */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="w-full inline-flex items-center justify-center gap-1.5 h-7 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-caption font-medium text-slate-600 transition-colors shadow-2xs"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-emerald-700 font-semibold">Copied to clipboard!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  <span>Copy details as Markdown</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
