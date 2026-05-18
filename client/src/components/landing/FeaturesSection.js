import React from 'react';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
      </svg>
    ),
    color: 'from-brand-500 to-purple-500',
    glow: 'shadow-brand-500/30',
    title: 'Click-to-pin Annotations',
    desc: 'Click anywhere on your live site to drop a pin and leave a comment. Pinpoint feedback exactly where it matters.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-sky-500 to-blue-600',
    glow: 'shadow-sky-500/30',
    title: 'Real-time Collaboration',
    desc: 'Your whole team sees comments instantly. No refresh needed — everyone stays in sync as feedback rolls in.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/30',
    title: 'Status Tracking',
    desc: 'Mark feedback as open, in-progress, or resolved. Track what\'s been addressed and what still needs work.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'from-orange-500 to-rose-500',
    glow: 'shadow-orange-500/30',
    title: 'Guest Invites',
    desc: 'Invite clients and stakeholders by email with a single link. They can comment without creating an account.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2v-1M8 21a2 2 0 01-2-2v-1m12 0a2 2 0 002-2v-1M4 18a2 2 0 01-2-2V8a2 2 0 012-2h4l2 2h4l2-2h4a2 2 0 012 2v8a2 2 0 01-2 2" />
      </svg>
    ),
    color: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/30',
    title: 'Multi-Project Dashboard',
    desc: 'Manage all your websites in one place. Organize projects, archive completed ones, and keep things tidy.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    color: 'from-pink-500 to-rose-600',
    glow: 'shadow-pink-500/30',
    title: 'Role-based Access',
    desc: 'Admin, member, and guest roles ensure everyone only sees what they need to. Your data stays protected.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold mb-4">
            ✦ Everything you need
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Feedback that actually{' '}
            <span style={{ background: 'linear-gradient(135deg,#6357ff,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              makes sense
            </span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Stop chasing vague comments in email threads. Feedbackly makes every piece of feedback clear, contextual, and actionable.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`reveal reveal-delay-${Math.min(i + 1, 5)} group relative p-6 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-xl transition-all duration-300 cursor-default`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} text-white flex items-center justify-center mb-5 shadow-lg ${f.glow} group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>

              {/* Subtle hover gradient */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
