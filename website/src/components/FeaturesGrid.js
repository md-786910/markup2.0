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
    <section id="features" className="section-shell py-14 sm:py-14 px-10 sm:px-10" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-start" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#0f8f75] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Core features</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Everything teams need to turn
            <span className="block text-gradient font-sans">feedback into shipped work</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">
            Markly combines visual review, collaboration, guest sharing, and delivery handoff in one clear workflow.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <article
                key={feature.id}
                className="premium-card hover-lift group rounded-[24px] p-7"
                data-reveal="scale"
                data-delay={String((index % 3) + 1)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md text-white`} style={{ background: feature.gradient }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: feature.color }}>
                    Included
                  </span>
                </div>
                <h3 className="my-3 text-[16px] sm:text-[18px] lg:text-[20px] xl:text-[22px] font-semibold leading-[1.3] tracking-[-0.02em] text-[#10231f] font-sans">{feature.title}</h3>
                <p className="text-[10px] sm:text-[11px] lg:text-[12px] xl:text-[13px] leading-[1.7] text-[#53645f] font-sans">
                  {feature.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-[12px] cursor-pointer font-medium opacity-80 transition group-hover:translate-x-1 group-hover:opacity-100" style={{ color: feature.color }}>
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
