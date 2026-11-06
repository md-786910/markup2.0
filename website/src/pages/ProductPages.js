import React from 'react';
import {
  SiteLayout, Hero, ProductMock, FeatureGrid, FeatureSplit, StepList, StatusFlow, IntegrationGrid, CTABand, TRIAL,
} from '../components/site';

// The product pages of the design system's page map (kommently-design-system
// preview/WebsiteReviewPage.html, DocumentReviewPage, ApprovalsPage,
// IntegrationsPage, TeamsPage), with the reference copy and illustrations.
// Copy states only what the product does today.

const PRICING = { label: 'See pricing', href: '/pricing' };
const HERO_TRIAL = { ...TRIAL, icon: 'arrow' };

export function WebsiteReviewPage() {
  return (
    <SiteLayout>
      <Hero
        eyebrow="Website review"
        title="Review live websites with pins"
        lead="Click any spot on a page and leave a comment right there. Feedback arrives with its location, not a screenshot with arrows."
        primary={HERO_TRIAL}
        secondary={PRICING}
        visual={<ProductMock kind="web" url="acme.com/redesign" comment="Can this headline be shorter on mobile?" />}
      />
      <FeatureGrid
        title="Comments that point at the problem"
        cols={2}
        items={[
          { icon: 'chat', title: 'Comment on the exact spot', text: 'Every pin sits where you clicked, so the person fixing it sees what you mean.' },
          { icon: 'zap', title: 'Numbered pins', text: 'Refer to pin 7 in a call or a chat and everyone looks at the same thing.' },
          { icon: 'mail', title: 'Replies and mentions', text: 'Discuss each pin in its own thread and mention a teammate to pull them in.' },
          { icon: 'okc', title: 'Resolve when fixed', text: 'Open and resolved counts show on the project card, so progress is visible.' },
        ]}
      />
      <StepList
        title="Start a website review"
        steps={[
          { title: 'Add the page', text: 'Create a project from the link to the page you want reviewed.' },
          { title: 'Invite reviewers', text: 'Share the project with teammates and guests.' },
          { title: 'Collect pins', text: 'Reply, resolve and watch the counts go down.' },
        ]}
      />
      <CTABand title="Try it on your next page" secondary={{ label: 'Review documents too', href: '/document-review' }} />
    </SiteLayout>
  );
}

export function DocumentReviewPage() {
  return (
    <SiteLayout>
      <Hero
        eyebrow="Document review"
        title="Review PDFs the same way"
        lead="Brand guidelines, campaign decks and other documents get the same numbered pins, replies and approvals as your websites."
        primary={HERO_TRIAL}
        secondary={PRICING}
        visual={<ProductMock kind="doc" />}
      />
      <FeatureSplit
        tone="muted"
        reverse
        eyebrow="On the page"
        title="Pin the line, not the whole file"
        text="Drop a pin on the sentence, figure or margin you mean, and keep the whole discussion attached to it."
        points={['Pins and replies on any page of a document', 'A list of every comment beside the page', 'Resolve each comment as it is handled']}
        visual={<ProductMock kind="status" />}
      />
      <FeatureGrid
        title="One workflow for sites and documents"
        items={[
          { icon: 'doc', title: 'Documents and websites together', text: 'Both live in the same workspace and show up in the same Projects list.' },
          { icon: 'okc', title: 'Approve the final version', text: 'Mark a document Approved when every pin is resolved.' },
          { icon: 'archive', title: 'Archive when done', text: 'Move finished documents out of the way and restore them if needed.' },
        ]}
      />
      <CTABand title="Send your first document for review" secondary={{ label: 'Review websites too', href: '/website-review' }} />
    </SiteLayout>
  );
}

export function ApprovalsPage() {
  return (
    <SiteLayout>
      <Hero
        eyebrow="Approvals"
        title="Know where every project stands"
        lead="Three clear states, shown on every project card and in your filters, replace the status meeting."
        primary={HERO_TRIAL}
        secondary={PRICING}
        visual={<ProductMock kind="status" />}
      />
      <StatusFlow
        title="Three states, one flow"
        states={[
          { status: 'review', title: 'In review', text: 'Reviewers are dropping pins and replying.' },
          { status: 'changes', title: 'Changes requested', text: 'Pins are open and someone has work to do.' },
          { status: 'approved', title: 'Approved', text: 'Every pin is resolved and the project is signed off.' },
        ]}
      />
      <FeatureGrid
        tone="muted"
        title="Stay on top of it"
        items={[
          { icon: 'eye', title: 'Filter by status', text: 'Open In review, Changes requested or Approved from the Projects panel.' },
          { icon: 'bell', title: 'Hear about new feedback', text: 'Get a notification when someone adds a pin, replies or mentions you.' },
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
      <Hero
        eyebrow="Integrations"
        title="Send pins to the tools your team uses"
        lead="Connect Slack, Jira, Discord or Microsoft Teams and choose exactly which events are sent."
        primary={HERO_TRIAL}
        secondary={PRICING}
        note="Integrations are included from the Starter plan, and your trial includes them."
        visual={<ProductMock kind="web" url="acme.com/checkout" comment="Sent to #design-reviews" />}
      />
      <IntegrationGrid
        tone="light"
        title="Four providers"
        items={[
          { name: 'Slack', tone: 'blue', text: 'Choose a channel and post pins there.' },
          { name: 'Jira', tone: 'green', text: 'Keep feedback next to your issues.' },
          { name: 'Discord', tone: 'amber', text: 'Notify a studio or community server.' },
          { name: 'Microsoft Teams', tone: 'rose', text: 'Notify the team inside Teams.' },
        ]}
      />
      <FeatureGrid
        tone="muted"
        title="You choose what is sent"
        cols={4}
        items={[
          { icon: 'plus', title: 'New pin', text: 'When someone adds a comment.' },
          { icon: 'chat', title: 'Reply to a pin', text: 'When a discussion moves.' },
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
      <Hero
        eyebrow="Teams and clients"
        title="One workspace for every client"
        lead="Keep each client or team in its own workspace, invite members and guests, and see pending invitations in one place."
        primary={HERO_TRIAL}
        secondary={PRICING}
        visual={<ProductMock kind="status" />}
      />
      <FeatureGrid
        title="Built for agencies and in-house teams"
        items={[
          { icon: 'layers', title: 'Workspaces', text: 'Switch between clients from the top of the Projects panel.' },
          { icon: 'team', title: 'Members and guests', text: 'Invite teammates to work and guests to review.' },
          { icon: 'mail', title: 'Pending invites', text: 'See who has not joined yet without leaving the Team page.' },
          { icon: 'search', title: 'Search everything', text: 'Press Ctrl K to jump to a project, page or workspace.' },
          { icon: 'bell', title: 'Notifications', text: 'Stay current on pins across every workspace.' },
          { icon: 'archive', title: 'Archive', text: 'Keep finished client work tidy and restorable.' },
        ]}
      />
      <CTABand title="Give each client a home" secondary={PRICING} />
    </SiteLayout>
  );
}
