import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CheckIcon, PlayIcon, ShareIcon, MonitorIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

const METRICS = [
  { value: '42%', label: 'faster review cycles' },
  { value: '8.4k', label: 'pins resolved weekly' },
  { value: '99.9%', label: 'review uptime' },
];
// TODO
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
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#fbfbfd] px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#3f4cf6]" />
            </div>
            <p className="hidden truncate text-sm font-semibold text-slate-900 sm:block">Leanport site</p>
            <div className="hidden min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 md:block">
              <span className="text-slate-400">https://leanport.com/</span>content-marketing/
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
              <button type="button" aria-label="Mobile preview" className="rounded-xl p-2 text-slate-500">
                <MonitorIcon className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="hidden rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 lg:inline-flex">
              View
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-[#2854ff] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(40,84,255,0.22)] sm:px-4">
              Comment
            </button>
            <button type="button" className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 lg:inline-flex">
              <ShareIcon className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="grid min-h-[600px] grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-[#f7f8fb] xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
                <span className="border-b-2 border-[#2854ff] pb-2 text-[#2854ff]">Feedback</span>
                <span>Activity</span>
                <span>Versions</span>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="font-semibold text-slate-900">4 Active</span>
                <span className="text-slate-400">1 Resolved</span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {[
                { number: 5, name: 'sohail', text: 'Marketing', time: 'just now', badge: 'New' },
                { number: 4, name: 'Md Ashif', text: 'tree', time: '3/27/2026' },
                { number: 3, name: 'Najme Shaquib', text: 'work', time: '3/27/2026', badge: 'New' },
                { number: 2, name: 'Najme Shaquib', text: '@Md Ashif check this', time: '3/27/2026' },
              ].map((item) => (
                <div key={item.number} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2854ff] text-sm font-semibold text-white">
                      {item.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                        {item.badge ? (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">{item.badge}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.time}</p>
                      <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="relative overflow-hidden bg-[#efefef]">
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-10 rounded-[10px] bg-gradient-to-b from-[#7aa436] to-[#385b1d]" />
                    <div>
                      <p className="font-display text-[2rem] font-bold leading-none tracking-tight text-[#1c1f24]">
                        Lean<span className="text-[#74a21f]">Port</span>
                      </p>
                      <p className="text-xs text-slate-500">Your Port for Lean Business</p>
                    </div>
                  </div>
                  <div className="hidden items-center gap-6 text-[15px] font-medium text-slate-700 xl:flex">
                    <span>E-Commerce</span>
                    <span className="text-[#74a21f]">Digital Marketing</span>
                    <span>Services</span>
                    <span>Company</span>
                    <span>Contact Us</span>
                  </div>
                </div>
                <button type="button" className="rounded-full bg-[#74b62a] px-6 py-3 text-base font-semibold text-white shadow-[0_12px_26px_rgba(116,182,42,0.22)]">
                  Get Help
                </button>
              </div>
            </div>

            <div className="relative min-h-[520px] bg-[linear-gradient(180deg,#f6f2f1_0%,#efefef_100%)] p-5 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="pt-2">
                  <h3 className="font-display text-5xl font-extrabold leading-none tracking-tight text-[#2d3551] sm:text-6xl">
                    Marketing
                  </h3>
                  <p className="mt-6 max-w-xl text-xl leading-10 text-[#34415c]">
                    Transform your brand value and reputation with the magic of content marketing strategy. LeanPort is a trusted name to create powerful and efficient content marketing strategies.
                  </p>
                  <div className="mt-10 inline-flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-500 text-slate-500">
                      <PlayIcon className="h-5 w-5" />
                    </span>
                    <button type="button" className="rounded-full bg-[#75b72b] px-10 py-4 text-xl font-semibold text-white shadow-[0_14px_28px_rgba(117,183,43,0.22)]">
                      Let&apos;s Start
                    </button>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[6px] bg-white shadow-[0_24px_70px_rgba(47,63,91,0.14)]">
                  <div className="aspect-[1.28/1] bg-[linear-gradient(135deg,#eef2f7_0%,#ffffff_36%,#e6edf6_100%)] p-6">
                    <div className="absolute right-10 top-10 h-16 w-16 rounded-full border-[6px] border-[#0990d0]" />
                    <div className="absolute left-8 top-10 h-20 w-20 rotate-6 rounded bg-[linear-gradient(180deg,#ffffff_0%,#f4f6fa_100%)] shadow-md" />
                    <div className="absolute bottom-10 left-10 right-10 rounded-[8px] bg-white/80 p-6 shadow-md">
                      <p className="text-center font-display text-5xl font-black uppercase leading-none tracking-tight text-[#171717] sm:text-6xl">
                        Content
                      </p>
                      <p className="mt-2 text-center font-display text-5xl font-black uppercase leading-none tracking-tight text-[#171717] sm:text-6xl">
                        <span className="rounded-md bg-[#d9eb00] px-3 py-1">Marketing</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute left-[19%] top-[16%] grid h-9 w-9 place-items-center rounded-full bg-[#d63d3a] text-sm font-bold text-white shadow-[0_12px_26px_rgba(214,61,58,0.28)]">5</div>
              <div className="absolute bottom-[11%] left-[64%] grid h-9 w-9 place-items-center rounded-full bg-[#d63d3a] text-sm font-bold text-white shadow-[0_12px_26px_rgba(214,61,58,0.28)]">4</div>

              <div className="absolute left-1/2 top-[37%] z-20 w-[min(460px,calc(100%-40px))] -translate-x-1/2 rounded-[26px] border border-white/80 bg-white/96 shadow-[0_30px_90px_rgba(47,63,91,0.18)] backdrop-blur">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#dff2d4] px-2 py-0.5 text-[10px] font-semibold text-[#5d8e2e]">Left side</span>
                    </div>
                    <button type="button" className="text-xl leading-none">×</button>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
                    <span>B</span>
                    <span>I</span>
                    <span>U</span>
                    <span>/</span>
                    <span>•</span>
                    <span>↩</span>
                    <span>🔗</span>
                  </div>
                </div>
                <div className="min-h-[160px] px-4 py-4 text-lg text-slate-400">
                  Leave a comment...
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <span className="text-xl text-slate-400">⌁</span>
                  <button type="button" className="rounded-full bg-[#9bb5f8] px-6 py-2 text-base font-semibold text-white">
                    Post
                  </button>
                </div>
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
