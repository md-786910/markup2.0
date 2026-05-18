import React from 'react';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gray-950">

      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-[#0f0a2e] to-gray-950" />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-900/30 rounded-full blur-[80px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 w-full">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300 text-xs font-medium mb-8 animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Visual feedback for modern teams
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            Collect feedback<br />
            <span
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              directly on your site
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Pin comments directly on live web pages. Let your team and clients leave precise, contextual feedback — no screenshots, no confusion.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <Link
              to="/onboarding"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-base transition-all duration-200 shadow-2xl shadow-brand-600/40 hover:shadow-brand-600/60 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #6357ff 0%, #8b5cf6 100%)',
              }}
            >
              Start for free
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-gray-300 font-semibold text-base border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              Sign in
            </Link>
          </div>

          {/* Trust badges */}
          <p className="text-xs text-gray-500 mt-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            No credit card required · 30-day free trial · Cancel anytime
          </p>
        </div>

        {/* Hero product mockup */}
        <div className="relative mt-16 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: '0.25s' }}>
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(99,87,255,0.25)] bg-gray-900">

            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/80 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-3">
                <div className="h-5 bg-gray-700/60 rounded-md flex items-center px-3">
                  <span className="text-[10px] text-gray-400">https://yoursite.com</span>
                </div>
              </div>
            </div>

            {/* Mock content area */}
            <div className="relative bg-white min-h-[360px] overflow-hidden p-8">
              {/* Simulated page content */}
              <div className="max-w-lg">
                <div className="h-8 w-64 bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                <div className="h-4 w-5/6 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-4/6 bg-gray-100 rounded mb-6" />
                <div className="h-10 w-36 bg-brand-100 rounded-lg" />
              </div>

              {/* Annotation pin 1 */}
              <div className="absolute top-12 right-24 animate-float">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-brand-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform">
                    1
                  </div>
                  <div className="absolute left-10 top-0 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-[8px] font-bold flex items-center justify-center">S</div>
                      <span className="text-[11px] font-semibold text-gray-800">Sarah K.</span>
                      <span className="text-[10px] text-gray-400 ml-auto">2m ago</span>
                    </div>
                    <p className="text-xs text-gray-600">The CTA button should be more prominent here. Can we try a brighter color?</p>
                  </div>
                </div>
              </div>

              {/* Annotation pin 2 */}
              <div className="absolute bottom-16 left-1/2 animate-float-delay">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform">
                    2
                  </div>
                  <div className="absolute left-10 -top-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[8px] font-bold flex items-center justify-center">M</div>
                      <span className="text-[11px] font-semibold text-gray-800">Mike T.</span>
                    </div>
                    <p className="text-xs text-gray-600">Approved ✅ Looks great on mobile too!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow under mockup */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-brand-500/30 blur-3xl rounded-full pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
