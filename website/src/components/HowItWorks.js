import React from 'react';
import { GlobeIcon, CursorIcon, CheckIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const STEPS = [
  {
    number: '01',
    title: 'Add a live URL or upload a file',
    description: 'Start from the asset your team already needs to review. No plugin installs, no migration ceremony, no extra setup burden.',
    detail: 'Supports websites, PDFs, image review, and structured share links.',
    icon: GlobeIcon,
  },
  {
    number: '02',
    title: 'Pin feedback exactly where it belongs',
    description: 'Reviewers click the exact element, frame, or section they mean. Every note stays attached to the right context.',
    detail: 'Context-rich pins reduce ambiguity and remove screenshot ping-pong.',
    icon: CursorIcon,
  },
  {
    number: '03',
    title: 'Resolve threads and move work forward',
    description: 'Team members reply in place, mark items resolved, and keep delivery moving without fragmented review loops.',
    detail: 'Cleaner handoff from feedback to implementation and approval.',
    icon: CheckIcon,
  },
];

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section id="how-it-works" className="section-shell py-20 sm:py-24" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <span className="eyebrow">Workflow</span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-950 md:text-4xl lg:text-5xl">
            Review flows that feel
            <span className="block text-gradient">obvious from the first click</span>
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-500">
            The product should make review faster for everyone involved, not add another layer of tooling overhead.
          </p>
        </div>

        <div className="relative mt-16 grid gap-5 lg:grid-cols-3">
          <div className="absolute left-[16.66%] right-[16.66%] top-14 hidden border-t border-dashed border-slate-300 lg:block" />
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className="premium-card hover-lift relative rounded-[24px] p-7"
                data-reveal="scale"
                data-delay={String(index + 1)}
              >
                <div className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2854ff] to-[#0f766e] text-white shadow-[0_16px_34px_rgba(40,84,255,0.22)]">
                  <Icon className="h-6 w-6" />
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="font-display text-2xl font-bold tracking-tight text-slate-950">{step.number}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Step
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-semibold leading-snug text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-500">{step.description}</p>
                <p className="mt-5 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-400">{step.detail}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
