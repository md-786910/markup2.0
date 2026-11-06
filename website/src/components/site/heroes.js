import React from 'react';
import { CTA, Container, Icon, Shot, SmartLink, TRIAL } from './index';
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
        <b>New pin #2 on acme.com redesign</b>
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
        alt="The Kommently project view: a client homepage with numbered pins and an open pin thread with status, priority, comments and a mention"
        url="app.kommently.app/project/acme-redesign"
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

// Real product screens (captured at 2x from the client app with sample data)
export const SHOTS = {
  review: { src: '/images/product/hero-review.webp', url: 'app.kommently.app/project/acme-redesign', alt: 'The Kommently project view: a client homepage with numbered pins and an open pin thread with status, priority, assignee, due date, labels and comments' },
  board: { src: '/images/product/app-board.webp', url: 'app.kommently.app/project/acme-redesign', alt: 'The Kommently task board: feedback cards in Open, In progress, In review and Resolved columns with priority, labels, due dates and assignees' },
  projects: { src: '/images/product/app-projects.webp', url: 'app.kommently.app/dashboard', alt: 'The Kommently Projects page: project cards with review status, open and resolved counts, filtered by view and type' },
};

// The Slack message that floats on the hero screenshot
export function SlackCard() {
  return (
    <div className="km-hx-card km-hb-float" aria-hidden="true">
      <div className="km-hb-float-h">
        <ProviderLogo name="Slack" size={30} />
        <div><b>#design-reviews</b><small>Kommently · just now</small></div>
      </div>
      <p><b>New pin #2</b> on acme.com redesign</p>
      <p className="q">&ldquo;Can the button say what happens next?&rdquo;</p>
      <span className="km-hb-float-btn">Open in Kommently</span>
    </div>
  );
}

// Editorial layout: a very large left-aligned headline, the lead and actions
// below it on the left, the product screenshot on the right bleeding off the
// edge of the screen with an optional floating card on its left edge, a soft
// brand wash behind the top right, and optionally the "Works with" logos.
// Defaults are the home page; product pages pass their own copy and screen.
export function HeroEditorial({
  eyebrow,
  title = TITLE,
  lead = LEAD,
  secondary = { label: 'See how it works', href: '#how' },
  note = '30-day Pro trial · No credit card · Nothing to install on your site',
  shot = SHOTS.review,
  float = <SlackCard />,
  worksWith = true,
  compact = false,
  bg,
}) {
  return (
    <section className={`km-hb${compact ? ' compact' : ''}${bg ? ` bg-${bg}` : ''}`}>
      <div className="km-hb-wash" aria-hidden="true" />
      <Container className="km-hb-in">
        {eyebrow ? <div className="km-hx-pill"><span className="km-hx-dot" />{eyebrow}</div> : null}
        <h1 className="km-hb-h1">{title}</h1>
        <div className="km-hb-body">
          <div className="km-hb-copy">
            <p className="km-hb-lead">{lead}</p>
            <div className="km-hb-actions">
              <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
              {secondary ? <SmartLink className="km-hb-link" href={secondary.href}>{secondary.label} <Icon name="arrow" size={16} stroke={2} /></SmartLink> : null}
            </div>
            {note ? <p className="km-hb-note">{note}</p> : null}
            {worksWith ? <WorksWith /> : null}
          </div>
          <div className="km-hb-visual">
            <div className="km-hb-shot">
              <Shot src={shot.src} alt={shot.alt} url={shot.url} eager />
            </div>
            {float}
          </div>
        </div>
      </Container>
    </section>
  );
}
