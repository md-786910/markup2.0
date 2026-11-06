import React from 'react';
import { CTA, Container, Icon, SmartLink, TRIAL } from './index';

// Approvals page sections: a project's status story (hero), projects sorted by
// review status, and feedback deadlines. Everything shown is a real feature:
// the three project statuses, the activity log ("resolved Pin #3", "changed
// status to approved"), and deadlines that close feedback with a 24 h reminder.
// Styles: styles/approvals.css.

const AV_TONES = { SA: '', DL: 'green', AK: 'amber', PS: 'rose' };
const Av = ({ i }) => <span className={`kc-av ${AV_TONES[i] || ''}`}>{i}</span>;
const Badge = ({ tone, children }) => <span className={`kc-st ${tone}`}><i />{children}</span>;

const STORY = [
  { who: 'DL', name: 'Dana Lee', what: 'changed status to', tag: ['changes', 'Changes requested'], when: 'Mon 10:12' },
  { who: 'AK', name: 'Amir Khan', what: 'resolved Pin #3, Pin #5 and Pin #8', when: 'Tue 16:40', icon: 'check' },
  { who: 'DL', name: 'Dana Lee', what: 'changed status to', tag: ['review', 'In review'], when: 'Wed 09:05' },
  { who: 'SA', name: 'Sohail Amir', what: 'changed status to', tag: ['approved', 'Approved'], when: 'Today 11:30' },
];

export function HeroStory({ eyebrow, title, lead, secondary, note }) {
  return (
    <section className="ap-hero">
      <Container className="ap-hero-in">
        <div>
          <div className="km-hx-pill"><span className="km-hx-dot" />{eyebrow}</div>
          <h1 className="ap-h1">{title}</h1>
          <p className="km-hb-lead">{lead}</p>
          <div className="km-hb-actions">
            <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
            {secondary ? <SmartLink className="km-hb-link" href={secondary.href}>{secondary.label} <Icon name="arrow" size={16} stroke={2} /></SmartLink> : null}
          </div>
          {note ? <p className="km-hb-note">{note}</p> : null}
        </div>
        <div className="ap-story" role="img" aria-label="A project moving from Changes requested to Approved in its activity log">
          <div className="ap-card">
            <div className="ap-card-top">
              <span className="ap-card-ico"><Icon name="globe" size={18} /></span>
              <div><b>acme.com redesign</b><small>Acme Studio</small></div>
              <Badge tone="approved">Approved</Badge>
            </div>
            <div className="ap-meter"><i style={{ width: '100%' }} /></div>
            <div className="ap-card-foot"><span>0 open · 18 resolved</span><span className="kc-avs">{['SA', 'DL', 'AK'].map((x) => <Av key={x} i={x} />)}</span></div>
          </div>
          <div className="ap-log">
            <div className="ap-log-h"><Icon name="activity" size={15} />Activity</div>
            {STORY.map((s, i) => (
              <div key={i} className="ap-log-row">
                <span className="ap-log-dot">{s.icon ? <Icon name={s.icon} size={12} stroke={3} /> : null}</span>
                <Av i={s.who} />
                <p><b>{s.name}</b> {s.what} {s.tag ? <Badge tone={s.tag[0]}>{s.tag[1]}</Badge> : null}</p>
                <small>{s.when}</small>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

const COLUMNS = [
  { tone: 'review', label: 'In review', note: 'Reviewers are dropping pins and replying.', cards: [['acme.com redesign', '12 open · 18 resolved', 60, ['SA', 'DL', 'AK']], ['Checkout flow', '8 open · 2 resolved', 20, ['AK', 'PS']]] },
  { tone: 'changes', label: 'Changes requested', note: 'Pins are open and someone has work to do.', cards: [['Spring campaign landing', '5 open · 9 resolved', 64, ['DL', 'PS']]] },
  { tone: 'approved', label: 'Approved', note: 'Signed off. New feedback puts it back in review.', cards: [['Brand guidelines.pdf', '0 open · 14 resolved', 100, ['SA', 'PS']], ['Showroom finder', '0 open · 22 resolved', 100, ['AK']]] },
];

export function StatusColumns() {
  return (
    <section className="km-sec muted">
      <Container>
        <div className="km-sh center">
          <div className="km-eyebrow">Three states</div>
          <h2 className="km-h2">Every project, sorted by where it stands</h2>
          <p className="km-lead">Open In review, Changes requested or Approved from the Projects panel, with open and resolved counts on every card.</p>
        </div>
        <div className="ap-cols" role="img" aria-label="Projects grouped into In review, Changes requested and Approved">
          {COLUMNS.map((c, ci) => (
            <div key={c.label} className={`ap-col ${c.tone}`}>
              <div className="ap-col-h"><Badge tone={c.tone}>{c.label}</Badge><span className="ap-n">{c.cards.length}</span></div>
              <p className="ap-col-note">{c.note}</p>
              {c.cards.map(([name, counts, pct, people]) => (
                <div key={name} className="ap-mini">
                  <b><Icon name={name.endsWith('.pdf') ? 'doc' : 'globe'} size={15} />{name}</b>
                  <div className={`ap-meter ${c.tone}`}><i style={{ width: `${pct}%` }} /></div>
                  <div className="ap-card-foot"><span>{counts}</span><span className="kc-avs">{people.map((x) => <Av key={x} i={x} />)}</span></div>
                </div>
              ))}
              {ci < COLUMNS.length - 1 ? <span className="ap-col-arrow" aria-hidden="true"><Icon name="arrow" size={18} /></span> : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function Deadlines({ tone = 'light' }) {
  return (
    <section className={`km-sec ${tone}`}>
      <Container className="ap-dl-in">
        <div className="ap-dl-t">
          <div className="km-eyebrow">Feedback deadlines</div>
          <h2 className="km-h2 sm">Close a review round on time</h2>
          <p className="km-lead">Set a date for the feedback round. Everyone who reviews gets a reminder 24 hours before, and after the deadline new pins and comments are closed, except for the people who manage the project.</p>
          <ul className="km-points">
            <li><Icon name="check" size={16} stroke={2.4} />One deadline per project</li>
            <li><Icon name="check" size={16} stroke={2.4} />Reminder email to members and guest reviewers</li>
            <li><Icon name="check" size={16} stroke={2.4} />Managers can still reply after it closes</li>
          </ul>
        </div>
        <div className="ap-dl-v" role="img" aria-label="A feedback deadline with its reminder and the closed state">
          <div className="ap-dl-card">
            <div className="ap-dl-h"><Icon name="calendar" size={18} /><div><b>Feedback closes</b><small>acme.com redesign</small></div></div>
            <div className="ap-dl-date">Fri, Nov 14 · 18:00</div>
            <div className="ap-dl-steps">
              <div className="done"><span><Icon name="check" size={12} stroke={3} /></span><p><b>Reminder sent</b><small>24 hours before, to 6 reviewers</small></p></div>
              <div className="now"><span /><p><b>Feedback open</b><small>New pins and comments welcome</small></p></div>
              <div><span /><p><b>Feedback closed</b><small>Only managers can still comment</small></p></div>
            </div>
          </div>
          <div className="ap-dl-toast"><Icon name="mail" size={16} /><span><b>Reminder:</b> feedback on acme.com redesign closes tomorrow</span></div>
        </div>
      </Container>
    </section>
  );
}
