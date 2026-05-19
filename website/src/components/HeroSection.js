import React from 'react';
import {
  ArrowRightIcon,
  PlayIcon,
  CheckIcon,
  ShareIcon,
  MonitorIcon,
} from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

function DeviceIcon({ type }) {
  if (type === 'tablet') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (type === 'mobile') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="8" y="2.5" width="8" height="19" rx="2" />
        <circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return <MonitorIcon className="h-4 w-4" />;
}

function CommentPin({ number, className, pulse = false }) {
  return (
    <div className={`absolute ${className}`}>
      <div className={`grid h-9 w-9 place-items-center rounded-full bg-[#3f4cf6] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(63,76,246,0.3)] ${pulse ? 'ring-[14px] ring-[#3f4cf6]/12' : ''}`}>
        {number}
      </div>
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="relative mx-auto mt-8 max-w-7xl px-4 sm:mt-10">
      <div className="absolute inset-x-16 bottom-0 h-40 rounded-full bg-[#7f85ff]/12 blur-3xl" />

      <div className="relative overflow-hidden rounded-[28px] border border-[#d9dfeb] bg-white shadow-[0_40px_120px_rgba(108,118,196,0.18)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#e2e7f0] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="hidden rounded-xl border border-[#d8deea] bg-[#f7f9fc] px-4 py-2 text-sm text-[#7a8395] sm:block">
              <span className="text-[#a0a8b8]">example.app/</span> review/save-the-world
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-2xl border border-[#d8deea] bg-white p-1 sm:flex">
              <button type="button" className="rounded-xl bg-[#f4f6fb] p-2 text-[#687388]">
                <DeviceIcon type="desktop" />
              </button>
              <button type="button" className="rounded-xl p-2 text-[#687388]">
                <DeviceIcon type="tablet" />
              </button>
              <button type="button" className="rounded-xl p-2 text-[#687388]">
                <DeviceIcon type="mobile" />
              </button>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#3f4cf6] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(63,76,246,0.24)]"
            >
              <ShareIcon className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="border-b border-[#e2e7f0] bg-[#fbfcfe] lg:border-b-0 lg:border-r">
            <div className="border-b border-[#e2e7f0] p-4">
              <div className="flex items-center gap-2 rounded-2xl border border-[#d8deea] bg-white px-4 py-3 text-sm text-[#6f788a]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="20" y1="20" x2="16.65" y2="16.65" />
                </svg>
                Search comments
              </div>

              <div className="mt-4 flex gap-6 text-sm">
                <span className="border-b-2 border-[#3f4cf6] pb-2 font-semibold text-[#222a3d]">3 Active</span>
                <span className="pb-2 text-[#7c8494]">12 Resolved</span>
              </div>
            </div>

            <div className="divide-y divide-[#e2e7f0]">
              {[
                { number: 1, name: 'Rebecca W.', text: 'Can we change this to 100%?', time: '10m' },
                { number: 2, name: 'Dani Rojas', text: 'Try a warmer image here?', time: '24m' },
                { number: 3, name: 'Sam Obisi', text: 'Love the new tagline', time: '1h' },
              ].map((item) => (
                <div key={item.number} className="flex items-start gap-4 px-4 py-4">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3f4cf6] text-xs font-semibold text-white">
                    {item.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#222a3d]">{item.name}</p>
                      <span className="text-xs text-[#7c8494]">{item.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#616b7d]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(203,238,192,0.65),transparent_28%),linear-gradient(135deg,#c6dcbc_0%,#b5d1be_35%,#abcdbf_58%,#91b598_100%)] p-8 sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-white/8" />

            <div className="relative max-w-[280px]">
              <h3 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-[#18231f] sm:text-6xl">
                Let&apos;s save
                <br />
                the world,
                <br />
                shall we?
              </h3>
              <p className="mt-5 text-lg leading-8 text-[#385048]/80">
                See how Chlorophyll, Inc. makes sustainability a priority.
              </p>
            </div>

            <CommentPin number={1} className="left-[22%] top-[28%]" />
            <CommentPin number={2} className="left-[63%] top-[48%]" pulse />
            <CommentPin number={3} className="right-[15%] top-[78%]" pulse />

            <div className="absolute right-4 top-24 w-[220px] rounded-[24px] border border-white/70 bg-white/92 p-4 shadow-[0_20px_60px_rgba(47,63,91,0.18)] backdrop-blur sm:right-8 sm:w-[230px]">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#eef0ff] text-xs font-semibold text-[#3f4cf6]">
                  DR
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#222a3d]">Dani Rojas</p>
                  <p className="text-xs text-[#7c8494]">replying...</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#374254]">
                Let&apos;s try a warmer image something more human?
              </p>

              <div className="mt-4 flex items-center justify-between">
                <div className="h-4 w-4 rounded border border-[#b5bfd0]" />
                <button type="button" className="rounded-full bg-[#3f4cf6] px-4 py-1.5 text-sm font-semibold text-white">
                  Send
                </button>
              </div>
            </div>

            <div className="absolute bottom-8 left-10 right-10 grid grid-cols-3 gap-4">
              {[
                { value: '2024', label: 'Carbon neutral' },
                { value: '92%', label: 'Recycled goods' },
                { value: '500k', label: 'Trees planted' },
              ].map((stat) => (
                <div key={stat.value} className="rounded-2xl bg-white/58 p-4 backdrop-blur">
                  <p className="font-display text-2xl font-bold text-[#222a3d]">{stat.value}</p>
                  <p className="mt-1 text-sm text-[#677284]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(219,242,196,0.5),transparent_18%),radial-gradient(circle_at_center,rgba(210,212,255,0.5),transparent_36%),linear-gradient(180deg,#fbfcff_0%,#f7f8fd_100%)] pb-10 pt-14 sm:pb-16 sm:pt-10">
      <div className="pointer-events-none absolute inset-0 dot-pattern opacity-20" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7dcef] bg-white/80 px-4 py-1.5 text-xs text-[#596274] shadow-sm backdrop-blur">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#eef0ff] text-[#3f4cf6]">
              <CheckIcon className="h-3 w-3" />
            </span>
            New — realtime cursors & instant video comments
            <ArrowRightIcon className="h-3.5 w-3.5 text-[#7b8497]" />
          </div>

          <h1 className="mt-6 font-display text-3xl font-extrabold leading-[0.96] tracking-tight text-[#121829] sm:text-4xl md:text-5xl lg:text-[3.75rem]">
            Visual feedback for your
            <br />
            <span className="relative inline-block text-[#3f4cf6]">
              websites
              <span className="absolute bottom-1 left-0 right-0 -z-10 h-4 rounded-md bg-[#d7ff7d] sm:h-5" />
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-500 mt-5 max-w-3xl mx-auto leading-relaxed">
            Pin comments directly on live pages. Collaborate with your team in real-time with contextual annotations. No more back-and-forth emails or confusing screenshots. Get everyone on the same page, literally.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={`${APP_URL}/onboarding`}
              className="inline-flex items-center gap-2 rounded-full bg-[#3f4cf6] px-8 py-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(63,76,246,0.28)] transition-transform hover:-translate-y-px"
            >
              Try it for free
              <ArrowRightIcon className="h-5 w-5" />
            </a>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-3 rounded-full border border-[#d8deea] bg-white/75 px-7 py-4 text-sm font-medium text-[#3b4457] shadow-sm backdrop-blur"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#eef0ff] text-[#3f4cf6]">
                <PlayIcon className="h-3.5 w-3.5" />
              </span>
              Watch the 60-second demo
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-[#6b7384]">
            <div className="flex -space-x-2">
              {['RW', 'DF', 'SC', 'MK'].map((name) => (
                <span
                  key={name}
                  className="grid h-6 w-6 place-items-center rounded-full border border-white bg-[#eef0ff] text-[10px] font-semibold text-[#3f4cf6]"
                >
                  {name}
                </span>
              ))}
            </div>
            <span>Trusted by 200,000+ teams worldwide</span>
          </div>
        </div>

        <ProductMockup />
      </div>
    </section>
  );
}
