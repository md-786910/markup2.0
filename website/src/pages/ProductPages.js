import React from 'react';
import {
  SiteLayout, Shot, FeatureGrid, FeatureSplit, StepList, IntegrationGrid, CTABand,
  CTA, Icon, SmartLink, TRIAL,
} from '../components/site';
import { SHOTS } from '../components/site/heroes';
import { HeroFiles, HeroHub, HeroBento } from '../components/site/productHeroes';
import { HeroStory, StatusColumns, Deadlines } from '../components/site/approvals';
import { HeroAnatomy, Surfaces, Devices } from '../components/site/websiteReview';

// The product pages (nav: Product): each opens with its own hero composition
// (components/site/productHeroes.js) and real screens from the app, then the
// feature in detail. Copy states only what
// the product does today.

const PRICING = { label: 'See pricing', href: '/pricing' };
const NOTE = '30-day Pro trial · No credit card';

export function WebsiteReviewPage() {
  return (
    <SiteLayout>
      <HeroAnatomy
        eyebrow="Website review"
        title="Review live websites with pins"
        lead="Click where something should change. The comment lands on that exact element, with the device size, a screenshot and its own thread, so nobody has to describe where."
        secondary={PRICING}
        note={`${NOTE} · Nothing to install on your site`}
      />
      <Surfaces />
      <Devices />
      <FeatureSplit
        tone="muted"
        pill="From comment to fix"
        glow
        title="Assign it, prioritize it, ship it"
        text="Every pin is also a task: give it an assignee, a priority, a due date and labels, and follow it across the board until it is resolved."
        points={['Open, In progress, In review, Resolved', 'Overdue pins counted at a glance', 'Send new pins to Slack, Jira, Discord or Teams']}
        actions={
          <>
            <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
            <SmartLink className="km-hb-link" href="/approvals">
              How approvals work <Icon name="arrow" size={16} stroke={2} />
            </SmartLink>
          </>
        }
        float={
          <>
            <span className="km-split-widget-badge">
              <Icon name="check" size={16} stroke={3} />
            </span>
            <div className="km-split-widget-text">
              <b>Pin #2 Moved to Done</b>
              <small>Overdue pins: 0 · Team on track</small>
            </div>
          </>
        }
        visual={<Shot {...SHOTS.board} />}
      />
      <StepList
        tone="light"
        title="Start a website review"
        steps={[
          { title: 'Add the page', text: 'Create a project from the link to the page you want reviewed.' },
          { title: 'Invite reviewers', text: 'Add teammates, or send clients a review link with an optional password.' },
          { title: 'Collect pins', text: 'Reply, assign and resolve, and watch the open count go down.' },
        ]}
      />
      <CTABand title="Try it on your next page" secondary={{ label: 'Review documents too', href: '/document-review' }} />
    </SiteLayout>
  );
}

export function DocumentReviewPage() {
  return (
    <SiteLayout>
      <HeroFiles
        eyebrow="Document review"
        title="Review PDFs and images the same way"
        lead="Upload up to 10 PDFs or images per project. Brochures, decks and mockups get the same numbered pins, threads, tasks and review status as your websites."
        secondary={PRICING}
        note={NOTE}
        files={[
          { name: 'acme.com home.jpg', meta: 'Image · 1440 × 1100', kind: 'img', pins: 4 },
          { name: 'Lookbook 2026.pdf', meta: 'PDF · 24 pages', kind: 'pdf', pins: 9 },
          { name: 'Brand guidelines.pdf', meta: 'PDF · 12 pages', kind: 'pdf', pins: 3 },
        ]}
      />
      <FeatureGrid
        title="Pin the line, not the whole file"
        items={[
          { icon: 'doc', title: 'Multi-page PDFs', text: 'Move between pages and files and pin a comment on any of them.' },
          { icon: 'image', title: 'Images and design exports', text: 'Review mockups and exports next to the live site they belong to.' },
          { icon: 'chat', title: 'Same threads and mentions', text: 'Discuss each pin, mention teammates and attach files.' },
          { icon: 'board', title: 'Same task board', text: 'Assign, prioritize and track document feedback like any other task.' },
          { icon: 'okc', title: 'Approve the final version', text: 'Set the project to Approved when the feedback is done.' },
          { icon: 'archive', title: 'Archive when done', text: 'Move finished documents out of the way and restore them any time.' },
        ]}
      />
      <FeatureSplit
        tone="muted"
        reverse
        pill="One workflow"
        glow
        title="Websites and documents in one Projects list"
        text="Both live in the same workspace, with the same statuses, filters and counts."
        points={['Filter websites and documents', 'Open and resolved counts on every card', 'One review link per client workspace']}
        actions={
          <>
            <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
            <SmartLink className="km-hb-link" href="/teams">
              Client workspaces <Icon name="arrow" size={16} stroke={2} />
            </SmartLink>
          </>
        }
        float={
          <>
            <span className="km-split-widget-badge" style={{ background: 'var(--brand-600)', boxShadow: '0 2px 8px rgba(0,61,255,0.3)' }}>
              <Icon name="doc" size={16} stroke={2.4} />
            </span>
            <div className="km-split-widget-text">
              <b>Lookbook 2026.pdf</b>
              <small>24 pages · 9 pins resolved</small>
            </div>
          </>
        }
        visual={<Shot {...SHOTS.projects} />}
      />
      <CTABand title="Send your first document for review" secondary={{ label: 'Review websites too', href: '/website-review' }} />
    </SiteLayout>
  );
}

