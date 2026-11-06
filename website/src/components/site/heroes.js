import React from 'react';
import { CTA, Container, Icon, Shot, TRIAL } from './index';
import { ProviderLogo } from './providerLogos';

// The home hero, built for selling: the outcome, the value, trust facts,
// a primary "Start free trial", and the product itself: the app's real project
// review screen (public/images/product/hero-review.webp, captured at 2x from the
// client's ProjectView with sample data), with a Slack notification on it. Copy states only
// what the product does today.

const TITLE = 'Point at the page. Say what to change.';
const LEAD = 'Your team and clients drop numbered pins on live websites and PDFs. Every comment lands on the exact spot, with its own thread and a clear status, so feedback rounds finish faster.';
const TRUST = ['30-day Pro trial', 'No credit card', 'Nothing to install on your site', 'Clients review without an account'];
const PROVIDERS = ['Slack', 'Jira', 'Discord', 'Microsoft Teams'];

function Trust({ center }) {
  return (
    <ul className={`km-hx-trust${center ? ' center' : ''}`}>
      {TRUST.map((t) => <li key={t}><Icon name="check" size={16} stroke={2.4} />{t}</li>)}
    </ul>
  );
}

function WorksWith({ center }) {
  return (
    <div className={`km-hx-works${center ? ' center' : ''}`}>
      <span>Works with</span>
      {PROVIDERS.map((p) => <ProviderLogo key={p} name={p} size={32} />)}
    </div>
  );
}

// A Slack notification floating on the product screenshot
function SlackToast() {
  return (
    <div className="km-hx-card km-hx-toast" aria-hidden="true">
      <ProviderLogo name="Slack" size={30} />
      <div>
        <b>New pin #2 on Leanport website</b>
        <small>Sent to #design-reviews</small>
      </div>
    </div>
  );
}

function Stage({ wide }) {
  return (
    <div className={`km-hx-stage${wide ? ' wide' : ''}`}>
      <Shot
        src="/images/product/hero-review.webp"
        alt="The Kommently project view: a page with numbered pins and an open pin thread with status, priority, comments and a mention"
        url="app.kommently.app/project/leanport-website"
        eager
      />
      <SlackToast />
    </div>
  );
}

const Actions = ({ center }) => (
  <div className={`km-actions${center ? ' center' : ''}`}>
    <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
    <CTA href="#how" variant="secondary">See how it works</CTA>
  </div>
);

// Centered headline, value line, trial CTA and trust facts, then a wide product stage
export function HeroCentered() {
  return (
    <section className="km-hero km-hx km-hx-a">
      <Container>
        <div className="km-hx-top">
          <div className="km-hx-pill"><span className="km-hx-dot" />Website and document review</div>
          <h1 className="km-h1 km-hx-h1">{TITLE}</h1>
          <p className="km-lead">{LEAD}</p>
          <Actions center />
          <Trust center />
        </div>
        <Stage wide />
        <WorksWith center />
      </Container>
    </section>
  );
}
