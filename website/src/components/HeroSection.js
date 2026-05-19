import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CheckIcon, PlayIcon, ShareIcon, MonitorIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

const METRICS = [
  { value: '42%', label: 'faster review cycles' },
  { value: '8.4k', label: 'pins resolved weekly' },
  { value: '99.9%', label: 'review uptime' },
];

function ProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-10 max-w-7xl px-4 sm:mt-14"
    >
      <div className="absolute inset-x-8 bottom-0 h-40 rounded-full bg-[#2854ff]/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_40px_110px_rgba(50,65,120,0.16)] sm:rounded-[32px]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="hidden min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 sm:block">
              <span className="text-slate-400">review.markly.app/</span> launch-v4
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 md:flex">
              <button type="button" aria-label="Desktop preview" className="rounded-xl bg-slate-100 p-2 text-slate-600">
                <MonitorIcon className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Tablet preview" className="rounded-xl p-2 text-slate-500">
                <MonitorIcon className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-[#2854ff] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(40,84,255,0.22)] sm:px-4">
              <ShareIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/80 lg:border-b-0 lg:border-r">
            <div className="p-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Search comments
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-full bg-[#2854ff] px-3 py-2 text-center font-semibold text-white">Active 12</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-center font-semibold text-slate-500">Done 38</span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {[
                { number: 1, name: 'Rebecca W.', text: 'CTA needs stronger contrast', time: '8m' },
                { number: 2, name: 'Dani Rojas', text: 'Can we tighten this card grid?', time: '18m' },
                { number: 3, name: 'Sam Obisi', text: 'Approved for staging', time: '1h' },
              ].map((item) => (
                <div key={item.number} className="flex items-start gap-3 px-4 py-4">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#2854ff] text-xs font-semibold text-white">
                    {item.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                      <span className="text-xs text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#d8f0ce_0%,#c7e5e4_42%,#dbe5ff_100%)] p-5 sm:p-8 lg:p-10">
            <div className="absolute inset-0 dot-pattern opacity-30" />
            <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/72 p-5 shadow-[0_24px_70px_rgba(47,63,91,0.14)] backdrop-blur sm:p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-lg">
                  <p className="text-sm font-semibold uppercase text-teal-700">Client homepage</p>
                  <h3 className="mt-3 font-display text-4xl font-extrabold leading-none tracking-tight text-slate-950 sm:text-5xl">
                    Launch review,
                    <span className="block text-[#2854ff]">without the noise.</span>
                  </h3>
                  <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
                    Every comment keeps the URL, viewport, screenshot, and thread history attached.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {METRICS.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-white/80 bg-white/70 p-3 text-left backdrop-blur sm:p-4">
                      <p className="font-display text-xl font-bold text-slate-950 sm:text-2xl">{metric.value}</p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute left-[18%] top-[36%] grid h-9 w-9 place-items-center rounded-full bg-[#2854ff] text-sm font-bold text-white shadow-[0_12px_26px_rgba(40,84,255,0.28)] ring-[14px] ring-[#2854ff]/10">1</div>
            <div className="absolute right-[18%] top-[43%] grid h-9 w-9 place-items-center rounded-full bg-[#0f766e] text-sm font-bold text-white shadow-[0_12px_26px_rgba(15,118,110,0.24)] ring-[14px] ring-[#0f766e]/10">2</div>
            <div className="absolute bottom-8 right-5 w-[min(250px,calc(100%-40px))] rounded-[22px] border border-white/80 bg-white/95 p-4 shadow-[0_24px_70px_rgba(47,63,91,0.16)] backdrop-blur sm:right-8">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#eef2ff] text-xs font-bold text-[#2854ff]">DR</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Dani Rojas</p>
                  <p className="text-xs text-slate-400">replying live</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">Let's ship the tighter layout. The mobile spacing is ready.</p>
              <div className="mt-4 flex justify-end">
                <button type="button" className="rounded-full bg-[#2854ff] px-4 py-1.5 text-sm font-semibold text-white">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-12 pt-12 sm:pb-18 sm:pt-10">
      <div className="pointer-events-none absolute inset-0 dot-pattern opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_50%_0%,rgba(40,84,255,0.12),transparent_52%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-5xl text-center"
        >
          <div className="eyebrow">
            <CheckIcon className="mr-2 h-3.5 w-3.5 text-[#0f766e]" />
            Realtime visual review for product teams
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.98] tracking-tight text-slate-950 sm:text-5xl md:text-6xl lg:text-[4.8rem]">
            Visual feedback that
            <span className="block text-gradient">turns reviews into releases.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
            Pin comments on live pages, PDFs, and launch assets. Markly keeps teams, clients, and developers aligned with precise context, realtime threads, and controlled guest links.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`${APP_URL}/onboarding`} className="button-primary px-8 py-4">
              Start free
              <ArrowRightIcon className="h-5 w-5" />
            </a>
            <a href="#how-it-works" className="button-secondary px-8 py-4">
              <PlayIcon className="h-5 w-5 text-[#2854ff]" />
              Watch workflow
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
            {['No credit card', 'Guest reviews', 'Slack, Jira, Discord'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-[#0f766e]" />
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        <ProductMockup />
      </div>
    </section>
  );
}
