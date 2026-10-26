import React, { useEffect, useState } from 'react';
import { ArrowRightIcon, CheckIcon } from './icons';
import { PLANS as STATIC_PLANS, CTA_BY_ID, PLAN_COPY } from '../data/pricing';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Live plans from /api/plans (incl. admin overrides), static fallback until then
function usePlans() {
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
            cta: CTA_BY_ID[plan.id] || 'Get started',
          }));
        if (livePlans.length) setPlans(livePlans);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return plans;
}

export default function PlanCards({ reveal = false }) {
  const plans = usePlans();
  return (
    <div className={`grid gap-5 md:grid-cols-2 ${plans.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
      {plans.map((plan, index) => (
        <article
          key={plan.id}
          className={`relative flex flex-col rounded-2xl bg-white p-7 ${plan.popular ? 'border-2 border-[#003dff]' : 'border border-slate-200'}`}
          {...(reveal ? { 'data-reveal': true, 'data-delay': String(index + 1) } : {})}
        >
          {plan.popular && (
            <span className="absolute -top-3 left-7 rounded-full bg-[#003dff] px-3 py-1 text-xs font-semibold text-white">Most popular</span>
          )}
          <h3 className="font-display text-xl font-bold text-slate-950">{plan.name}</h3>
          <p className="mt-2 min-h-[3rem] text-sm xl:min-h-[4.5rem] leading-6 text-slate-500">{PLAN_COPY[plan.id]}</p>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold tracking-tight text-slate-950">{plan.priceLabel}</span>
            {plan.period ? <span className="text-sm text-slate-500">{plan.period}</span> : null}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {plan.price ? 'Billed monthly' : plan.id === 'free' ? 'No card needed' : 'Talk to us'}
          </p>
          <a
            href={plan.id === 'enterprise' ? 'mailto:hello@kommently.app' : `${APP_URL}/onboarding`}
            className={`mt-6 w-full ${plan.popular ? 'button-primary' : 'button-secondary'}`}
          >
            {plan.cta}
            <ArrowRightIcon className="h-4 w-4" />
          </a>
          <ul className="mt-7 space-y-3 border-t border-slate-100 pt-6">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#003dff]" />
                {feature}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
