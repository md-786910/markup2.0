import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRightIcon, CheckIcon, PlayIcon, ShareIcon, MonitorIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

function ProductMockup() {

  return (
    <motion.div
      className="relative mx-auto mt-10 max-w-[1400px] px-4 sm:mt-14"
    >
      <div className="absolute inset-x-8 bottom-0 h-40 rounded-full bg-[#2854ff]/10 blur-3xl" />

      <motion.div
        className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_40px_110px_rgba(50,65,120,0.16)] transition-shadow duration-300 hover:shadow-[0_52px_140px_rgba(50,65,120,0.22)] sm:rounded-[32px]"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 z-10"
        />

        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#fbfbfd] px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" className="text-[#3f4cf6]">
              <path d="M7 16 L10 8 L12 12 L14 8 L17 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="hidden truncate text-sm font-semibold text-slate-900 sm:block">web site</p>
            <div className="hidden min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 md:block">
              <span className="text-slate-400">https://example.com/</span>content-marketing/
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
            <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-[#2854ff] px-3 py-2 text-sm font-semibold text-white sm:px-4">
              Comment
            </button>
            <button type="button" className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 lg:inline-flex">
              <ShareIcon className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-[#f7f8fb] xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
                <span className="border-b-2 border-[#2854ff] pb-2 text-[#2854ff]">Markly</span>
                <span>Activity</span>
                <span>Versions</span>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="font-semibold text-slate-900">2 Active</span>
                <span className="text-slate-400">1 Resolved</span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {[
                { number: 5, name: 'Jhon Doe', text: 'Marketing', time: 'just now', badge: 'New' },
                { number: 4, name: 'Jane Smith', text: 'tree', time: '3/27/2026' },
              ].map((item, index) => (
                <motion.div
                  key={item.number}
                  animate={{ x: [0, index === 0 ? 2 : 0, 0] }}
                  transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut' }}
                  className="px-4 py-4"
                >
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
                </motion.div>
              ))}
            </div>
          </aside>
          {/* Main Canvas */}
          <div className="relative overflow-hidden bg-[#2b1d52]">
            {/* Rings */}
            <div className="absolute right-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full border border-white/20" />
            <div className="absolute right-[-80px] top-[-80px] h-[340px] w-[340px] rounded-full border border-white/20" />
            <div className="absolute right-[-40px] top-[-40px] h-[260px] w-[260px] rounded-full border border-white/20" />

            <div className="relative p-8 lg:p-14">
              {/* Hero */}
              <div className="relative max-w-[760px]">
                <div className="relative">
                  <div className="absolute left-10 top-[0.08em] z-10 grid h-10 w-10 place-items-center rounded-full bg-[#2b50ff] text-white shadow-lg">
                    1
                  </div>
                  <h1
                    className="
                      translate-x-14
                      text-[54px]
                      sm:text-[68px]
                      lg:text-[96px]
                      font-light
                      leading-[0.9]
                      tracking-[-0.06em]
                      text-white
                    "
                  >
                    Let&apos;s save the world,
                    <br />
                    shall we?
                  </h1>
                </div>

                <div
                  className="
                    relative
                    mt-8
                  "
                >
                  <div className="absolute left-10 top-[0.12em] z-10 grid h-10 w-10 place-items-center rounded-full bg-[#2b50ff] text-white">
                    2
                  </div>
                  <p
                    className="
                      translate-x-14
                      max-w-[420px]
                      text-[17px]
                      leading-[1.8]
                      text-white/80
                    "
                  >
                    See how Chlorophyll, Inc. makes sustainability
                    a priority.
                  </p>
                </div>
              </div>

              {/* Floating Comment */}
              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="
                  absolute left-[50%] top-[24%]
                  z-20
                  w-[360px]
                  -translate-x-1/2
                  rounded-[18px]
                  border border-white/60
                  bg-white/95
                  p-5
                  shadow-[0_12px_40px_rgba(15,23,42,0.10)]
                  backdrop-blur-xl
                "
              >
                <p className="text-[15px] leading-7 text-slate-700">
                  <span className="font-semibold text-[#2b50ff]">
                    @Rebecca Welton
                  </span>{' '}
                  Let&apos;s change this tagline to
                  &quot;Let&apos;s save the world together.&quot;
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>☺</span>
                    <span>📎</span>
                  </div>

                  <button
                    className="
                      rounded-xl
                      bg-[#b8aaf8]
                      px-5 py-2
                      text-[14px]
                      font-semibold
                      text-white
                    "
                  >
                    Send
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-14 pt-20 sm:pb-14 sm:pt-20 px-10 sm:px-10">
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
            <CheckIcon className="mr-2 h-3.5 w-3.5 text-[#38BDF8]" />
            Realtime visual review for product teams
          </div>

          <h1 className="text-[38px] sm:text-[48px] md:text-[58px] lg:text-[74px] xl:text-[82px] font-extrabold leading-[0.95] tracking-[-0.04em] text-slate-950 max-w-[12ch font-sans my-4">
            Visual feedback that
            <span className="block text-gradient font-sans">turns reviews into releases.</span>
          </h1>

          <p className="text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[17px] leading-[1.7] text-[#475569] font-sans text-center">
            Pin comments on live pages, PDFs, and launch assets. Markly keeps teams, clients, and developers aligned with precise context, realtime threads, and controlled guest links.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} href={`${APP_URL}/onboarding`} className="button-primary px-8 py-4">
              Start free
              <ArrowRightIcon className="h-5 w-5" />
            </motion.a>
            <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} href="#how-it-works" className="button-secondary px-8 py-4">
              <PlayIcon className="h-5 w-5 text-[#2854ff]" />
              Watch workflow
            </motion.a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
            {['No credit card', 'Guest reviews', 'Slack, Jira, Discord'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-[#38BDF8]" />
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
