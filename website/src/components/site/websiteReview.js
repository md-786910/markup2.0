import React from 'react';
import { CTA, Container, Icon, SmartLink, TRIAL } from './index';

// Website review page sections: the anatomy of a pin (hero), the pages you can
// review, and one page at three screen sizes. Images: public/images/product/
// acme-{desktop,tablet,mobile}.webp (a sample client page, 2x).
// Styles: styles/website-review.css.

const IMG = (n) => `/images/product/acme-${n}.webp`;

function Pin({ n, x, y, resolved }) {
  return (
    <span className={`wr-pin${resolved ? ' ok' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
      {resolved ? <Icon name="check" size={12} stroke={3} /> : n}
    </span>
  );
}

function Browser({ url, children, className = '' }) {
  return (
    <div className={`wr-browser ${className}`}>
      <div className="wr-bar"><span className="km-dots"><i /><i /><i /></span><span className="km-url">{url}</span></div>
      <div className="wr-view">{children}</div>
    </div>
  );
}

// Hero: what one pin captures, called out around a real page
export function HeroAnatomy({ eyebrow, title, lead, secondary, note }) {
  return (
    <section className="wr-hero">
      <Container className="wr-hero-in">
        <div className="wr-hero-copy">
          <div className="km-hx-pill"><span className="km-hx-dot" />{eyebrow}</div>
          <h1 className="wr-h1">{title}</h1>
          <p className="km-hb-lead">{lead}</p>
          <div className="km-hb-actions">
            <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
            {secondary ? <SmartLink className="km-hb-link" href={secondary.href}>{secondary.label} <Icon name="arrow" size={16} stroke={2} /></SmartLink> : null}
          </div>
          {note ? <p className="km-hb-note">{note}</p> : null}
        </div>
        <div className="wr-anatomy" role="img" aria-label="A pin on a client homepage with what it captures: the element, the device, a screenshot and its thread">
          <Browser url="acme.com">
            <img src={IMG('desktop')} alt="" width="1440" height="900" />
            <Pin n={1} x={40} y={41.5} />
            <span className="wr-ring" style={{ left: '40%', top: '41.5%' }} aria-hidden="true" />
          </Browser>
          <div className="wr-call c1"><span className="k">Element</span><b>h1.hero-title</b></div>
          <div className="wr-call c2"><span className="k">Device</span><b>Desktop · 1440 × 900</b></div>
          <div className="wr-call c3"><span className="k">Screenshot</span><b>Attached automatically</b></div>
          <div className="wr-call c4">
            <span className="k">Thread</span>
            <b>3 comments · assigned to Amir</b>
            <span className="wr-tags"><span className="kc-st changes"><i />In progress</span><span className="kc-st danger"><i />Urgent</span></span>
          </div>
        </div>
      </Container>
    </section>
  );
}

// The pages you can review: production, staging, behind a login
const SURFACES = [
  { icon: 'globe', label: 'Production', url: 'acme.com', text: 'Review the live site your customers see, exactly as it is today.' },
  { icon: 'layers', label: 'Staging', url: 'staging.acme.com', text: 'Catch problems on the staging site before they ship.' },
  { icon: 'lock', label: 'Behind a login', url: 'acme.com/account', text: 'Sign in inside the review and keep commenting on account pages.' },
];
export function Surfaces() {
  return (
    <section className="km-sec muted">
      <Container>
        <div className="km-sh center">
          <div className="km-eyebrow">Nothing to install</div>
          <h2 className="km-h2">Review the pages you actually ship</h2>
          <p className="km-lead">No script on your site and no browser extension. Kommently loads the page for you.</p>
        </div>
        <div className="wr-surfaces">
          {SURFACES.map((s, i) => (
            <article key={s.label} className="wr-surface">
              <div className="wr-mini">
                <div className="wr-mini-bar">
                  {s.icon === 'lock' ? <Icon name="lock" size={12} /> : null}
                  <span>{s.url}</span>
                </div>
                <div className="wr-mini-page">
                  <i style={{ width: '45%' }} /><i className="hero" /><i style={{ width: '70%' }} />
                  <span className="wr-pin sm" style={{ left: `${[30, 64, 46][i]}%`, top: `${[46, 38, 58][i]}%` }}>{i + 1}</span>
                </div>
              </div>
              <div className="wr-surface-t">
                <span className="km-ico"><Icon name={s.icon} size={20} /></span>
                <h3 className="km-h3">{s.label}</h3>
                <p>{s.text}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

// One page at three screen sizes, each with its own pins
export function Devices() {
  return (
    <section className="km-sec light">
      <Container>
        <div className="km-sh center">
          <div className="km-eyebrow">Every screen size</div>
          <h2 className="km-h2">Desktop, tablet and mobile each get their own pins</h2>
          <p className="km-lead">Switch the preview to 1440, 768 or 375 pixels wide. A mobile layout bug never hides among desktop notes.</p>
        </div>
        <div className="wr-devices" role="img" aria-label="The same client page at desktop, tablet and mobile width with different pins on each">
          <figure className="wr-dev desk">
            <Browser url="acme.com"><img src={IMG('desktop')} alt="" width="1440" height="900" /><Pin n={1} x={40} y={41.5} /><Pin n={2} x={24.5} y={65} /></Browser>
            <figcaption><Icon name="monitor" size={16} />Desktop · 1440<span>2 pins</span></figcaption>
          </figure>
          <figure className="wr-dev tab">
            <div className="wr-tablet"><img src={IMG('tablet')} alt="" width="768" height="1024" /><Pin n={7} x={93} y={3.5} /><Pin n={8} x={56} y={43} /></div>
            <figcaption><Icon name="tablet" size={16} />Tablet · 768<span>2 pins</span></figcaption>
          </figure>
          <figure className="wr-dev mob">
            <div className="wr-phone"><img src={IMG('mobile')} alt="" width="390" height="844" /><Pin n={9} x={75} y={25.5} /></div>
            <figcaption><Icon name="phone" size={16} />Mobile · 375<span>1 pin</span></figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
