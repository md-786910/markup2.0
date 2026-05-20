import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';
import { PLANS as STATIC_PLANS } from '../data/pricing';
import { ArrowRightIcon, CheckIcon, ClockIcon, ShieldIcon, UsersIcon, XIcon, ZapIcon } from '../components/icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PLAN_COPY = {
  starter: 'For lean teams moving client and internal review out of email.',
  pro: 'For teams that need unlimited projects, integrations, and faster handoff.',
  enterprise: 'For organizations with security, onboarding, and procurement needs.',
};

const FEATURES = [
  ['Unlimited pinned comments', true, true, true],
  ['Guest review links', true, true, true],
  ['Version history', false, true, true],
  ['Slack, Jira, and Discord integrations', false, true, true],
  ['Advanced access controls', false, true, true],
  ['Dedicated onboarding', false, false, true],
  ['SLA and priority routing', false, false, true],
];

const FAQ = [
  ['Can I try Markly before paying?', 'Yes. Starter and Pro include a free trial so your team can run a real review before choosing a plan.'],
  ['Do client reviewers count as members?', 'Guests are separate from team members. You can invite clients through controlled review links without adding them to your internal workspace.'],
  ['What happens if we outgrow our plan?', 'You can upgrade when your team needs more guests, integrations, or project volume. Enterprise is available for custom onboarding and security requirements.'],
  ['Can we cancel monthly plans?', 'Yes. Monthly plans can be cancelled any time from billing settings.'],
];

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const [plans, setPlans] = useState(STATIC_PLANS);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
            cta: plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial',
          }));
        if (livePlans.length) setPlans(livePlans);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const displayedPlans = useMemo(() => (
    plans.map((plan) => {
      if (billing === 'annual' && typeof plan.price === 'number') {
        const annualPrice = Math.round(plan.price * 0.8);
        return { ...plan, priceLabel: `$${annualPrice}`, period: '/month' };
      }
      return plan;
    })
  ), [billing, plans]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content">
        <section className="page-hero">
          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <span className="eyebrow">Pricing</span>
            <h1 className="display-heading mt-6">
              Plans that scale with review volume, not confusion.
            </h1>
            <p className="body-large mx-auto mt-6 max-w-2xl">
              Start small, bring in guests, and expand into integrations and security controls when your workflow needs them.
            </p>
            <div className="mx-auto mt-8 grid w-full max-w-xs grid-cols-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {[
                ['monthly', 'Monthly'],
                ['annual', 'Annual -20%'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBilling(value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    billing === value ? 'bg-[#2854ff] text-white shadow-[0_10px_24px_rgba(40,84,255,0.22)]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16 sm:pb-20 lg:pb-24">
          <div className="site-container grid gap-5 lg:grid-cols-3">
            {displayedPlans.map((plan) => (
              <article
                key={plan.id}
                className={`relative rounded-[24px] p-7 sm:p-8 ${
                  plan.popular
                    ? 'bg-[#101626] text-white shadow-[0_28px_80px_rgba(16,22,38,0.24)]'
                    : 'premium-card text-slate-950'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-8 rounded-full bg-[#8fd14f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#101626]">
                    Best fit
                  </div>
                )}
                <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                <p className={`mt-3 min-h-[3.25rem] text-sm leading-6 ${plan.popular ? 'text-white/68' : 'text-slate-500'}`}>
                  {PLAN_COPY[plan.id] || 'Flexible review tooling for modern delivery teams.'}
                </p>
                <div className="mt-8 flex items-end gap-2">
                  <span className="font-display text-5xl font-bold tracking-tight">{plan.priceLabel}</span>
                  {plan.period ? <span className={`pb-1 text-sm ${plan.popular ? 'text-white/60' : 'text-slate-400'}`}>{plan.period}</span> : null}
                </div>
                {billing === 'annual' && typeof plan.price === 'number' ? (
                  <p className={`mt-2 text-xs font-medium ${plan.popular ? 'text-[#8fd14f]' : 'text-emerald-600'}`}>Billed annually, save 20%</p>
                ) : (
                  <p className={`mt-2 text-xs font-medium ${plan.popular ? 'text-white/45' : 'text-slate-400'}`}>Monthly billing available</p>
                )}
                <a
                  href={plan.id === 'enterprise' ? 'mailto:hello@feedbackly.online' : `${APP_URL}/onboarding`}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition ${
                    plan.popular ? 'bg-[#2854ff] text-white hover:bg-[#1f45dd]' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {plan.cta}
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon className={`mt-1 h-4 w-4 flex-none ${plan.popular ? 'text-[#8fd14f]' : 'text-emerald-600'}`} />
                      <span className={`text-sm leading-6 ${plan.popular ? 'text-white/76' : 'text-slate-600'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="soft-band section-pad">
          <div className="site-container">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div>
                <span className="eyebrow">Compare</span>
                <h2 className="section-heading mt-5">See what changes by tier.</h2>
                <p className="body-copy mt-4">Core review flows are available from day one. Higher tiers add scale, automation, and security controls.</p>
              </div>
              <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.055)]">
                <div className="min-w-[660px]">
                <div className="grid grid-cols-[1.4fr_repeat(3,0.7fr)] border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700">
                  <span>Feature</span>
                  <span>Starter</span>
                  <span>Pro</span>
                  <span>Enterprise</span>
                </div>
                {FEATURES.map(([feature, starter, pro, enterprise]) => (
                  <div key={feature} className="grid grid-cols-[1.4fr_repeat(3,0.7fr)] items-center border-b border-slate-100 px-5 py-4 text-sm last:border-0">
                    <span className="font-medium text-slate-700">{feature}</span>
                    {[starter, pro, enterprise].map((included, index) => (
                      <span key={`${feature}-${index}`} className={included ? 'text-emerald-600' : 'text-slate-300'}>
                        {included ? <CheckIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
                      </span>
                    ))}
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-3">
              {[
                [ClockIcon, 'Fast onboarding', 'Start from a URL or upload and invite reviewers in seconds.'],
                [UsersIcon, 'Guest-friendly', 'Clients and stakeholders can review without learning another tool.'],
                [ShieldIcon, 'Controlled access', 'Password links, private projects, and workspace roles keep reviews governed.'],
              ].map(([Icon, title, copy]) => (
                <div key={title} className="premium-card p-6">
                  <Icon className="h-6 w-6 text-[#2854ff]" />
                  <h3 className="mt-5 font-display text-xl font-semibold text-slate-950">{title}</h3>
                  <p className="body-copy mt-3">{copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-14">
              <div className="text-center">
                <ZapIcon className="mx-auto h-7 w-7 text-[#2854ff]" />
                <h2 className="section-heading mt-4 text-3xl lg:text-4xl">Pricing questions</h2>
              </div>
              <div className="mx-auto mt-8 max-w-3xl space-y-3">
                {FAQ.map(([question, answer], index) => (
                  <div key={question} className="rounded-2xl border border-slate-200 bg-white">
                    <button type="button" className="flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-slate-900" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                      {question}
                      <span className="text-[#2854ff]">{openFaq === index ? '-' : '+'}</span>
                    </button>
                    {openFaq === index ? <p className="px-5 pb-5 text-sm leading-7 text-slate-500">{answer}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
