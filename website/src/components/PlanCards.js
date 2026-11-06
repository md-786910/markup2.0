import React, { useEffect, useState } from 'react';
import { PLANS as STATIC_PLANS, CTA_BY_ID, PLAN_COPY } from '../data/pricing';
import { PricingCards, APP_URL } from './site';

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

// Design system PricingCards: the featured plan has the brand border and the only primary button
export default function PlanCards() {
  const plans = usePlans();
  return (
    <PricingCards
      plans={plans.map((plan) => ({
        name: plan.name,
        price: plan.priceLabel,
        period: plan.period,
        tagline: PLAN_COPY[plan.id],
        features: plan.features,
        featured: plan.popular,
        badge: plan.popular ? 'Most popular' : null,
        cta: {
          label: plan.cta,
          href: plan.id === 'enterprise' ? 'mailto:hello@kommently.app' : `${APP_URL}/onboarding`,
        },
      }))}
    />
  );
}
