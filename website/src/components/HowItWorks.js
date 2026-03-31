import React from 'react';
import { GlobeIcon, CursorIcon, CheckIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const STEPS = [
  {
    number: '1',
    title: 'Add your website or document',
    description: 'Paste a URL or upload a PDF. Your project is ready in seconds — no complex setup required.',
    icon: GlobeIcon,
  },
  {
    number: '2',
    title: 'Pin feedback anywhere',
    description: 'Click anywhere on the page to leave a comment. Your feedback is anchored to the exact spot.',
    icon: CursorIcon,
  },
  {
    number: '3',
    title: 'Collaborate, resolve & ship',
    description: 'Discuss in threads, resolve issues, and track progress. Ship with confidence.',
    icon: CheckIcon,
  },
];

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section id="how-it-works" className="bg-white py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Simple 3-step process</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
            How it works
          </h2>
          <p className="text-lg text-gray-500 mt-4">
            Get from zero to collecting feedback in under 30 seconds.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mt-16 relative">
          {/* Connecting dashed line (desktop only) */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] border-t-2 border-dashed border-gray-200" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="text-center relative"
                data-reveal
                data-delay={String(i + 1)}
              >
                {/* Number circle */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-display font-bold text-xl shadow-lg shadow-blue-500/25 animate-bounce-gentle relative z-10 bg-white" style={{ animationDelay: `${i * 0.3}s` }}>
                  {step.number}
                </div>
                {/* Icon */}
                <div className="flex justify-center mt-5">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                {/* Text */}
                <h3 className="font-display font-semibold text-lg text-gray-900 mt-4">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
