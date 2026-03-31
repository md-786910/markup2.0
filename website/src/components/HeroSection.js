import React from 'react';
import { ArrowRightIcon, PlayIcon, CheckIcon, CodeIcon, CursorIcon, ChatIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3001';

function FloatingIcon({ icon: Icon, className, style }) {
  return (
    <div className={`absolute hidden lg:block ${className}`} style={style}>
      <Icon className="w-5 h-5 text-gray-600/20" />
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative max-w-5xl mx-auto mt-16 px-4">
      {/* Tilted background cards */}
      <div className="absolute -left-8 top-8 w-72 h-48 rounded-2xl bg-gray-800/40 border border-gray-700/30 -rotate-6 hidden lg:block" />
      <div className="absolute -right-8 top-12 w-72 h-48 rounded-2xl bg-gray-800/40 border border-gray-700/30 rotate-4 hidden lg:block" />

      {/* Main browser frame */}
      <div className="relative rounded-2xl bg-gray-900 border border-gray-700/50 shadow-2xl shadow-blue-500/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/80 border-b border-gray-700/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-gray-700/50 rounded-lg px-4 py-1.5 text-xs text-gray-400 max-w-md mx-auto flex items-center gap-2">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              app.feedbackly.online
            </div>
          </div>
        </div>

        {/* Real dashboard screenshot */}
        <img
          src={`${process.env.PUBLIC_URL}/dashboard-preview.png`}
          alt="Feedbackly dashboard showing visual feedback pins on a live website with comment sidebar and device preview controls"
          className="w-full h-auto block"
          loading="eager"
        />
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative bg-gray-950 overflow-hidden pt-24 pb-8">
      {/* Gradient blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[150px]" />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern opacity-30" />

      {/* Floating decorative icons */}
      <FloatingIcon icon={CodeIcon} className="top-32 left-[10%] animate-float" style={{ animationDelay: '0s' }} />
      <FloatingIcon icon={ChatIcon} className="top-48 right-[12%] animate-float" style={{ animationDelay: '1s' }} />
      <FloatingIcon icon={CursorIcon} className="bottom-[40%] left-[8%] animate-float-slow" />
      <FloatingIcon icon={CheckIcon} className="top-36 right-[25%] animate-float" style={{ animationDelay: '2s' }} />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-blue-400">Now in Public Beta</span>
        </div>

        {/* Heading */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Visual feedback that{' '}
          <span className="text-gradient">actually ships.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mt-6 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Stop emailing screenshots. Pin feedback directly on live websites, PDFs, and designs. Your team sees it instantly, resolves it faster, ships it sooner.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <a
            href={`${APP_URL}/signup`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            Start Free
            <ArrowRightIcon className="w-5 h-5" />
          </a>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-xl text-lg font-semibold border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            <PlayIcon className="w-5 h-5" />
            See How It Works
          </a>
        </div>

        {/* Trust line */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {['Free forever plan', 'No credit card required', 'Setup in 30 seconds'].map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckIcon className="w-3.5 h-3.5 text-green-400" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Dashboard preview */}
      <DashboardPreview />
    </section>
  );
}
