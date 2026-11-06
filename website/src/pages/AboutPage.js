import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SiteLayout, Section, SectionHeader, FeatureGrid, Icon } from '../components/site';
import CtaSection from '../components/CtaSection';

// Only claims the product backs: no invented team, numbers or customers.
const PRINCIPLES = [
  {
    icon: 'chat',
    title: 'Feedback belongs on the work',
    text: 'A comment means most when it sits on the exact spot it is about, with the page, the device size and a screenshot attached. No more "the button near the top, on mobile, I think".',
  },
  {
    icon: 'zap',
    title: 'Nothing to install',
    text: 'Paste a link and start. No script on your site, no browser extension for your clients, no setup call. The faster a review starts, the faster it ends.',
  },
  {
    icon: 'team',
    title: 'Clients are part of the team',
    text: 'The people who sign off should find it as easy as the people who build. Clients review with a link, without an account, and their notes land next to yours.',
  },
  {
    icon: 'shield',
    title: 'Your work stays yours',
    text: 'Access is explicit: workspaces, levels and password-protected links. You can export everything or delete your organization from settings at any time.',
  },
];

const PROMISES = [
  'A free plan and a 30-day Pro trial, no credit card',
  'Prices on the website, monthly, cancel any time',
  'No tracking cookies unless you allow them',
  'A real person answers support, usually within one business day',
];

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SiteLayout>
      <Section tone="light" className="km-page-head">
        <SectionHeader
          as="h1"
          eyebrow="About Kommently"
          title="We make website feedback clear, fast and finished"
          lead="Kommently is a visual feedback tool for agencies, product teams and everyone who reviews websites, PDFs and images with their clients."
        />
      </Section>

      <Section tone="muted">
        <div className="km-split">
          <div className="km-split-t">
            <div className="km-eyebrow">Why we built it</div>
            <h2 className="km-h2 sm">Reviews shouldn&rsquo;t live in screenshots and email threads</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p className="km-lead" style={{ margin: 0 }}>
              Anyone who has shipped a website knows the routine: a client sends a screenshot with a red circle, a
              teammate replies in a chat, someone else forwards an email with &ldquo;a few small changes&rdquo;. By
              the third round nobody is sure which comment is still open, or which page it was about.
            </p>
            <p className="km-lead" style={{ margin: 0 }}>
              We built Kommently so the feedback stays on the work itself. Open the live site or the PDF, click the
              spot you mean and write your note. Everyone sees the same thread, with the context attached, and the
              comment is resolved when the fix is live.
            </p>
            <p className="km-lead" style={{ margin: 0 }}>
              Everything else follows from that: client review links that need no account, a workspace for every
              client, clear access for each person, and the integrations your team already uses.
            </p>
          </div>
        </div>
      </Section>

      <FeatureGrid
        tone="light"
        eyebrow="What we believe"
        title="Four ideas behind every feature"
        cols={2}
        items={PRINCIPLES}
      />

      <Section tone="muted">
        <div className="km-split">
          <div className="km-split-t">
            <div className="km-eyebrow">How we work with you</div>
            <h2 className="km-h2 sm">Straightforward, from the first click to the invoice</h2>
            <p className="km-lead">
              No sales call to get started and no surprises later. If something isn&rsquo;t clear, ask us.
            </p>
          </div>
          <ul className="km-points" style={{ margin: 0 }}>
            {PROMISES.map((item) => (
              <li key={item} className="km-feat" style={{ flexDirection: 'row', padding: '16px 20px', gap: 10 }}>
                <Icon name="check" size={16} stroke={2.4} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="light">
        <div className="km-feat" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: 32 }}>
          <div style={{ flex: '1 1 320px' }}>
            <h2 className="km-h3">Talk to us</h2>
            <p style={{ marginTop: 8 }}>
              Questions, feedback on the product, or a partnership idea: write to{' '}
              <a href="mailto:hello@kommently.app" className="kc-link" style={{ color: 'var(--brand-600)' }}>hello@kommently.app</a>.
            </p>
          </div>
          <Link to="/support#contact" className="kc-btn sec lg">
            Contact form
            <Icon name="arrow" size={16} stroke={2} />
          </Link>
        </div>
      </Section>

      <CtaSection />
    </SiteLayout>
  );
}
