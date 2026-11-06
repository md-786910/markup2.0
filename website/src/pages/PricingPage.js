import React, { useEffect } from 'react';
import { TRIAL_NOTE } from '../data/pricing';
import PlanCards from '../components/PlanCards';
import { SiteLayout, Section, SectionHeader, FAQ as FaqBlock, CTABand, Icon, SmartLink } from '../components/site';


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
    <SiteLayout>
      {/* Plans */}
      <Section tone="light" className="km-pricing-top">
        <SectionHeader
          as="h1"
          eyebrow="Pricing"
          title="Simple pricing that grows with your reviews"
          lead="Every new account starts with a 30-day Pro trial. No credit card, no setup fee, cancel any time."
        />
        <PlanCards />
        <p className="km-note km-center" style={{ marginTop: 24 }}>{TRIAL_NOTE}</p>
      </Section>

      {/* What changes by tier */}
      <Section tone="muted">
        <SectionHeader
          eyebrow="Compare"
          title="See what changes by tier"
          lead="Every plan reviews websites, PDFs and images. Higher tiers add scale, client links, integrations and history."
        />
        <div className="km-table-wrap">
          <table className="km-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                {COMPARE_PLANS.map((name) => <th key={name} scope="col">{name}</th>)}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(([feature, ...values]) => (
                <tr key={feature}>
                  <td>{feature}</td>
                  {values.map((value, index) => (
                    <td key={`${feature}-${index}`}>
                      {typeof value === 'string' ? value : value
                        ? <span style={{ color: 'var(--brand-600)', display: 'inline-flex' }} title="Included"><Icon name="check" size={16} stroke={2.4} /><span className="sr-only">Included</span></span>
                        : <span style={{ color: 'var(--slate-400)', display: 'inline-flex' }} title="Not included"><Icon name="x" size={16} /><span className="sr-only">Not included</span></span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* How we compare */}
      <Section tone="light">
        <SectionHeader
          eyebrow="How we compare"
          title="Clear pricing, side by side"
          lead="Published prices of popular visual feedback tools, monthly billing."
        />
        <div className="km-table-wrap">
          <table className="km-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Compare</span></th>
                {COMPETITORS.map((c) => (
                  <th key={c.name} scope="col" style={c.url ? undefined : { background: 'var(--brand-50)', color: 'var(--brand-600)' }}>{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(([key, label]) => (
                <tr key={key}>
                  <th scope="row" style={{ background: 'var(--surface)', fontWeight: 500, whiteSpace: 'normal' }}>{label}</th>
                  {COMPETITORS.map((c) => (
                    <td key={c.name} style={c.url ? undefined : { background: 'var(--brand-50)', color: 'var(--text)', fontWeight: 600 }}>{c[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="km-note km-center" style={{ maxWidth: 820, margin: '16px auto 0' }}>
          Prices from each vendor&rsquo;s pricing page, checked in {COMPARED_ON}:{' '}
          {COMPETITORS.filter((c) => c.url).map((c, i, list) => (
            <React.Fragment key={c.name}>
              <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{c.name}</a>
              {i < list.length - 1 ? ', ' : ''}
            </React.Fragment>
          ))}
          . A team of 10 is the cheapest published plan that includes 10 members (BugHerd Studio, Pastel Team with 5 extra users, ruttl 10 × Pro).
          Features and limits differ between tools, so compare the plans that fit how you work. All product names are trademarks of their owners.
        </p>
      </Section>

      <FaqBlock
        title="Before you choose"
        items={FAQ.map(([q, a]) => ({ q, a }))}
      >
        <p className="km-note km-center" style={{ marginTop: 20 }}>
          Anything else? <SmartLink href="/support" className="kc-link">Ask us</SmartLink>.
        </p>
      </FaqBlock>

      <CTABand
        title="Your next review round starts with a link"
        text="Paste a URL, invite your team or client, and resolve every comment where the work lives."
        secondary={{ label: 'Contact support', href: '/support' }}
      />
    </SiteLayout>
  );
}
