import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';
import { ArrowRightIcon, CheckIcon, ChatIcon, ClockIcon, CodeIcon, ShieldIcon, UsersIcon, ZapIcon } from '../components/icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

const CUSTOMER_SEGMENTS = [
  {
    title: 'Agencies',
    description: 'Collect client notes on live work without turning every review into screenshots, email threads, and status calls.',
    metrics: ['42% fewer revision loops', 'Guest review links', 'Approval-ready history'],
  },
  {
    title: 'Product teams',
    description: 'Keep PMs, designers, engineers, and QA aligned around precise feedback before a release goes sideways.',
    metrics: ['3x faster triage', 'Version-aware comments', 'Jira-ready context'],
  },
  {
    title: 'Web operations',
    description: 'Review landing pages, PDFs, and campaign assets with clear ownership, due dates, and no account friction for stakeholders.',
    metrics: ['30 sec setup', 'Real-time presence', 'Secure sharing'],
  },
];

const STORIES = [
  {
    company: 'Northstar Studio',
    type: 'Creative agency',
    result: 'Cut client approval time from five days to two.',
    quote: 'Markly gave our clients one place to review the actual page. Developers stopped receiving vague screenshots and project managers stopped translating feedback.',
  },
  {
    company: 'Luma Commerce',
    type: 'SaaS product team',
    result: 'Reduced launch QA meetings by 38%.',
    quote: 'Every issue arrives with viewport, page, and thread history. Our engineers can reproduce feedback without asking three follow-up questions.',
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
              <span className="eyebrow">Customer outcomes</span>
              <h1 className="display-heading mt-6">
                Review workflows that feel clear to every stakeholder.
              </h1>
              <p className="body-large mt-6 max-w-2xl">
                Markly helps agencies, product teams, and web operations groups turn scattered visual feedback into accountable review cycles.
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
              <div className="rounded-[20px] bg-white p-5 text-slate-950">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Review health</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">Campaign launch</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">On track</span>
                </div>
                {[
                  ['Homepage QA', '12 resolved', 'bg-blue-50 text-blue-700'],
                  ['Client copy pass', '4 open', 'bg-amber-50 text-amber-700'],
                  ['Mobile polish', 'Ready', 'bg-emerald-50 text-emerald-700'],
                ].map(([label, value, tone]) => (
                  <div key={label} className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                      <span className="icon-tile h-10 w-10">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-slate-800">{label}</span>
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
                    <UsersIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-semibold text-slate-950">{segment.title}</h3>
                  <p className="body-copy mt-3">{segment.description}</p>
                  <ul className="mt-6 space-y-3">
                    {segment.metrics.map((metric) => (
                      <li key={metric} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                        <CheckIcon className="h-4 w-4 text-emerald-600" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="soft-band section-pad">
          <div className="site-container">
            <div className="grid gap-6 lg:grid-cols-2">
              {STORIES.map((story) => (
                <article key={story.company} className="premium-card p-7 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2854ff]">{story.type}</p>
                  <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950">{story.company}</h3>
                  <p className="mt-2 text-lg font-semibold text-slate-700">{story.result}</p>
                  <p className="body-copy mt-6">"{story.quote}"</p>
                </article>
              ))}
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[
                [ClockIcon, '30 sec', 'to start a review'],
                [ChatIcon, '68%', 'less feedback drift'],
                [CodeIcon, '3x', 'faster issue triage'],
                [ShieldIcon, '99.9%', 'uptime target'],
              ].map(([Icon, value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="h-5 w-5 text-[#2854ff]" />
                  <div className="mt-4 font-display text-3xl font-bold text-slate-950">{value}</div>
                  <p className="mt-1 text-sm text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <ZapIcon className="mx-auto h-8 w-8 text-[#2854ff]" />
            <h2 className="section-heading mt-5">One workspace for every approval path.</h2>
            <p className="body-large mx-auto mt-5 max-w-2xl">
              Invite internal reviewers, external clients, QA partners, or executives without changing the way your team ships.
            </p>
          </div>
        </section>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
