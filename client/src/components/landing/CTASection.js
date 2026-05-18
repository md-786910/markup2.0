import React from 'react';
import { Link } from 'react-router-dom';

export default function CTASection() {
  return (
    <section className="py-24 lg:py-32 bg-gray-950 relative overflow-hidden">

      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-sky-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
        {/* Spark icon */}
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 items-center justify-center mb-8 shadow-2xl shadow-brand-500/30 mx-auto animate-float">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="text-4xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
          Ready to ship faster<br />
          <span style={{ background: 'linear-gradient(135deg,#a78bfa,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            with better feedback?
          </span>
        </h2>
        <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
          Join teams who use Feedbackly to close the loop between design, development, and clients — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/onboarding"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all duration-200 hover:-translate-y-0.5 shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50"
            style={{ background: 'linear-gradient(135deg,#6357ff,#a855f7)' }}
          >
            Start for free
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-gray-300 font-bold text-base border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            Sign in
          </Link>
        </div>
        <p className="text-sm text-gray-600 mt-6">
          No credit card required · 30-day free trial · Cancel anytime
        </p>
      </div>
    </section>
  );
}
