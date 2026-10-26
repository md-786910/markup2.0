import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';
import { TRIAL_NOTE } from '../data/pricing';
import PlanCards from '../components/PlanCards';
import { CheckIcon, XIcon } from '../components/icons';
import Accordion from '../components/Accordion';


// Same limits as server/config/plans.js
const COMPARE_PLANS = ['Free', 'Starter', 'Pro', 'Enterprise'];
const FEATURES = [
  ['Websites, PDFs and images on desktop, tablet and mobile', true, true, true, true],
  ['Projects', '2', '15', 'Unlimited', 'Unlimited'],
  ['Workspaces (one per client)', '1', '3', 'Unlimited', 'Unlimited'],
  ['Team members', '5', '25', 'Unlimited', 'Unlimited'],
  ['Guests', '2', '10', '50', 'Custom'],
  ['Storage', '200 MB', '5 GB', '25 GB', '100 GB'],
  ['Client review links (project and workspace)', false, true, true, true],
  ['Slack, Jira, Discord and Teams', false, true, true, true],
  ['Activity log', false, true, true, true],
  ['Version history', false, false, true, true],
];

// Published prices, monthly billing, checked on each vendor's pricing page
// in October 2026. Keep factual; update the date when re-checking.
const COMPARED_ON = 'October 2026';
const COMPETITORS = [
  { name: 'Kommently', url: null, from: '$12/mo', includes: 'Starter: 25 members, 15 projects', model: 'Flat per plan', free: '2 projects', trial: '30 days, no card', team10: '$12' },
  { name: 'MarkUp.io', url: 'https://www.markup.io/pricing', from: '$79/mo', includes: 'Pro: unlimited users, 50 MarkUps, 1 workspace', model: 'Flat per plan', free: 'No', trial: '14 days', team10: '$79' },
  { name: 'BugHerd', url: 'https://bugherd.com/pricing', from: '$50/mo', includes: 'Standard: 5 members, unlimited guests', model: 'Flat, by member count', free: 'No', trial: 'Yes', team10: '$80' },
  { name: 'Pastel', url: 'https://usepastel.com/plans', from: '$35/mo', includes: 'Pro: 2 users, 3 canvases', model: 'Flat, plus extra users', free: '1 user, 1 active canvas', trial: '14 days, no card', team10: '$239' },
  { name: 'ruttl', url: 'https://www.ruttl.com/pricing', from: '$18/user/mo', includes: 'Pro: unlimited projects', model: 'Per user', free: '1 project, 10 comments', trial: '—', team10: '$180' },
];
const COMPARE_ROWS = [
  ['from', 'Paid plans from'],
  ['includes', 'What that includes'],
  ['model', 'Pricing model'],
  ['free', 'Free plan'],
  ['trial', 'Free trial'],
  ['team10', 'A team of 10, per month'],
];

const FAQ = [
  ['Can I try Kommently for free before paying?', 'Yes. Every new account starts with a 30-day free trial with all Pro features, and no credit card is required. We email you before the trial ends so you can choose a plan.'],
  ['Do client reviewers count as members?', 'No. Guests have their own allowance (2 on Free, 10 on Starter, 50 on Pro) and review through a share link without joining your workspace.'],
  ['What happens if we outgrow our plan?', 'Upgrade any time from Settings → Billing when you need more projects, guests, or storage. Enterprise covers custom limits, terms, and onboarding.'],
  ['Can we cancel monthly plans?', 'Yes. Cancel any time from Settings → Billing. You keep your plan until the end of the period you already paid for, and you are not charged again.'],
];

export default function PricingPage() {

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
              Every new account starts with a 30-day Pro trial. No credit card, no setup fee, cancel any time.
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
                <p className="body-copy mt-4">Every plan reviews websites, PDFs and images. Higher tiers add scale, client links, integrations and history.</p>
                <p className="mt-4 text-sm font-semibold text-[#003dff]">{TRIAL_NOTE}</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[1.6fr_repeat(4,0.7fr)] border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                    <span>Feature</span>
                    {COMPARE_PLANS.map((name) => <span key={name}>{name}</span>)}
                  </div>
                  {FEATURES.map(([feature, ...values]) => (
                    <div key={feature} className="grid grid-cols-[1.6fr_repeat(4,0.7fr)] items-center border-b border-slate-100 px-5 py-3 text-sm last:border-0">
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
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">How we compare</span>
              <h2 className="section-heading mt-5">Clear pricing, side by side.</h2>
              <p className="body-large mt-4">Published prices of popular visual feedback tools, monthly billing.</p>
            </div>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-5 py-3 font-semibold text-slate-700"><span className="sr-only">Compare</span></th>
                    {COMPETITORS.map((c) => (
                      <th key={c.name} scope="col" className={`px-4 py-3 font-semibold ${c.url ? 'text-slate-700' : 'bg-[#eef3ff] text-[#003dff]'}`}>{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map(([key, label]) => (
                    <tr key={key} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-3 font-medium text-slate-600">{label}</th>
                      {COMPETITORS.map((c) => (
                        <td key={c.name} className={`px-4 py-3 ${c.url ? 'text-slate-700' : 'bg-[#eef3ff]/60 font-semibold text-slate-950'} ${key === 'from' || key === 'team10' ? 'font-semibold' : ''}`}>
                          {c[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mx-auto mt-4 max-w-4xl text-center text-xs leading-5 text-slate-500">
              Prices from each vendor&rsquo;s pricing page, checked in {COMPARED_ON}:{' '}
              {COMPETITORS.filter((c) => c.url).map((c, i, list) => (
                <React.Fragment key={c.name}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">{c.name}</a>
                  {i < list.length - 1 ? ', ' : ''}
                </React.Fragment>
              ))}
              . A team of 10 is the cheapest published plan that includes 10 members (BugHerd Studio, Pastel Team with 5 extra users, ruttl 10 × Pro).
              Features and limits differ between tools, so compare the plans that fit how you work. All product names are trademarks of their owners.
            </p>

            <div className="mt-20 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <span className="eyebrow">Pricing questions</span>
                <h2 className="section-heading mt-5">Before you choose.</h2>
                <p className="body-large mt-4">Anything else? <a href="/support" className="font-medium text-[#003dff] hover:underline">Ask us</a>.</p>
              </div>
              <Accordion items={FAQ.map(([question, answer]) => ({ question, answer }))} idPrefix="pricing-faq" />
            </div>
          </div>
        </section>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}


