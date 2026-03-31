import React from 'react';
import { PinIcon, UsersIcon, ShieldIcon, ClockIcon, CodeIcon, ChatIcon, ZapIcon } from './icons';
import { STATS } from '../data/stats';
import useCountUp from '../hooks/useCountUp';

const ICON_MAP = {
  pin: PinIcon,
  users: UsersIcon,
  shield: ShieldIcon,
  clock: ClockIcon,
};

function StatItem({ stat }) {
  const { ref, value } = useCountUp({
    end: stat.end,
    duration: 2000,
    suffix: stat.suffix,
  });
  const Icon = ICON_MAP[stat.icon];

  return (
    <div ref={ref} className="text-center group">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <div className="text-3xl sm:text-4xl font-display font-bold text-white">{value}</div>
      <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="relative bg-gray-950 py-20 overflow-hidden">
      {/* Gradient accents */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />

      {/* Floating decorative icons */}
      <div className="absolute top-8 left-[8%] hidden lg:block animate-float" style={{ animationDelay: '0.5s' }}>
        <CodeIcon className="w-4 h-4 text-gray-700/30" />
      </div>
      <div className="absolute bottom-8 right-[10%] hidden lg:block animate-float-slow">
        <ChatIcon className="w-4 h-4 text-gray-700/30" />
      </div>
      <div className="absolute top-12 right-[20%] hidden lg:block animate-float" style={{ animationDelay: '1s' }}>
        <ZapIcon className="w-4 h-4 text-gray-700/30" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {STATS.map((stat) => (
            <StatItem key={stat.icon} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
