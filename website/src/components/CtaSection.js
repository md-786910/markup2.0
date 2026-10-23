import React from 'react';
import { ArrowRightIcon, CheckIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

export default function CtaSection() {
  return (
    <section className="pb-16 sm:pb-20 lg:pb-24">
      <div className="site-container">
        <div className="relative overflow-hidden rounded-3xl bg-[#003dff] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Your next review round starts with a link.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-white/80 sm:text-lg">
              Paste a URL, invite your team or client, and resolve every comment where the work lives.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={`${APP_URL}/onboarding`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-[#003dff] transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Start free, no card
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <a
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                Compare plans
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
              {['No credit card required', '30-day Pro trial', 'Cancel any time'].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <CheckIcon className="h-4 w-4" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
