import React from 'react';
import { GlobeIcon, CursorIcon, CheckIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const STEPS = [
  {
    icon: GlobeIcon,
    title: 'Paste a link',
    copy: 'Add a live website, a staging URL, or upload PDFs and images. Nothing to install on the site, no browser extension.',
  },
  {
    icon: CursorIcon,
    title: 'Click to comment',
    copy: 'Switch to Comment and click anywhere. The pin sticks to that element, with the page, device size, and a screenshot attached.',
  },
  {
    icon: CheckIcon,
    title: 'Resolve and ship',
    copy: 'Discuss in the thread, mention teammates, send it to Jira or Slack, and mark it resolved when the fix is live.',
  },
];

export default function HowItWorks() {
  const ref = useScrollReveal();
  return (
    <section id="how-it-works" className="section-pad scroll-mt-24" ref={ref}>
      <div className="site-container">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <span className="eyebrow">How it works</span>
          <h2 className="section-heading mt-5">From link to fix in three steps.</h2>
        </div>
        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, copy }, index) => (
            <li key={title} className="premium-card p-7" data-reveal data-delay={String(index + 1)}>
              <div className="flex items-center gap-3">
                <span className="icon-tile">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-slate-400">Step {index + 1}</span>
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold text-slate-950">{title}</h3>
              <p className="body-copy mt-3">{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
