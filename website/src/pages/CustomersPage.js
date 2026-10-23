import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';
import { ArrowRightIcon, CheckIcon, ShareIcon, CodeIcon, GlobeIcon } from '../components/icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

// Matches the app's roles (server/middleware/roles.js)
const ROLES = [
  ['Owner', 'Manages the plan and billing, plus everything an admin can do.'],
  ['Admin', 'Creates projects and share links, invites people, and sets up integrations.'],
  ['Member', 'Pins comments, replies, and resolves feedback on the projects they are added to.'],
  ['Guest', 'Reviews through a share link with a name and email. No account, no seat.'],
];

const CUSTOMER_SEGMENTS = [
  {
    icon: ShareIcon,
    title: 'Agencies',
    description: 'Collect client notes on live work without turning every review into screenshots, email threads, and status calls.',
    metrics: ['Guest review links, no client signup', 'Password and expiry on shared links', 'Version snapshots and activity history'],
  },
  {
    icon: CodeIcon,
    title: 'Product teams',
    description: 'Keep PMs, designers, engineers, and QA aligned around precise comments, before a release goes sideways.',
    metrics: ['Screenshot and device size on every pin', 'Jira issues created from new pins', 'Real-time presence and threads'],
  },
  {
    icon: GlobeIcon,
    title: 'Web operations',
    description: 'Review landing pages, PDFs, and campaign assets with clear ownership and no account friction for stakeholders.',
    metrics: ['Paste a URL, no install or snippet', 'PDF and image review in the same project', 'Slack, Discord, and Teams updates'],
  },
];

export default function CustomersPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content">
        <section className="page-hero">
          <div className="site-container relative z-10 grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div className="max-w-3xl">
              <span className="eyebrow">Use cases</span>
              <h1 className="display-heading mt-6">
                Review workflows that feel clear to every stakeholder.
              </h1>
              <p className="body-large mt-6 max-w-2xl">
                Kommently helps agencies, product teams, and web operations groups turn scattered visual feedback into accountable review cycles.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={`${APP_URL}/onboarding`} className="button-primary px-8 py-4">
                  Start free
                  <ArrowRightIcon className="h-5 w-5" />
                </a>
                <a href="/pricing" className="button-secondary px-8 py-4">
                  View plans
                </a>
              </div>
            </div>

            <div className="premium-card p-4 sm:p-5">
              <div className="rounded-[20px] bg-white p-5 text-[#0f172a]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Review health</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">Campaign launch</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#003dff]">On track</span>
                </div>
                {[
                  ['Homepage QA', '12 resolved', 'bg-[#eef3ff] text-[#0031d1]'],
                  ['Client copy pass', '4 open', 'bg-amber-50 text-amber-700'],
                  ['Mobile polish', 'Ready', 'bg-emerald-50 text-[#003dff]'],
                ].map(([label, value, tone]) => (
                  <div key={label} className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <span className="icon-tile h-10 w-10">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-[#475569]">{label}</span>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell section-pad">
          <div className="site-container relative z-10">
            <div className="max-w-3xl">
              <span className="eyebrow">Teams</span>
              <h2 className="section-heading mt-5">Built for the teams that own review quality.</h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {CUSTOMER_SEGMENTS.map((segment) => (
                <article key={segment.title} className="premium-card hover-lift p-7">
                  <div className="icon-tile h-12 w-12">
                    <segment.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-semibold text-[#0f172a]">{segment.title}</h3>
                  <p className="body-copy mt-3">{segment.description}</p>
                  <ul className="mt-6 space-y-3">
                    {segment.metrics.map((metric) => (
                      <li key={metric} className="flex items-center gap-3 text-sm font-medium text-[#475569]">
                        <CheckIcon className="h-4 w-4 text-[#003dff]" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="site-container">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Roles</span>
              <h2 className="section-heading mt-5">One workspace for every approval path.</h2>
              <p className="body-large mt-4">
                Bring in teammates and clients with the right level of access, without changing the way your team ships.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map(([role, copy]) => (
                <div key={role} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="font-display text-lg font-semibold text-slate-950">{role}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}


