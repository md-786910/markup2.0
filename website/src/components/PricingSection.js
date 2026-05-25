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
      .catch(() => { });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="pricing" className="section-shell py-14 sm:py-14 px-10 sm:px-10" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#0f8f75] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Pricing</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Pricing built for review velocity,
            <span className="block text-gradient font-sans">not procurement theater</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#53645f] font-sans">
            Clear tiers, fast onboarding, and collaboration features that scale from one stakeholder to a full delivery team.
          </p>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article
              key={plan.id}
              className={`hover-lift relative rounded-[24px] p-8 ${plan.popular
                ? 'bg-[#10231f] text-white shadow-[0_28px_80px_rgba(16,35,31,0.26)] ring-1 ring-white/10'
                : 'premium-card text-[#10231f]'
                }`}
              data-reveal="scale"
              data-delay={String(index + 1)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-8 rounded-full bg-[#b8e36d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#10231f] shadow-[0_16px_36px_rgba(143,209,79,0.28)]">
                  Most popular
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.popular ? 'text-white/65' : 'text-[#53645f]'}`}>
                    {plan.id === 'enterprise' ? 'Custom onboarding and security controls.' : 'Fast setup for collaborative review teams.'}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${plan.popular ? 'bg-white/10 text-white/80' : 'bg-[#eaf6ef] text-[#53645f]'
                  }`}>
                  {plan.id === 'enterprise' ? 'Scale' : 'Monthly'}
                </span>
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-5xl font-bold tracking-tight">{plan.priceLabel}</span>
                {plan.period ? (
                  <span className={`pb-1 text-sm ${plan.popular ? 'text-white/60' : 'text-[#8a9b94]'}`}>{plan.period}</span>
                ) : null}
              </div>

              <div className={`mt-8 h-px ${plan.popular ? 'bg-white/12' : 'bg-emerald-100'}`} />

              <ul className="mt-8 space-y-3">
                {(plan.features || []).map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${plan.popular ? 'bg-white/12' : 'bg-emerald-100'
                      }`}>
                      <CheckIcon className={`h-3 w-3 ${plan.popular ? 'text-white' : 'text-emerald-600'}`} />
                    </div>
                    <span className={`text-sm leading-6 ${plan.popular ? 'text-white/75' : 'text-[#53645f]'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.id === 'enterprise' ? 'mailto:hello@feedbackly.online' : `${APP_URL}/onboarding`}
                className={`mt-10 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-300 ${plan.popular
                  ? 'bg-[#b8e36d] text-[#10231f] shadow-[0_16px_36px_rgba(143,209,79,0.28)] hover:-translate-y-px'
                  : 'border border-emerald-100 bg-white text-[#365047] hover:border-emerald-200 hover:bg-[#fbfff8]'
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

