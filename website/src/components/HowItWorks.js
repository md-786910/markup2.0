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
    color: '#3d8f80',
  },
  {
    number: '02',
    title: 'Pin comments to exactly where it belongs',
    description: 'Reviewers click the exact element, frame, or section they mean. Every note stays attached to the right context.',
    detail: 'Context-rich pins reduce ambiguity and remove screenshot ping-pong.',
    icon: CursorIcon,
    color: '#f59e0b',
  },
  {
    number: '03',
    title: 'Resolve threads and move work forward',
    description: 'Team members reply in place, mark items resolved, and keep delivery moving without fragmented review loops.',
    detail: 'Cleaner handoff from comments to implementation and approval.',
    icon: CheckIcon,
    color: '#6f9f32',
  },
];

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section id="how-it-works" className="section-shell page-hero" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-start" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#0f8f75] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Workflow</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Review flows that feel
            <span className="block text-gradient font-sans">obvious from the first click</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">
            The product should make review faster for everyone involved, not add another layer of tooling overhead.
          </p>
        </div>

        <div className="relative mt-10 grid gap-4 lg:grid-cols-3">
          <div className="absolute left-[16.66%] right-[16.66%] top-14 hidden border-t border-dashed border-emerald-200 lg:block" />
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
                  <span className="font-display text-2xl font-bold tracking-tight text-[#10231f]">{step.number}</span>
                  <span className="rounded-full bg-[#eaf6ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: step.color }}>
                    Step
                  </span>
                </div>

                <h3 className="my-3 text-[14px] h-[50px] sm:text-[16px] lg:text-[18px] xl:text-[20px] font-semibold leading-[1.3] tracking-[-0.02em] text-[#10231f] font-sans">
                  {step.title}
                </h3>
                <p className="text-[10px] sm:text-[11px] lg:text-[12px] xl:text-[13px] leading-[1.7] text-[#53645f] font-sans">{step.description}</p>
                <p className="mt-5 border-t border-emerald-100 pt-5 text-[10px] sm:text-[11px] lg:text-[12px] xl:text-[13px] leading-[1.7] text-[#53645f] font-sans">{step.detail}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
