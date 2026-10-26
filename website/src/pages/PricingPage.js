import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';
import { TRIAL_NOTE } from '../data/pricing';
import PlanCards from '../components/PlanCards';
import { CheckIcon, ClockIcon, ShieldIcon, UsersIcon, XIcon, ZapIcon } from '../components/icons';


// Same limits as server/config/plans.js
const COMPARE_PLANS = ['Free', 'Starter', 'Pro', 'Enterprise'];
const FEATURES = [
  ['Pinned comments and threads', true, true, true, true],
  ['Website, PDF, and image review', true, true, true, true],
  ['Desktop, tablet, and mobile pins', true, true, true, true],
  ['Projects', '2', '15', 'Unlimited', 'Unlimited'],
  ['Workspaces (group projects per client)', '1', '3', 'Unlimited', 'Unlimited'],
  ['Workspace review links for clients', false, true, true, true],
  ['Team members', '5', '25', 'Unlimited', 'Unlimited'],
  ['Guests', '2', '10', '50', 'Custom'],
  ['Storage', '200 MB', '5 GB', '25 GB', '100 GB'],
  ['Guest review links', false, true, true, true],
  ['Slack, Jira, Discord, and Teams', false, true, true, true],
  ['Activity log', false, true, true, true],
  ['Version history', false, false, true, true],
  ['Custom terms and onboarding', false, false, false, true],
];

const FAQ = [
  ['Can I try Kommently for free before paying?', 'Yes. Every new workspace starts with a 30-day free trial with all Pro features, and no credit card is required. We email you before the trial ends so you can choose a plan.'],
  ['Do client reviewers count as members?', 'No. Guests have their own allowance (2 on Free, 10 on Starter, 50 on Pro) and review through a share link without joining your workspace.'],
  ['What happens if we outgrow our plan?', 'Upgrade any time from Settings → Billing when you need more projects, guests, or storage. Enterprise covers custom limits, terms, and onboarding.'],
  ['Can we cancel monthly plans?', 'Yes. Cancel any time from Settings → Billing. You keep your plan until the end of the period you already paid for, and you are not charged again.'],
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content">
        <section className="page-hero">
          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <span className="eyebrow">Pricing</span>
            <h1 className="display-heading mt-6">
              Simple pricing that grows with your reviews.
            </h1>
            <p className="body-large mx-auto mt-6 max-w-2xl">
              Every workspace starts with a 30-day Pro trial. No credit card, no setup fee, cancel any time.
            </p>
          </div>
        </section>

        <section className="pb-16 sm:pb-20 lg:pb-24">
          <div className="site-container">
            <PlanCards />
            <p className="mt-8 text-center text-sm font-medium text-slate-500">{TRIAL_NOTE}</p>
          </div>
        </section>

        <section className="soft-band section-pad">
          <div className="site-container">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div>
                <span className="eyebrow">Compare</span>
                <h2 className="section-heading mt-5">See what changes by tier.</h2>
                <p className="body-copy mt-4">Core review flows are available from day one. Higher tiers add scale, integrations, and history.</p>
                <p className="mt-4 text-sm font-semibold text-[#003dff]">{TRIAL_NOTE}</p>
              </div>
              <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.055)]">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[1.6fr_repeat(4,0.7fr)] border-b border-slate-200 bg-[#f8fafc] px-5 py-4 text-sm font-semibold text-[#475569]">
                    <span>Feature</span>
                    {COMPARE_PLANS.map((name) => <span key={name}>{name}</span>)}
                  </div>
                  {FEATURES.map(([feature, ...values]) => (
                    <div key={feature} className="grid grid-cols-[1.6fr_repeat(4,0.7fr)] items-center border-b border-slate-100 px-5 py-4 text-sm last:border-0">
                      <span className="font-medium text-[#475569]">{feature}</span>
                      {values.map((value, index) => (
                        <span key={`${feature}-${index}`} className={value ? 'text-[#0f172a]' : 'text-[#94a3b8]'}>
                          {typeof value === 'string'
                            ? <span className="font-medium">{value}</span>
                            : value ? <CheckIcon className="h-4 w-4 text-[#003dff]" /> : <XIcon className="h-4 w-4" />}
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
                [ShieldIcon, 'Controlled access', 'Password-protected, expiring guest links and workspace roles keep reviews governed.'],
              ].map(([Icon, title, copy]) => (
                <div key={title} className="premium-card p-6">
                  <Icon className="h-6 w-6 text-[#003dff]" />
                  <h3 className="mt-5 font-display text-xl font-semibold text-[#0f172a]">{title}</h3>
                  <p className="body-copy mt-3">{copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-14">
              <div className="text-center">
                <ZapIcon className="mx-auto h-7 w-7 text-[#003dff]" />
                <h2 className="section-heading mt-4 text-3xl lg:text-4xl">Pricing questions</h2>
              </div>
              <div className="mx-auto mt-8 max-w-3xl space-y-3">
                {FAQ.map(([question, answer], index) => (
                  <div key={question} className="rounded-2xl border border-slate-200 bg-white">
                    <button type="button" className="flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-[#0f172a]" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                      {question}
                      <span className="text-[#003dff]">{openFaq === index ? '-' : '+'}</span>
                    </button>
                    {openFaq === index ? <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{answer}</p> : null}
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


