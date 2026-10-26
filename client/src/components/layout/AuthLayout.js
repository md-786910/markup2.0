import React from 'react';
import BrandMark from '../common/BrandMark';

const POINTS = [
  'Pin comments on live sites, PDFs, and images',
  'Clients review with a link, no account needed',
  'Slack, Jira, Discord, and Microsoft Teams',
];

// A small product illustration: a page with two pins and an open comment
function ReviewIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[380px]" aria-hidden="true">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="ml-3 h-4 flex-1 rounded bg-white/[0.06]" />
        </div>
        <div className="space-y-3 p-5">
          <div className="h-3 w-2/3 rounded bg-white/25" />
          <div className="h-2 w-5/6 rounded bg-white/10" />
          <div className="h-2 w-3/4 rounded bg-white/10" />
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="h-14 rounded-lg bg-white/[0.07]" />
            <div className="h-14 rounded-lg bg-white/[0.07]" />
            <div className="h-14 rounded-lg bg-white/[0.07]" />
          </div>
          <div className="h-2 w-1/2 rounded bg-white/10" />
        </div>
      </div>
      {/* Pins */}
      <span className="absolute left-[54%] top-[34%] flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white ring-2 ring-white shadow-lg">1</span>
      <span className="absolute left-[16%] top-[66%] flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white ring-2 ring-white shadow-lg">2</span>
      {/* Comment */}
      <div className="absolute -right-6 top-[44%] w-52 rounded-xl bg-white p-3 text-left shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">M</span>
          <span className="text-[11px] font-semibold text-gray-900">Maya</span>
          <span className="text-[10px] text-gray-400">just now</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-gray-600">Can we make this headline one line on desktop?</p>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex animate-page-enter">
      {/* Left branded panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-gray-950 relative overflow-hidden">
        {/* Dot grid, fading out toward the bottom, and a soft brand glow */}
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/30 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-blue-500/15 blur-[120px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
          <div className="flex items-center gap-2.5">
            <BrandMark className="w-9 h-9" />
            <span className="text-xl font-display font-bold tracking-[-0.03em]">Kommently</span>
          </div>

          <div>
            <h1 className="text-[34px] xl:text-[40px] font-bold leading-[1.1] tracking-tight">
              Feedback on any website.
              <span className="block text-blue-400">No install needed.</span>
            </h1>
            <ul className="mt-7 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3 text-[15px] text-gray-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-12 pr-6">
              <ReviewIllustration />
            </div>
          </div>

          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Kommently</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <BrandMark className="w-8 h-8" />
            <span className="text-xl font-display font-bold tracking-[-0.03em] text-gray-900">Kommently</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
