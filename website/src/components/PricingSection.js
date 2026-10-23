import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from './icons';
import { TRIAL_NOTE } from '../data/pricing';
import PlanCards from './PlanCards';
import useScrollReveal from '../hooks/useScrollReveal';

export default function PricingSection() {
  const ref = useScrollReveal();
  return (
    <section id="pricing" className="soft-band section-pad scroll-mt-24" ref={ref}>
      <div className="site-container">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <span className="eyebrow">Pricing</span>
          <h2 className="section-heading mt-5">Simple plans. Start with a free trial.</h2>
          <p className="body-large mt-4">{TRIAL_NOTE} Pay monthly, cancel any time.</p>
        </div>
        <div className="mt-14">
          <PlanCards reveal />
        </div>
        <p className="mt-10 text-center">
          <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-[#003dff] hover:text-[#0031d1]">
            Compare every feature
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
