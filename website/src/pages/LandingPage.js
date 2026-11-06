import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { HeroEditorial, SHOTS } from '../components/site/heroes';
import {
  SiteLayout, Shot, StepList, FeatureGrid, FeatureSplit, IntegrationGrid, CTABand,
} from '../components/site';

// Home page, built to sell: every section shows the real product (screens
// captured from the app) and states only what Kommently does today.
// Order: hero, how it works, the task board, projects and workspaces,
// everything else in a grid, integrations, closing CTA band.
export default function LandingPage() {
  const [params] = useSearchParams(); // TEMPORARY: ?bg=dots|pins|grid previews hero backgrounds
  return (
    <SiteLayout>
      <HeroEditorial bg={params.get('bg') || undefined} />

      <StepList
        id="how"
        eyebrow="How it works"
        title="From first link to approved in three steps"
        steps={[
          { title: 'Add a website or document', text: 'Paste a link to a live site, a staging site or a page behind a login, or upload up to 10 PDFs and images.' },
          { title: 'Click to comment', text: 'Each pin sticks to the element you clicked, with the page, the device size and a screenshot attached.' },
          { title: 'Track it to done', text: 'Assign each pin, set its priority and due date, and move it across the board until it is resolved.' },
        ]}
      />

      <FeatureSplit
        tone="light"
        eyebrow="Task board"
        title="Every comment becomes a task"
        text="Pins carry a status, priority, assignee, due date and labels. Move them from Open to In progress, In review and Resolved, and see what is overdue at a glance."
        points={['Filter by assignee and priority', 'Due dates with an overdue count', 'Add your own columns']}
        visual={<Shot {...SHOTS.board} />}
      />

      <FeatureSplit
        tone="muted"
        reverse
        eyebrow="Projects and workspaces"
        title="Every client and project in one place"
        text="Keep each client's websites and documents in their own workspace. Every card shows its review status and how many pins are open or resolved."
        points={['In review, Changes requested and Approved', 'Archive finished work, restore it any time', 'Jump anywhere with Ctrl K']}
        visual={<Shot {...SHOTS.projects} />}
      />

      <FeatureGrid
        id="features"
        eyebrow="What you get"
        title="Everything a review round needs"
        cols={4}
        items={[
          { icon: 'globe', title: 'Live, staging and logged-in pages', text: 'Review the real site. Nothing to install, no browser extension.' },
          { icon: 'monitor', title: 'Desktop, tablet and mobile', text: 'Pins are kept per screen size, so a mobile bug never hides among desktop notes.' },
          { icon: 'image', title: 'Screenshot and context', text: 'Every pin carries the page, the device size, a screenshot and technical details.' },
          { icon: 'doc', title: 'PDFs and images', text: 'Upload up to 10 files per project and pin comments on any page.' },
          { icon: 'share', title: 'Client review links', text: 'Clients comment without an account. Add a password and an expiry date.' },
          { icon: 'chat', title: 'Threads, mentions and files', text: 'Reply on each pin, @mention teammates and attach files.' },
          { icon: 'layers', title: 'Versions and activity', text: 'Save each review round as a version and see who changed what.' },
          { icon: 'calendar', title: 'Feedback deadlines', text: 'Set a date after which new feedback is closed.' },
        ]}
      />

      <IntegrationGrid
        id="integrations"
        tone="muted"
        eyebrow="Integrations"
        title="Send pins where your team already works"
        lead="Choose which events are sent: new pins, comments, resolved or reopened pins. Included from the Starter plan."
        items={[
          { name: 'Slack', tone: 'blue', text: 'Post new pins and comments to a channel.' },
          { name: 'Jira', tone: 'green', text: 'Create an issue for every new pin.' },
          { name: 'Discord', tone: 'amber', text: 'Keep a studio or community server in the loop.' },
          { name: 'Microsoft Teams', tone: 'rose', text: 'Notify a team channel in Teams.' },
        ]}
      />

      <CTABand
        title="Review your next page with pins"
        text="Start your 30-day Pro trial and add your first project in minutes. No credit card needed."
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </SiteLayout>
  );
}
