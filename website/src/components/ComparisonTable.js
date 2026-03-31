import React from 'react';
import { CheckIcon, XIcon, SlackIcon, DiscordIcon, JiraIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const COMPARISONS = [
  {
    feature: 'Real-time collaboration',
    feedbackly: { type: 'check' },
    competitor: { type: 'text', value: 'Limited' },
  },
  {
    feature: 'Guest review links',
    feedbackly: { type: 'check' },
    competitor: { type: 'check' },
  },
  {
    feature: 'PDF annotation',
    feedbackly: { type: 'check' },
    competitor: { type: 'check' },
  },
  {
    feature: 'Integrations',
    feedbackly: { type: 'icons' },
    competitor: { type: 'text', value: 'Slack only' },
  },
  {
    feature: 'Version history',
    feedbackly: { type: 'check' },
    competitor: { type: 'x' },
  },
  {
    feature: 'Device mode preview',
    feedbackly: { type: 'check' },
    competitor: { type: 'x' },
  },
  {
    feature: 'Free plan',
    feedbackly: { type: 'badge', value: 'Free forever' },
    competitor: { type: 'text', value: '14-day trial' },
  },
  {
    feature: 'Starting price',
    feedbackly: { type: 'price', value: '$12/mo' },
    competitor: { type: 'priceGray', value: '$39/mo' },
  },
];

function CellContent({ cell }) {
  switch (cell.type) {
    case 'check':
      return (
        <div className="flex justify-center">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>
      );
    case 'x':
      return (
        <div className="flex justify-center">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <XIcon className="w-3.5 h-3.5 text-gray-300" />
          </div>
        </div>
      );
    case 'icons':
      return (
        <div className="flex items-center justify-center gap-1.5">
          <SlackIcon className="w-4 h-4 text-emerald-600" />
          <DiscordIcon className="w-4 h-4 text-emerald-600" />
          <JiraIcon className="w-4 h-4 text-emerald-600" />
        </div>
      );
    case 'badge':
      return (
        <div className="flex justify-center">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">{cell.value}</span>
        </div>
      );
    case 'price':
      return <span className="text-sm font-semibold text-emerald-600">{cell.value}</span>;
    case 'priceGray':
      return <span className="text-sm text-gray-400">{cell.value}</span>;
    case 'text':
    default:
      return <span className="text-sm text-gray-400">{cell.value}</span>;
  }
}

export default function ComparisonTable() {
  const ref = useScrollReveal();

  return (
    <section id="comparison" className="bg-gray-50 py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Comparison</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
            Why teams switch from Markup.io
          </h2>
          <p className="text-lg text-gray-500 mt-4">
            More features, better experience, fraction of the cost.
          </p>
        </div>

        {/* Table */}
        <div className="max-w-4xl mx-auto mt-16" data-reveal data-delay="1">
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="px-6 py-4 text-sm font-semibold text-gray-500">Feature</div>
              <div className="px-6 py-4 text-sm font-semibold text-center">
                <span className="text-gradient font-display font-bold">Feedbackly</span>
              </div>
              <div className="px-6 py-4 text-sm font-semibold text-gray-400 text-center">Markup.io</div>
            </div>

            {/* Rows */}
            {COMPARISONS.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors ${
                  i % 2 === 0 ? '' : 'bg-gray-50/30'
                }`}
              >
                <div className="px-6 py-4 text-sm font-medium text-gray-700">{row.feature}</div>
                <div className="px-6 py-4 text-center bg-blue-50/30">
                  <CellContent cell={row.feedbackly} />
                </div>
                <div className="px-6 py-4 text-center">
                  <CellContent cell={row.competitor} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
