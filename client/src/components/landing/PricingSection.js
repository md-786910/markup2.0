import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const plans = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: '$0',
    period: '/30 days',
    desc: 'Explore all features with no commitment.',
    features: ['5 projects', '10 team members', '5 guest seats', 'All core features', 'Email support'],
    cta: 'Start free trial',
    ctaTo: '/onboarding',
    highlighted: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$12',
    period: '/month',
    desc: 'For small teams shipping frequently.',
    features: ['15 projects', '25 team members', '10 guest seats', 'Priority support', 'Custom workspace logo'],
    cta: 'Coming soon',
    ctaTo: null,
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/month',
    desc: 'For agencies and growing organizations.',
    features: ['Unlimited projects', 'Unlimited members', '50 guest seats', 'Custom branding', 'API access', 'Dedicated support'],
    cta: 'Coming soon',
    ctaTo: null,
    highlighted: false,
  },
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto mb-14 reveal">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold mb-4">
            💳 Simple pricing
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Transparent,{' '}
            <span style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              no surprises
            </span>
          </h2>
          <p className="text-lg text-gray-500 mb-6">
            Start free. Upgrade when your team is ready. No credit card required.
          </p>
          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Annual <span className="text-emerald-600 font-semibold">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`reveal reveal-delay-${i + 1} relative rounded-2xl border flex flex-col transition-all duration-300 ${
                plan.highlighted
                  ? 'border-brand-500 shadow-2xl shadow-brand-500/20 bg-gradient-to-b from-brand-950 to-gray-950'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-6 lg:p-8 flex-1">
                <p className={`text-sm font-semibold mb-1 ${plan.highlighted ? 'text-brand-300' : 'text-gray-500'}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {annual && plan.id !== 'trial'
                      ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}`
                      : plan.price}
                  </span>
                  <span className={`text-sm mb-1.5 ${plan.highlighted ? 'text-gray-400' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <svg className={`w-4 h-4 shrink-0 ${plan.highlighted ? 'text-brand-400' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.highlighted ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                {plan.ctaTo ? (
                  <Link
                    to={plan.ctaTo}
                    className={`w-full flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                      plan.highlighted
                        ? 'bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/30'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
