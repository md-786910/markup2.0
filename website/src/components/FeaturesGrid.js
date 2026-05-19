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
    <section id="features" className="section-shell py-20 sm:py-24" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Core Features
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight text-slate-950 md:text-4xl lg:text-5xl">
            Everything teams need to turn
            <span className="block text-[#3f4cf6]">feedback into shipped work</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-500">
            Markly combines visual review, collaboration, guest sharing, and delivery handoff in one clear workflow.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <article
                key={feature.id}
                className="premium-card hover-lift group rounded-[28px] p-7"
                data-reveal="scale"
                data-delay={String((index % 3) + 1)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg shadow-slate-200`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Included
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-500">{feature.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#3f4cf6] opacity-80 transition group-hover:translate-x-1 group-hover:opacity-100">
                  Explore workflow
                  <ArrowRightIcon className="h-4 w-4" />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
