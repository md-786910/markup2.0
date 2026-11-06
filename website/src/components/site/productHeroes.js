import React from 'react';
import { CTA, Container, Icon, Logo, Shot, SmartLink, TRIAL } from './index';
import { ProviderLogo } from './providerLogos';
import { SHOTS } from './heroes';

// Product-page heroes: one composition per page, so the pages don't read as a
// template. Same tokens, type and real product screens as the home hero.
// Styles: the "Product-page heroes" block in styles/kommently-site.css.

function HeroActions({ secondary, center }) {
  return (
    <div className={`km-hb-actions${center ? ' center' : ''}`}>
      <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
      {secondary ? (
        <SmartLink className="km-hb-link" href={secondary.href}>
          {secondary.label} <Icon name="arrow" size={16} stroke={2} />
        </SmartLink>
      ) : null}
    </div>
  );
}

function Eyebrow({ children, dark }) {
  return <div className={`km-hx-pill${dark ? ' dark' : ''}`}><span className="km-hx-dot" />{children}</div>;
}

function Copy({ eyebrow, title, lead, secondary, note, center, dark, big }) {
  return (
    <div className={center ? 'km-hs-top' : 'km-hf-copy'}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h1 className={big ? 'km-hs-h1' : 'km-hf-h1'}>{title}</h1>
      <p className="km-hb-lead">{lead}</p>
      <HeroActions secondary={secondary} center={center} />
      {note ? <p className="km-hb-note">{note}</p> : null}
    </div>
  );
}

