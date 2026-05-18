import React, { useState } from 'react';

const steps = [
  {
    num: '01',
    color: 'bg-brand-500',
    textColor: 'text-brand-600',
    bgLight: 'bg-brand-50',
    title: 'Add your website',
    desc: 'Create a project and paste your website URL. Install our lightweight browser extension or embed one line of script — you\'re ready.',
    visual: (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">New Project</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Project name</p>
            <div className="h-9 bg-gray-50 border border-gray-200 rounded-lg flex items-center px-3">
              <span className="text-sm text-gray-700">My Landing Page</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Website URL</p>
            <div className="h-9 bg-gray-50 border border-brand-300 rounded-lg flex items-center px-3 ring-2 ring-brand-100">
              <span className="text-sm text-gray-400">https://</span>
              <span className="text-sm text-gray-700">yoursite.com</span>
            </div>
          </div>
          <div className="h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-sm font-semibold text-white">Create Project →</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '02',
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    title: 'Invite your team',
    desc: 'Send invite links to teammates, designers, developers, and clients. Everyone gets access without any technical setup.',
    visual: (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team Members</p>
        {[
          { name: 'Sarah Kim', role: 'Admin', color: 'from-blue-400 to-blue-600' },
          { name: 'Mike Torres', role: 'Member', color: 'from-purple-400 to-purple-600' },
          { name: 'Anna Lee', role: 'Guest', color: 'from-rose-400 to-rose-600' },
        ].map(m => (
          <div key={m.name} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
              {m.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800">{m.name}</p>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{m.role}</span>
          </div>
        ))}
        <button className="mt-3 w-full h-8 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-colors">
          + Invite someone
        </button>
      </div>
    ),
  },
  {
    num: '03',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    title: 'Collect & resolve feedback',
    desc: 'Click anywhere on the page to pin comments. Discuss, resolve, and ship — all in one streamlined workflow.',
    visual: (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Feedback Pins</p>
        {[
          { num: 1, text: 'CTA color is off-brand', status: 'open', statusColor: 'bg-orange-100 text-orange-600' },
          { num: 2, text: 'Font size too small on mobile', status: 'in progress', statusColor: 'bg-blue-100 text-blue-600' },
          { num: 3, text: 'Hero image updated ✓', status: 'resolved', statusColor: 'bg-emerald-100 text-emerald-600' },
        ].map(p => (
          <div key={p.num} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="w-6 h-6 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {p.num}
            </div>
            <p className="text-xs text-gray-700 flex-1 min-w-0 truncate">{p.text}</p>
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${p.statusColor}`}>{p.status}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function HowItWorksSection() {
  const [active, setActive] = useState(0);

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-semibold mb-4 shadow-sm">
            ⚡ How it works
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Up and running in{' '}
            <span style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              minutes
            </span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Three simple steps is all it takes to bring your team's feedback into one place.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Step list */}
          <div className="space-y-4 reveal">
            {steps.map((s, i) => (
              <button
                key={s.num}
                onClick={() => setActive(i)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                  active === i
                    ? 'bg-white border-gray-200 shadow-lg'
                    : 'bg-transparent border-transparent hover:bg-white/60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 transition-all ${active === i ? s.color : 'bg-gray-200'}`}>
                    {s.num}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-base mb-1 transition-colors ${active === i ? 'text-gray-900' : 'text-gray-500'}`}>
                      {s.title}
                    </h3>
                    {active === i && (
                      <p className="text-sm text-gray-500 leading-relaxed animate-fade-in">{s.desc}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Visual */}
          <div className="reveal reveal-delay-2">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-brand-100 to-purple-100 rounded-3xl blur-2xl opacity-60" />
              <div className="relative">
                {steps[active].visual}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
