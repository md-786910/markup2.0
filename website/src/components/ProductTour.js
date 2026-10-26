import React from 'react';
import { CheckIcon, MonitorIcon, PinIcon, LockIcon, FileTextIcon, ChatIcon, ClockIcon } from './icons';
import ProductShot from './ProductShot';
import useScrollReveal from '../hooks/useScrollReveal';

// What Kommently does differently, each with a real screenshot of the product
const ROWS = [
  {
    id: 'live-sites',
    eyebrow: 'No install',
    title: 'Review the real site, not screenshots.',
    copy: 'Kommently loads the live page for you: production, staging, or pages behind a login. No script to add, no extension to install, nothing to deploy.',
    points: ['Works on staging and logged-in pages', 'Navigate the site while you review', 'Comments stay pinned to the element'],
    image: '/images/product/project-thread.webp',
    alt: 'A comment thread next to the live website being reviewed',
    url: 'app.kommently.app/project/website-relaunch',
  },
  {
    id: 'devices',
    eyebrow: 'Every device',
    title: 'Desktop, tablet, and mobile, each with its own feedback.',
    copy: 'Switch the preview to 1440, 768, or 375 pixels wide. Pins are kept per device, so a mobile layout bug never hides among desktop notes.',
    points: ['Separate pins per screen size', 'Automatic screenshot with every pin', 'Exact page URL and viewport saved'],
    image: '/images/product/device-mobile.webp',
    alt: 'The mobile preview of a website with a pin on the header and its comment',
    url: 'app.kommently.app/project/website-relaunch',
  },
  {
    id: 'documents',
    eyebrow: 'PDFs and images',
    title: 'Brochures, decks, and mockups in the same place.',
    copy: 'Upload up to 10 PDFs or images per project and pin comments on any page. Print, design, and web feedback finally live together.',
    points: ['Multi-page PDF review', 'Images and design exports', 'Same threads, mentions, and statuses'],
    image: '/images/product/document-review.webp',
    alt: 'A PDF brochure with numbered comment pins',
    url: 'app.kommently.app/project/spring-campaign',
  },
  {
    id: 'clients',
    eyebrow: 'Client reviews',
    title: 'Clients review with a link. No account needed.',
    copy: 'Share a review link with clients and stakeholders. They pin comments on the page just like your team, and you decide how much they can do.',
    points: ['Password and expiry on every link', 'View-only or commenting', 'Guest feedback arrives in your workspace'],
    image: '/images/product/guest-review.webp',
    alt: 'The guest review page with feedback from a client in the sidebar',
    url: 'app.kommently.app/review/…',
  },
  {
    id: 'workspaces',
    eyebrow: 'Workspaces',
    title: 'A workspace for every client.',
    copy: 'Group each client\'s sites and documents in their own workspace. Switch between them in one click, and share one review link that lists every project inside, new ones included.',
    points: ['One review link per client, with password and expiry', 'Invite people to a whole workspace', 'One plan and one bill for all workspaces'],
    image: '/images/product/workspaces.webp',
    alt: 'The Kommently dashboard with the workspace switcher open, listing client workspaces',
    url: 'app.kommently.app/dashboard',
  },
  {
    id: 'access',
    eyebrow: 'Access',
    title: 'Everyone gets exactly the access they need.',
    copy: 'Give each person Can manage, Can comment or Can view on a workspace, and it applies to every project in it. Raise it for a single project when you need to. Owners and admins see everything; clients stay a guest.',
    points: ['Can manage, Can comment, Can view', 'Set once on the workspace, change per project', 'Guests never get more than commenting'],
    image: '/images/product/workspace-access.webp',
    alt: 'Workspace members with Can manage, Can comment and Can view access',
    url: 'app.kommently.app/settings',
  },
];

const DETAILS = [
  [PinIcon, 'Pinned to the element', 'Pins follow the element they were placed on, even when the layout shifts.'],
  [MonitorIcon, 'Context with every comment', 'Page URL, device size, and a screenshot travel with each pin.'],
  [ChatIcon, 'Threads and mentions', 'Reply, @mention teammates, attach files, and get email digests.'],
  [ClockIcon, 'Real time', 'See who is online and new comments as they happen, without refreshing.'],
  [FileTextIcon, 'Versions and activity', 'Snapshot a review round and see who changed what, when.'],
  [LockIcon, 'Your data, your control', 'Export everything as JSON or delete your organization from settings at any time.'],
];

function TourRow({ row, index }) {
  const ref = useScrollReveal();
  const flipped = index % 2 === 1;
  return (
    <div ref={ref} id={row.id} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
      <div className={flipped ? 'lg:order-2' : ''} data-reveal>
        <span className="eyebrow">{row.eyebrow}</span>
        <h3 className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">{row.title}</h3>
        <p className="body-large mt-4">{row.copy}</p>
        <ul className="mt-6 space-y-3">
          {row.points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-[15px] text-slate-700">
              <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#003dff]" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={flipped ? 'lg:order-1' : ''} data-reveal data-delay="1">
        <ProductShot src={row.image} alt={row.alt} url={row.url} />
      </div>
    </div>
  );
}

export default function ProductTour() {
  const ref = useScrollReveal();
  return (
    <section id="features" className="soft-band section-pad scroll-mt-24">
      <div className="site-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Why Kommently</span>
          <h2 className="section-heading mt-5">Built for the way websites actually get reviewed.</h2>
        </div>
        <div className="mt-16 space-y-20 lg:space-y-28">
          {ROWS.map((row, index) => <TourRow key={row.id} row={row} index={index} />)}
        </div>
        <div ref={ref} className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:mt-28">
          {DETAILS.map(([Icon, title, copy], index) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6" data-reveal data-delay={String((index % 3) + 1)}>
              <Icon className="h-5 w-5 text-[#003dff]" />
              <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
