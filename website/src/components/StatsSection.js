import React from 'react';
import { PinIcon, UsersIcon, ShieldIcon, ClockIcon, CodeIcon, ChatIcon, ZapIcon } from './icons';
import { STATS } from '../data/stats';
import useCountUp from '../hooks/useCountUp';
import useScrollReveal from '../hooks/useScrollReveal';

const ICON_MAP = {
  pin: PinIcon,
  users: UsersIcon,
  shield: ShieldIcon,
  clock: ClockIcon,
};

function StatItem({ stat, index }) {
  const { ref, value } = useCountUp({
    end: stat.end,
    duration: 2200,
    suffix: stat.suffix,
    decimals: stat.isDecimal ? 1 : 0,
  });
  const Icon = ICON_MAP[stat.icon];

  return (
    <div
      ref={ref}
      className="premium-card hover-lift rounded-[24px] p-6 text-left"
      data-reveal="scale"
      data-delay={String(index + 1)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eaf6ef]" style={{ color: stat.color }}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full bg-[#eaf6ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: stat.color }}>
          Live
        </span>
      </div>
      <div className="mt-4 text-4xl font-bold sm:text-5xl leading-[1.3] tracking-[-0.02em] text-[#10231f] font-sans">{value}</div>
      <p className="mt-2 text-[10px] sm:text-[11px] lg:text-[12px] xl:text-[13px] leading-[1.7] text-[#53645f] font-sans">{stat.label}</p>
    </div>
  );
}

export default function StatsSection() {
  const ref = useScrollReveal();

  return (
    <section className="section-shell py-14 sm:py-14 px-10 sm:px-10" ref={ref}>
      <div className="absolute left-[8%] top-16 hidden lg:block animate-float">
        <CodeIcon className="h-4 w-4 text-emerald-200" />
      </div>
      <div className="absolute right-[12%] top-20 hidden lg:block animate-float-slow">
        <ZapIcon className="h-4 w-4 text-emerald-200" />
      </div>
      <div className="absolute bottom-10 right-[18%] hidden lg:block animate-float">
        <ChatIcon className="h-4 w-4 text-emerald-200" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#0f8f75] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Performance</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Built for faster reviews,
            <span className="block text-gradient font-sans">cleaner approvals, and less drift</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">
            Teams adopt Kommently quickly because the workflow is obvious, comments stay anchored, and every review moves with less friction.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATS.map((stat, index) => (
            <StatItem key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

