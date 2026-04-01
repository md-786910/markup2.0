import React from 'react';
import { ArrowRightIcon, CheckIcon, PinIcon, ChatIcon, CodeIcon, StarIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

export default function CtaSection() {
  return (
    <section className="relative bg-gray-950 py-24 overflow-hidden">
      {/* Gradient blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />

      {/* Floating icons */}
      <div className="absolute top-12 left-[12%] hidden lg:block animate-float" style={{ animationDelay: '0s' }}>
        <PinIcon className="w-5 h-5 text-gray-700/20" />
      </div>
      <div className="absolute bottom-16 right-[15%] hidden lg:block animate-float-slow">
        <ChatIcon className="w-5 h-5 text-gray-700/20" />
      </div>
      <div className="absolute top-20 right-[20%] hidden lg:block animate-float" style={{ animationDelay: '1s' }}>
        <CodeIcon className="w-5 h-5 text-gray-700/20" />
      </div>
      <div className="absolute bottom-20 left-[20%] hidden lg:block animate-float" style={{ animationDelay: '2s' }}>
        <StarIcon className="w-5 h-5 text-gray-700/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center px-4 sm:px-6">
        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
          Your team is already wasting hours on feedback.{' '}
          <span className="text-gradient">Fix it in 30 seconds.</span>
        </h2>
        <p className="text-lg text-gray-400 mt-4 max-w-xl mx-auto">
          Stop losing time to scattered feedback. Start pinning, collaborating, and shipping — for free.
        </p>
        <div className="mt-10">
          <a
            href={`${APP_URL}/onboarding`}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl text-lg font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            Get Started Free
            <ArrowRightIcon className="w-5 h-5" />
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6">
          {['Free forever plan', 'No credit card required', 'Setup in 30 seconds'].map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckIcon className="w-3.5 h-3.5 text-green-400" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
