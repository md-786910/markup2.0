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
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
            <XIcon className="h-3.5 w-3.5 text-gray-300" />
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
      return <span className="text-sm text-gray-400">{cell.value}</span>;
    default:
      return <span className="text-sm text-gray-400">{cell.value}</span>;
  }
}

export default function ComparisonTable() {
  const ref = useScrollReveal();

  return (
    <section id="comparison" className="section-shell bg-slate-50 py-20 sm:py-24" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <span className="eyebrow">Comparison</span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
            Why teams switch from
            <span className="block text-gradient">Markup.io</span>
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-500">
            Same visual review workflow, clearer collaboration, and a lower starting price for growing teams.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-5xl overflow-x-auto rounded-[24px] border border-gray-200 bg-white shadow-sm" data-reveal data-delay="1">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50">
              <div className="px-6 py-4 text-sm font-semibold text-gray-500">Feature</div>
              <div className="px-6 py-4 text-center text-sm font-semibold">
                <span className="font-display font-bold text-gradient">Markly</span>
              </div>
              <div className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Markup.io</div>
            </div>

            {COMPARISONS.map(([feature, feedbackly, competitor], i) => (
              <div
                key={feature}
                className={`grid grid-cols-3 border-b border-gray-100 transition-colors last:border-0 hover:bg-blue-50/30 ${i % 2 ? 'bg-gray-50/30' : ''}`}
              >
                <div className="px-6 py-4 text-sm font-medium text-gray-700">{feature}</div>
                <div className="bg-blue-50/30 px-6 py-4 text-center">
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
