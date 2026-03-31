import React from 'react';
import { CheckIcon, ArrowRightIcon } from './icons';
import { PLANS } from '../data/pricing';
import useScrollReveal from '../hooks/useScrollReveal';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3001';

export default function PricingSection() {
  const ref = useScrollReveal();

  return (
    <section id="pricing" className="bg-white py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Pricing</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-500 mt-4">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mt-16">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? 'border-2 border-blue-500 bg-gradient-to-b from-blue-50/50 to-white shadow-xl ring-1 ring-blue-500/20 scale-[1.02]'
                  : 'border border-gray-200 bg-white hover:-translate-y-1'
              }`}
              data-reveal
              data-delay={String(i + 1)}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-blue-500/25">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3 className="font-display font-semibold text-lg text-gray-900">{plan.name}</h3>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-gray-900">{plan.priceLabel}</span>
                {plan.period && <span className="text-gray-400 text-base">{plan.period}</span>}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 my-6" />

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8">
                <a
                  href={plan.id === 'enterprise' ? '#' : `${APP_URL}/signup`}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5'
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {plan.cta}
                  {plan.popular && <ArrowRightIcon className="w-4 h-4" />}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
