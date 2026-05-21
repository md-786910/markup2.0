import React from 'react';
import { CheckIcon, XIcon, SlackIcon, DiscordIcon, JiraIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const COMPARISONS = [
  ['Real-time collaboration', { type: 'check' }, { type: 'text', value: 'Limited' }],
  ['Guest review links', { type: 'check' }, { type: 'check' }],
  ['PDF annotation', { type: 'check' }, { type: 'check' }],
  ['Slack, Discord, Jira', { type: 'icons' }, { type: 'text', value: 'Slack only' }],
  ['Version history', { type: 'check' }, { type: 'x' }],
  ['Device mode preview', { type: 'check' }, { type: 'x' }],
  ['Free plan', { type: 'badge', value: 'Free forever' }, { type: 'text', value: 'Trial only' }],
  ['Starting price', { type: 'price', value: '$12/mo' }, { type: 'priceGray', value: '$39/mo' }],
];

function CellContent({ cell }) {
  switch (cell.type) {
    case 'check':
      return (
        <div className="flex justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
            <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
          </span>
        </div>
      );
    case 'x':
      return (
        <div className="flex justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eaf6ef]">
            <XIcon className="h-3.5 w-3.5 text-[#8a9b94]" />
          </span>
        </div>
      );
    case 'icons':
      return (
        <div className="flex items-center justify-center gap-1.5 text-emerald-600">
          <SlackIcon className="h-4 w-4" />
          <DiscordIcon className="h-4 w-4" />
          <JiraIcon className="h-4 w-4" />
        </div>
      );
    case 'badge':
      return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{cell.value}</span>;
    case 'price':
      return <span className="text-sm font-semibold text-emerald-600">{cell.value}</span>;
    case 'priceGray':
      return <span className="text-sm text-[#8a9b94]">{cell.value}</span>;
    default:
      return <span className="text-sm text-[#8a9b94]">{cell.value}</span>;
  }
}

export default function ComparisonTable() {
  const ref = useScrollReveal();

  return (
    <section id="comparison" className="section-shell py-14 sm:py-14 px-10 sm:px-10" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#0f8f75] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Comparison</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Why teams switch from
            <span className="block text-gradient font-sans">Markup.io</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">
            Same visual review workflow, clearer collaboration, and a lower starting price for growing teams.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl overflow-x-auto rounded-[24px] border border-emerald-100 bg-[#fffffb] shadow-[0_18px_55px_rgba(25,54,43,0.08)]" data-reveal data-delay="1">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-3 border-b border-emerald-100 bg-[#f4faf4]">
              <div className="px-6 py-4 leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">Feature</div>
              <div className="px-6 py-4 text-center leading-[1.7] max-w-[65ch] text-[#53645f] font-sans font-semibold">
                <span className="font-display font-bold text-gradient">Markly</span>
              </div>
              <div className="px-6 py-4 text-center leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">Markup.io</div>
            </div>

            {COMPARISONS.map(([feature, feedbackly, competitor], i) => (
              <div
                key={feature}
                className={`grid grid-cols-3 border-b border-emerald-100 transition-colors last:border-0 hover:bg-[#eef8ee]/70 ${i % 2 ? 'bg-[#fbfff8]' : ''}`}
              >
                <div className="px-6 py-4 font-medium leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">{feature}</div>
                <div className="bg-[#eaf6ef]/70 px-6 py-4 text-center">
                  <CellContent cell={feedbackly} />
                </div>
                <div className="px-6 py-4 text-center">
                  <CellContent cell={competitor} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

