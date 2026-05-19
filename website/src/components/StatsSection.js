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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#2854ff]">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Live
        </span>
      </div>
      <div className="mt-7 font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{value}</div>
      <p className="mt-2 max-w-[14rem] text-sm leading-6 text-slate-500">{stat.label}</p>
    </div>
  );
}

export default function StatsSection() {
  const ref = useScrollReveal();

  return (
    <section className="section-shell py-20 sm:py-24" ref={ref}>
      <div className="absolute left-[8%] top-16 hidden lg:block animate-float">
        <CodeIcon className="h-4 w-4 text-slate-300" />
      </div>
      <div className="absolute right-[12%] top-20 hidden lg:block animate-float-slow">
        <ZapIcon className="h-4 w-4 text-slate-300" />
      </div>
      <div className="absolute bottom-10 right-[18%] hidden lg:block animate-float">
        <ChatIcon className="h-4 w-4 text-slate-300" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <span className="eyebrow">Performance</span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-950 md:text-4xl lg:text-5xl">
            Built for faster reviews,
            <span className="block text-gradient">cleaner approvals, and less drift</span>
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-500">
            Teams adopt Markly quickly because the workflow is obvious, feedback stays anchored, and every review moves with less friction.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {STATS.map((stat, index) => (
            <StatItem key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
