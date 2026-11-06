import React, { useEffect } from 'react';
import { SiteLayout, Hero, Section, SectionHeader, Icon, Badge, TRIAL } from '../components/site';
import CtaSection from '../components/CtaSection';

// Matches the app's access model (server/utils/access.js)
const ACCESS_LEVELS = [
  ['Can manage', 'Edit projects, share review links, invite people and manage versions.'],
  ['Can comment', 'Pin comments, reply, and resolve feedback.'],
  ['Can view', 'See the work and every comment, without changing anything.'],
];

const ORG_ROLES = [
  ['Owner and admins', 'Manage every workspace, the team, integrations and billing.'],
  ['Members', 'Your team. They get access to the workspaces and projects you choose.'],
  ['Guests', 'Clients and outside reviewers. They can comment at most, or review through a link with no account.'],
];

const CUSTOMER_SEGMENTS = [
  {
    icon: 'share',
    title: 'Agencies',
    description: 'Collect client notes on live work without turning every review into screenshots, email threads, and status calls.',
    metrics: ['A workspace and one review link per client', 'Clients comment without signing up', 'Version snapshots and activity history'],
  },
  {
    icon: 'monitor',
    title: 'Product teams',
    description: 'Keep PMs, designers, engineers, and QA aligned around precise comments, before a release goes sideways.',
    metrics: ['Screenshot and device size on every pin', 'Jira issues created from new pins', 'Real-time presence and threads'],
  },
  {
    icon: 'globe',
    title: 'Web operations',
    description: 'Review landing pages, PDFs, and campaign assets with clear ownership and no account friction for stakeholders.',
    metrics: ['Paste a URL, no install or snippet', 'PDF and image review in the same project', 'Slack, Discord, and Teams updates'],
  },
];

// Illustration of a review round (sample data, not customer numbers)
const REVIEW_ROWS = [
  ['Homepage QA', '12 resolved', 'approved'],
  ['Client copy pass', '4 open', 'changes'],
  ['Mobile polish', 'Ready', 'approved'],
];

function ReviewHealth() {
  return (
    <div className="km-mock status" role="img" aria-label="Review health of a campaign launch: homepage QA 12 resolved, client copy pass 4 open, mobile polish ready">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="km-eyebrow" style={{ marginBottom: 2 }}>Review health</div>
          <div className="km-h3">Campaign launch</div>
        </div>
        <Badge tone="approved">On track</Badge>
      </div>
      {REVIEW_ROWS.map(([label, value, tone]) => (
        <div key={label} className="km-statrow">
          <span className="km-ico" style={{ margin: 0, width: 32, height: 32 }}><Icon name="check" size={16} stroke={2} /></span>
          <div><b>{label}</b></div>
          <Badge tone={tone}>{value}</Badge>
        </div>
      ))}
    </div>
  );
}

function RoleList({ title, lead, rows }) {
  return (
    <article className="km-feat">
      <h3 className="km-h3">{title}</h3>
      <p>{lead}</p>
      <div className="km-table-wrap" style={{ width: '100%', marginTop: 8 }}>
        <table className="km-table">
          <tbody>
            {rows.map(([term, copy]) => (
              <tr key={term}>
                <td style={{ width: 150 }}>{term}</td>
                <td>{copy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function CustomersPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SiteLayout>
      <Hero
        eyebrow="Use cases"
        title="Review workflows that feel clear to every stakeholder"
        lead="Kommently helps agencies, product teams, and web operations groups turn scattered visual feedback into accountable review cycles."
        primary={{ label: 'Start free', href: TRIAL.href, icon: 'arrow' }}
        secondary={{ label: 'View plans', href: '/pricing' }}
        visual={<ReviewHealth />}
      />

      <Section tone="muted">
        <SectionHeader eyebrow="Teams" title="Built for the teams that own review quality" />
        <div className="km-grid c3">
          {CUSTOMER_SEGMENTS.map((segment) => (
            <article key={segment.title} className="km-feat">
              <span className="km-ico"><Icon name={segment.icon} size={20} /></span>
              <h3 className="km-h3">{segment.title}</h3>
              <p>{segment.description}</p>
              <ul className="km-points" style={{ marginTop: 12 }}>
                {segment.metrics.map((metric) => (
                  <li key={metric}><Icon name="check" size={16} stroke={2.4} />{metric}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader
          eyebrow="Access"
          title="One workspace for every approval path"
          lead="Give each client a workspace, and each person exactly the access they need."
        />
        <div className="km-grid c2">
          <RoleList
            title="Access on each workspace and project"
            lead="Set it once on a workspace and it applies to every project inside."
            rows={ACCESS_LEVELS}
          />
          <RoleList
            title="Roles in your organization"
            lead="Who can run the account, and who joins as a guest."
            rows={ORG_ROLES}
          />
        </div>
      </Section>

      <CtaSection />
    </SiteLayout>
  );
}
