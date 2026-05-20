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
    color: '#ef4444',
  },
  {
    number: '02',
    title: 'Pin feedback exactly where it belongs',
    description: 'Reviewers click the exact element, frame, or section they mean. Every note stays attached to the right context.',
    detail: 'Context-rich pins reduce ambiguity and remove screenshot ping-pong.',
    icon: CursorIcon,
    color: '#f59e0b',
  },
  {
    number: '03',
    title: 'Resolve threads and move work forward',
    description: 'Team members reply in place, mark items resolved, and keep delivery moving without fragmented review loops.',
    detail: 'Cleaner handoff from feedback to implementation and approval.',
    icon: CheckIcon,
    color: '#8b5cf6',
  },
];

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section id="how-it-works" className="section-shell py-14 sm:py-14 px-10 sm:px-10" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-start" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#38BDF8] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Workflow</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Review flows that feel
            <span className="block text-gradient font-sans">obvious from the first click</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#475569] font-sans">
            The product should make review faster for everyone involved, not add another layer of tooling overhead.
          </p>
        </div>

        <div className="relative mt-10 grid gap-4 lg:grid-cols-3">
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
                <div className={`flex h-8 w-8 items-center justify-center rounded-md text-white`} style={{ background: step.color }}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="font-display text-2xl font-bold tracking-tight text-slate-950">{step.number}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: step.color }}>
                    Step
                  </span>
                </div>

                <h3 className="my-3 text-[14px] h-[50px] sm:text-[16px] lg:text-[18px] xl:text-[20px] font-semibold leading-[1.3] tracking-[-0.02em] text-[#0B1D3A] font-sans">
                  {step.title}
                </h3>
                <p className="text-[10px] sm:text-[11px] lg:text-[12px] xl:text-[13px] leading-[1.7] text-[#475569] font-sans">{step.description}</p>
                <p className="mt-5 border-t pt-5 text-[10px] sm:text-[11px] lg:text-[12px] xl:text-[13px] leading-[1.7] text-[#475569] font-sans">{step.detail}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