// Website review: centered headline, then a wide product stage with device
// chips and a technical-details card
export function HeroStage({ shot = SHOTS.review, ...copy }) {
  return (
    <section className="km-hs">
      <Container>
        <Copy {...copy} center big />
        <div className="km-hs-stage">
          <Shot src={shot.src} alt={shot.alt} url={shot.url} eager />
          <div className="km-hs-devices" aria-hidden="true">
            <span className="on"><Icon name="monitor" size={15} />Desktop 1440</span>
            <span><Icon name="tablet" size={15} />Tablet 768</span>
            <span><Icon name="phone" size={15} />Mobile 375</span>
          </div>
          <div className="km-hx-card km-hs-ctx" aria-hidden="true">
            <b>Pin #1 · technical details</b>
            <dl>
              <dt>Page</dt><dd>acme.com/</dd>
              <dt>Device</dt><dd>Desktop · 1440 × 900</dd>
              <dt>Element</dt><dd>h1.hero-title</dd>
              <dt>Screenshot</dt><dd>Attached</dd>
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}

// Document review: split, a framed screenshot on a stack of pages and a files card
export function HeroFiles({ shot = SHOTS.review, files = [], ...copy }) {
  return (
    <section className="km-hf">
      <Container className="km-hf-in">
        <Copy {...copy} />
        <div className="km-hf-visual">
          <div className="km-hf-sheet s2" aria-hidden="true" />
          <div className="km-hf-sheet s1" aria-hidden="true" />
          <Shot src={shot.src} alt={shot.alt} url={shot.url} eager />
          <div className="km-hx-card km-hf-files" aria-hidden="true">
            <div className="km-hx-card-h">Files in this project</div>
            {files.map((f) => (
              <div key={f.name} className="km-hf-file">
                <span className={`km-hf-ext ${f.kind}`}>{f.kind === 'pdf' ? 'PDF' : 'IMG'}</span>
                <div><b>{f.name}</b><small>{f.meta}</small></div>
                <span className="km-hf-pins">{f.pins}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

// Approvals: dark hero, the three states inline, the dashboard glowing below
export function HeroStatus({ shot = SHOTS.projects, states = [], ...copy }) {
  return (
    <section className="km-hd">
      <Container>
        <Copy {...copy} center big dark />
        <div className="km-hd-states" aria-hidden="true">
          {states.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 ? <span className="km-hd-arrow"><Icon name="arrow" size={18} /></span> : null}
              <div className="km-hd-state">
                <span className={`kc-st ${s.tone}`}><i />{s.label}</span>
                <small>{s.text}</small>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="km-hd-stage"><Shot src={shot.src} alt={shot.alt} url={shot.url} eager /></div>
      </Container>
    </section>
  );
}

// Integrations: a hub, Kommently in the middle, providers around it, events on the lines
export function HeroHub({ events = [], ...copy }) {
  const providers = ['Slack', 'Jira', 'Discord', 'Microsoft Teams'];
  const corners = [[90, 90], [430, 90], [90, 430], [430, 430]];
  return (
    <section className="km-hh">
      <Container className="km-hf-in">
        <Copy {...copy} />
        <div className="km-hh-hub" role="img" aria-label="Kommently sends pins to Slack, Jira, Discord and Microsoft Teams">
          <svg className="km-hh-lines" viewBox="0 0 520 520" aria-hidden="true">
            <circle cx="260" cy="260" r="200" />
            <circle cx="260" cy="260" r="120" />
            {corners.map(([x, y]) => <line key={`${x}-${y}`} x1="260" y1="260" x2={x} y2={y} />)}
          </svg>
          <div className="km-hh-core"><Logo size={56} /><b>Kommently</b></div>
          {providers.map((p, i) => (
            <div key={p} className={`km-hh-node n${i}`}><ProviderLogo name={p} size={56} /><span>{p}</span></div>
          ))}
          {events.map((e, i) => <span key={e} className={`km-hh-event e${i}`}>{e}</span>)}
        </div>
      </Container>
    </section>
  );
}

// Teams and clients: headline left, a bento of workspace, access, link and team tiles
const WORKSPACES = [['A', 'Acme Studio', '7 projects', 'blue'], ['N', 'Northwind Foods', '3 projects', 'green'], ['H', 'Helio Labs', '2 projects', 'amber']];
const ACCESS = [['DL', 'Dana Lee', 'Can manage', ''], ['AK', 'Amir Khan', 'Can comment', 'amber'], ['CL', 'Client (guest)', 'Can view', 'slate']];

export function HeroBento(copy) {
  return (
    <section className="km-hn">
      <Container className="km-hf-in">
        <Copy {...copy} />
        <div className="km-hn-grid" aria-hidden="true">
          <div className="km-hn-tile ws">
            <div className="km-hx-card-h">Workspaces</div>
            {WORKSPACES.map(([l, n, c, t], i) => (
              <div key={n} className={`km-hn-ws${i === 0 ? ' on' : ''}`}>
                <span className={`kc-tile ${t}`} style={{ width: 30, height: 30, fontSize: 13 }}>{l}</span>
                <div><b>{n}</b><small>{c}</small></div>
                {i === 0 ? <Icon name="check" size={16} stroke={2} /> : null}
              </div>
            ))}
          </div>
          <div className="km-hn-tile access">
            <div className="km-hx-card-h">Access to Acme Studio</div>
            {ACCESS.map(([ini, n, lvl, t]) => (
              <div key={n} className="km-hn-row">
                <span className={`kc-av ${t}`}>{ini}</span><b>{n}</b><span className="km-hn-lvl">{lvl}</span>
              </div>
            ))}
          </div>
          <div className="km-hn-tile link">
            <div className="km-hx-card-h">Client review link</div>
            <div className="km-hn-url"><Icon name="link" size={15} />app.kommently.app/review/w/…</div>
            <div className="km-hn-flags">
              <span><Icon name="lock" size={14} />Password</span>
              <span><Icon name="calendar" size={14} />Expires Dec 1</span>
            </div>
          </div>
          <div className="km-hn-tile team">
            <div className="km-hn-big">Members and guests</div>
            <div className="km-hn-avs">
              {['SA', 'DL', 'AK', 'PS', 'MR'].map((x, i) => <span key={x} className={`kc-av ${['', 'green', 'amber', 'rose', 'slate'][i]}`}>{x}</span>)}
              <span className="more">+12</span>
            </div>
            <small>2 pending invites</small>
          </div>
        </div>
      </Container>
    </section>
  );
}
