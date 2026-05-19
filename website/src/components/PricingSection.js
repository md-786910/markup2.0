import React, { useEffect, useState } from 'react';
import { CheckIcon, ArrowRightIcon } from './icons';
import { PLANS as STATIC_PLANS } from '../data/pricing';
import useScrollReveal from '../hooks/useScrollReveal';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CTA_BY_ID = {
  free: 'Get Started Free',
  starter: 'Start Free Trial',
  pro: 'Start Free Trial',
  enterprise: 'Contact Sales',
};

export default function PricingSection() {
  const ref = useScrollReveal();
  const [plans, setPlans] = useState(STATIC_PLANS);

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/api/plans`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!alive || !data?.planList) return;
        const livePlans = data.planList
          .filter((plan) => plan.enabled !== false)
          .map((plan) => ({
            id: plan.id,
            name: plan.name,
            price: plan.price,
            priceLabel: plan.priceLabel,
            period: plan.period,
            features: plan.features || [],
            popular: !!plan.popular,
            cta: CTA_BY_ID[plan.id] || 'Get Started',
          }));
        if (livePlans.length) setPlans(livePlans);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="pricing" className="section-shell py-20 sm:py-24" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Pricing
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-950 md:text-4xl lg:text-5xl">
            Pricing built for review velocity,
            <span className="block text-[#3f4cf6]">not procurement theater</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-500">
            Clear tiers, fast onboarding, and collaboration features that scale from one stakeholder to a full delivery team.
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article
              key={plan.id}
              className={`hover-lift relative rounded-[30px] p-8 ${
                plan.popular
                  ? 'bg-[#111827] text-white shadow-[0_28px_80px_rgba(17,24,39,0.24)]'
                  : 'premium-card text-slate-950'
              }`}
              data-reveal="scale"
              data-delay={String(index + 1)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-8 rounded-full bg-[#3f4cf6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_16px_36px_rgba(63,76,246,0.3)]">
                  Most popular
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.popular ? 'text-white/65' : 'text-slate-500'}`}>
                    {plan.id === 'enterprise' ? 'Custom onboarding and security controls.' : 'Fast setup for collaborative review teams.'}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  plan.popular ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-500'
                }`}>
                  {plan.id === 'enterprise' ? 'Scale' : 'Monthly'}
                </span>
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-5xl font-bold tracking-tight">{plan.priceLabel}</span>
                {plan.period ? (
                  <span className={`pb-1 text-sm ${plan.popular ? 'text-white/60' : 'text-slate-400'}`}>{plan.period}</span>
                ) : null}
              </div>

              <div className={`mt-8 h-px ${plan.popular ? 'bg-white/12' : 'bg-slate-200'}`} />

              <ul className="mt-8 space-y-3">
                {(plan.features || []).map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                      plan.popular ? 'bg-white/12' : 'bg-emerald-100'
                    }`}>
                      <CheckIcon className={`h-3 w-3 ${plan.popular ? 'text-white' : 'text-emerald-600'}`} />
                    </div>
                    <span className={`text-sm leading-6 ${plan.popular ? 'text-white/75' : 'text-slate-600'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.id === 'enterprise' ? 'mailto:hello@feedbackly.online' : `${APP_URL}/onboarding`}
                className={`mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-300 ${
                  plan.popular
                    ? 'bg-[#3f4cf6] text-white shadow-[0_16px_36px_rgba(63,76,246,0.28)] hover:-translate-y-px'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {plan.cta}
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
