import React from 'react';
import { HeroCentered } from '../components/site/heroes';
import {
  SiteLayout, ProductMock, StepList, FeatureGrid, FeatureSplit, IntegrationGrid, CTABand, TRIAL,
} from '../components/site';

// The design system's LandingPage (kommently-design-system/preview/LandingPage.html):
// a selling hero (centered headline, trust facts, product stage), how it works, what you get, approvals, integrations, closing CTA band.
// Keep the order: each block answers the visitor's next question.
export default function LandingPage() {
  return (
    <SiteLayout>
      <HeroCentered />
      <StepList
        id="how"
        eyebrow="How it works"
        title="From first link to approval in three steps"
        steps={[
          { title: 'Add a website or document', text: 'Start a project from a page link or a PDF, inside the workspace it belongs to.' },
          { title: 'Drop pins where it matters', text: 'Click anywhere to leave a numbered comment. Your reviewers do the same, and you reply on each pin.' },
          { title: 'Resolve and approve', text: 'Resolve pins as they are fixed, then mark the project Approved.' },
        ]}
      />
      <FeatureGrid
        id="features"
        eyebrow="What you get"
        title="Everything a review needs, nothing it does not"
        items={[
          { icon: 'globe', title: 'Pins on websites', text: 'Comment on the exact spot of a live page instead of describing it in an email.' },
          { icon: 'doc', title: 'Pins on documents', text: 'Review PDFs such as brand guidelines and campaign decks the same way.' },
          { icon: 'okc', title: 'Review status', text: 'Every project is In review, Changes requested or Approved, on the card and in the filters.' },
          { icon: 'layers', title: 'Workspaces', text: 'Keep each client or team in its own workspace with its own projects.' },
          { icon: 'bell', title: 'Mentions and notifications', text: 'Be told when someone comments, replies or mentions you.' },
          { icon: 'link', title: 'Integrations', text: 'Send pins to Slack, Jira, Discord or Microsoft Teams.' },
        ]}
      />
      <FeatureSplit
        tone="muted"
        eyebrow="Approvals"
        title="See what is open, what is fixed, and what is signed off"
        text="Each project card shows its status and how many pins are open or resolved, so nobody has to ask where things stand."
        points={['Filter by In review, Changes requested or Approved', 'Open and resolved counts on every card', 'Archive finished projects and restore them any time']}
        visual={<ProductMock kind="status" />}
      />
      <IntegrationGrid
        id="integrations"
        tone="light"
        eyebrow="Integrations"
        title="Send pins where your team already works"
        lead="Choose which events are sent: new pins, comments, resolved or reopened pins."
        items={[
          { name: 'Slack', tone: 'blue', text: 'Post pins to a channel.' },
          { name: 'Jira', tone: 'green', text: 'Turn feedback into issues.' },
          { name: 'Discord', tone: 'amber', text: 'Keep a community or studio in the loop.' },
          { name: 'Microsoft Teams', tone: 'rose', text: 'Notify the team in Teams.' },
        ]}
      />
      <CTABand
        title="Review your next page with pins"
        text="Start your 30-day Pro trial and add your first project in minutes."
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </SiteLayout>
  );
}
