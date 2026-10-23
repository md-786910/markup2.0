import React from 'react';
import { ArrowRightIcon, CheckIcon } from './icons';
import ProductShot from './ProductShot';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

const PROOF_POINTS = ['30-day Pro trial, no card', 'Works on staging and logged-in pages', 'Slack, Jira, Discord, and Teams'];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 sm:pt-16 lg:pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(0,61,255,0.10),transparent_60%)]" />
      <div className="site-container relative">
        <div className="mx-auto max-w-4xl text-center">
          <span className="eyebrow">Visual feedback for websites and PDFs</span>
          <h1 className="mt-6 font-display text-[40px] font-bold leading-[1.04] tracking-[-0.035em] text-slate-950 sm:text-6xl lg:text-7xl">
            Feedback on any website.
            <span className="block text-gradient">No install needed.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Paste a link, click anywhere to comment, and ship the fix. Your team and your clients review the real
            site, PDFs, and images in one place, with every comment pinned to the exact spot.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`${APP_URL}/onboarding`} className="button-primary px-7 py-3.5">
              Start free, no card
              <ArrowRightIcon className="h-4 w-4" />
            </a>
            <a href="#how-it-works" className="button-secondary px-7 py-3.5">
              See how it works
            </a>
          </div>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
            {PROOF_POINTS.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-[#003dff]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto mt-14 max-w-6xl sm:mt-16">
          <ProductShot
            src="/images/product/project-thread.webp"
            alt="Kommently project view: a live website with numbered comment pins and the open comment thread in the sidebar"
            url="app.kommently.app/project/website-relaunch"
            eager
          />
        </div>
      </div>
    </section>
  );
}