export function ApprovalsPage() {
  return (
    <SiteLayout>
      <HeroStory
        eyebrow="Approvals"
        title="Know where every project stands"
        lead="Every project has a review status on its card and in the Projects panel, and the activity log shows who moved it and when. No more status meetings."
        secondary={PRICING}
        note={NOTE}
      />
      <StatusColumns />
      <FeatureSplit
        tone="light"
        pill="Pin by pin"
        glow
        title="See every task move to done"
        text="Inside a project, each pin moves from Open to In progress, In review and Resolved, with an assignee, priority and due date."
        points={['Filter by assignee and priority', 'Overdue pins counted at a glance', 'Resolve a pin with one click']}
        actions={
          <>
            <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
            <SmartLink className="km-hb-link" href="/integrations">
              See integrations <Icon name="arrow" size={16} stroke={2} />
            </SmartLink>
          </>
        }
        float={
          <>
            <span className="km-split-widget-badge">
              <Icon name="check" size={16} stroke={3} />
            </span>
            <div className="km-split-widget-text">
              <b>All Feedback Handled</b>
              <small>Status moved to Approved</small>
            </div>
          </>
        }
        visual={<Shot {...SHOTS.board} />}
      />
      <Deadlines tone="muted" />
      <FeatureGrid
        title="Stay on top of it"
        items={[
          { icon: 'bell', title: 'Hear about new feedback', text: 'In-app and email notifications for new pins, replies and mentions.' },
          { icon: 'activity', title: 'Activity log', text: 'See who changed a status, resolved a pin or joined the project.' },
          { icon: 'archive', title: 'Archive and restore', text: 'Tidy finished work away without losing it.' },
        ]}
      />
      <CTABand title="Give every project a clear status" secondary={PRICING} />
    </SiteLayout>
  );
}

export function IntegrationsPage() {
  return (
    <SiteLayout>
      <HeroHub
        eyebrow="Integrations"
        title="Send pins to the tools your team uses"
        lead="Connect Slack, Jira, Discord or Microsoft Teams for the whole workspace or for one project, and choose which events are sent."
        secondary={PRICING}
        note="Included from the Starter plan, and in the 30-day Pro trial."
        events={['New pin', 'New comment', 'Pin resolved', 'Pin reopened']}
      />
      <IntegrationGrid
        tone="light"
        title="Four providers"
        items={[
          { name: 'Slack', tone: 'blue', text: 'Choose a channel and post new pins and comments there.' },
          { name: 'Jira', tone: 'green', text: 'Create an issue for every new pin.' },
          { name: 'Discord', tone: 'amber', text: 'Notify a studio or community server.' },
          { name: 'Microsoft Teams', tone: 'rose', text: 'Notify a team channel in Teams.' },
        ]}
      />
      <FeatureGrid
        tone="muted"
        title="You choose what is sent"
        cols={4}
        items={[
          { icon: 'plus', title: 'New pin', text: 'When someone adds a comment to the page.' },
          { icon: 'chat', title: 'New comment', text: 'When a discussion moves on a pin.' },
          { icon: 'okc', title: 'Pin resolved', text: 'When feedback is handled.' },
          { icon: 'restore', title: 'Pin reopened', text: 'When a resolved pin needs more work.' },
        ]}
      />
      <CTABand title="Connect your first tool" secondary={PRICING} />
    </SiteLayout>
  );
}

export function TeamsPage() {
  return (
    <SiteLayout>
      <HeroBento
        eyebrow="Teams and clients"
        title="One workspace for every client"
        lead="Keep each client's websites and documents in their own workspace, invite members and guests, and give everyone exactly the access they need."
        secondary={PRICING}
        note={NOTE}
      />
      <FeatureGrid
        title="Built for agencies and in-house teams"
        items={[
          { icon: 'layers', title: 'Workspaces', text: 'Switch between clients from the top of the Projects panel.' },
          { icon: 'team', title: 'Members and guests', text: 'Invite teammates to work and guests to review.' },
          { icon: 'shield', title: 'Access levels', text: 'Can manage, Can comment or Can view, per workspace or per project.' },
          { icon: 'share', title: 'One review link per client', text: 'A workspace link lists every project in it, with a password and an expiry date.' },
          { icon: 'mail', title: 'Pending invites', text: 'See who has not joined yet without leaving the Team page.' },
          { icon: 'search', title: 'Search everything', text: 'Press Ctrl K to jump to a project, page or workspace.' },
        ]}
      />
      <FeatureSplit
        tone="muted"
        pill="Clients"
        glow
        title="Clients review with a link, no account needed"
        text="Share a review link and clients pin comments on the page just like your team. You decide whether they can comment or only view."
        points={['Password and expiry on every link', 'View-only or commenting', 'Their feedback arrives in your workspace']}
        actions={
          <>
            <CTA href={TRIAL.href} icon="arrow">{TRIAL.label}</CTA>
            <SmartLink className="km-hb-link" href="/pricing">
              View team plans <Icon name="arrow" size={16} stroke={2} />
            </SmartLink>
          </>
        }
        float={
          <>
            <span className="km-split-widget-badge" style={{ background: 'var(--brand-600)', boxShadow: '0 2px 8px rgba(0,61,255,0.3)' }}>
              <Icon name="lock" size={16} stroke={2.4} />
            </span>
            <div className="km-split-widget-text">
              <b>Protected Review Link</b>
              <small>Password protected · No login required</small>
            </div>
          </>
        }
        visual={<Shot {...SHOTS.review} />}
      />
      <CTABand title="Give each client a home" secondary={PRICING} />
    </SiteLayout>
  );
}
