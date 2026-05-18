import React from 'react';

const testimonials = [
  {
    quote: "Feedbackly completely changed how we review client websites. No more back-and-forth emails trying to describe where a bug is.",
    name: 'Sarah Mitchell',
    title: 'Lead Designer, Pixel Studio',
    initials: 'SM',
    color: 'from-violet-400 to-purple-600',
  },
  {
    quote: "Our development sprints are 30% faster since we started using Feedbackly. The annotations are precise and everyone stays aligned.",
    name: 'James Ortega',
    title: 'CTO, LaunchPad Agency',
    initials: 'JO',
    color: 'from-blue-400 to-sky-600',
  },
  {
    quote: "Client approvals used to take weeks. Now they click once, leave a comment, and we're done. Absolutely love it.",
    name: 'Priya Sharma',
    title: 'Project Manager, CreativeWave',
    initials: 'PS',
    color: 'from-emerald-400 to-teal-600',
  },
];

const stats = [
  { value: '10k+', label: 'Annotations collected' },
  { value: '500+', label: 'Teams onboarded' },
  { value: '98%', label: 'Customer satisfaction' },
  { value: '3×', label: 'Faster review cycles' },
];

export default function SocialProofSection() {
  return (
    <section className="py-24 lg:py-32 bg-gray-950 relative overflow-hidden">

      {/* Background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-[#0c0820] to-gray-950" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-900/20 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20 reveal">
          {stats.map(s => (
            <div key={s.label} className="text-center p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
              <p className="text-4xl font-extrabold text-white mb-1">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section heading */}
        <div className="text-center mb-12 reveal">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
            Loved by product teams
          </h2>
          <p className="text-gray-500">Here's what teams say about shipping with Feedbackly.</p>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`reveal reveal-delay-${i + 1} p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300`}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
