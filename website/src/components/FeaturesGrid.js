import React from 'react';
import { PinIcon, ZapIcon, ShareIcon, FileTextIcon, MonitorIcon, PlugIcon, ArrowRightIcon } from './icons';
import { FEATURES } from '../data/features';
import useScrollReveal from '../hooks/useScrollReveal';

const ICON_MAP = {
  pin: PinIcon,
  zap: ZapIcon,
  share: ShareIcon,
  fileText: FileTextIcon,
  monitor: MonitorIcon,
  plug: PlugIcon,
};

export default function FeaturesGrid() {
  const ref = useScrollReveal();

  return (
    <section id="features" className="bg-white py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Features</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
            Everything you need for design feedback
          </h2>
          <p className="text-lg text-gray-500 mt-4">
            Stop wasting time on scattered feedback. Get everything in one place, right where it matters.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mt-16">
          {FEATURES.map((feature, i) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <div
                key={feature.id}
                className="group p-8 rounded-2xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                data-reveal
                data-delay={String((i % 3) + 1)}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-[15px]">{feature.description}</p>
                <div className="flex items-center gap-1 mt-4 text-blue-500 text-sm font-medium opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                  Learn more <ArrowRightIcon className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
