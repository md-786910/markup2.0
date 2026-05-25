import React from 'react';
import { ArrowRightIcon, CheckIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#10231f] py-16 text-white sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(23,107,87,0.24),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(143,209,79,0.14),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
        <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
          Ready when your next review starts
        </span>
        <h2 className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Replace scattered comments with one precise review workspace.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
          Start with a live URL, invite your team or client, and resolve comments where the work actually lives.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={`${APP_URL}/onboarding`} className="button-primary px-8 py-4">
            Get started free
            <ArrowRightIcon className="h-5 w-5" />
          </a>
          <a href="/pricing" className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/8 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/12">
            Compare plans
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#8a9b94]">
          {['No credit card required', 'Guest links included', 'Cancel any time'].map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-[#b8e36d]" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}


