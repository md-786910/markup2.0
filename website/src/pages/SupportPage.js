import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowRightIcon, ChatIcon, CheckIcon, ClockIcon, FileTextIcon, LockIcon, PlugIcon, ShieldIcon, UsersIcon } from '../components/icons';

const HELP_TOPICS = [
  {
    title: 'Invite guests to a review',
    category: 'Collaboration',
    description: 'Create controlled links for clients and stakeholders without adding them to your workspace.',
    icon: UsersIcon,
  },
  {
    title: 'Connect Slack, Jira, or Discord',
    category: 'Integrations',
    description: 'Route resolved comments, new pins, and review updates into the tools your team already uses.',
    icon: PlugIcon,
  },
  {
    title: 'Manage project access',
    category: 'Security',
    description: 'Use private projects, passwords, and workspace roles to keep sensitive reviews governed.',
    icon: LockIcon,
  },
  {
    title: 'Review PDFs, images, and URLs',
    category: 'Projects',
    description: 'Start a review from a live website or uploaded file and keep every comment in one thread.',
    icon: FileTextIcon,
  },
  {
    title: 'Resolve and archive feedback',
    category: 'Workflow',
    description: 'Track open, resolved, and archived comments so launch readiness is visible.',
    icon: CheckIcon,
  },
  {
    title: 'Billing and plan changes',
    category: 'Billing',
    description: 'Update payment details, switch plans, and review invoices from workspace settings.',
    icon: ShieldIcon,
  },
];

const SUPPORT_PATHS = [
  ['Live chat', 'Weekdays, 9am-6pm IST', 'Best for account and setup questions.'],
  ['Email support', 'hello@feedbackly.online', 'Best for billing, security, and longer troubleshooting.'],
  ['Priority routing', 'Pro and Enterprise', 'Fastest help for production review workflows.'],
];

export default function SupportPage() {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', email: '', topic: 'Product support', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredTopics = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return HELP_TOPICS;
    return HELP_TOPICS.filter((topic) => (
      `${topic.title} ${topic.category} ${topic.description}`.toLowerCase().includes(normalized)
    ));
  }, [query]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    setForm({ name: '', email: '', topic: 'Product support', message: '' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content">
        <section className="page-hero">
          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <span className="eyebrow">Support center</span>
            <h1 className="display-heading mt-6">
              Get unstuck quickly and keep reviews moving.
            </h1>
            <p className="body-large mx-auto mt-6 max-w-2xl">
              Search common workflows, contact support, or route urgent review issues to the right team.
            </p>
            <div className="mx-auto mt-9 max-w-2xl rounded-full border border-slate-200 bg-white/80 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
              <label className="sr-only" htmlFor="support-search">Search support topics</label>
              <input
                id="support-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sharing, billing, integrations..."
                className="h-12 w-full rounded-full border-0 bg-white px-5 text-sm text-slate-900 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="section-shell section-pad-tight">
          <div className="site-container relative z-10">
            <div className="grid gap-5 md:grid-cols-3">
              {SUPPORT_PATHS.map(([title, meta, copy]) => (
                <article key={title} className="premium-card p-6">
                  <ChatIcon className="h-6 w-6 text-[#2854ff]" />
                  <h2 className="mt-5 font-display text-xl font-semibold text-slate-950">{title}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{meta}</p>
                  <p className="body-copy mt-3">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="soft-band section-pad">
          <div className="site-container">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="eyebrow">Help library</span>
                <h2 className="section-heading mt-5">Popular support topics</h2>
              </div>
              <p className="text-sm text-slate-500">{filteredTopics.length} article{filteredTopics.length === 1 ? '' : 's'} found</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <article key={topic.title} className="premium-card p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="icon-tile">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{topic.category}</span>
                    </div>
                    <h3 className="mt-6 font-display text-xl font-semibold leading-tight text-slate-950">{topic.title}</h3>
                    <p className="body-copy mt-3">{topic.description}</p>
                    <a href="#contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2854ff]">
                      Get help
                      <ArrowRightIcon className="h-4 w-4" />
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contact" className="section-pad">
          <div className="site-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="eyebrow">Contact</span>
              <h2 className="section-heading mt-5 lg:text-4xl">Tell us what is blocking your review.</h2>
              <p className="body-copy mt-4">
                Include the project type, affected workflow, and any links or screenshots your team can safely share.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  [ClockIcon, 'Typical response within one business day'],
                  [ShieldIcon, 'Security and billing requests are handled privately'],
                  [UsersIcon, 'Enterprise teams can request onboarding help'],
                ].map(([Icon, text]) => (
                  <div key={text} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <Icon className="h-5 w-5 text-[#2854ff]" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="premium-card p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="support-name">Name</label>
                  <input
                    id="support-name"
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#2854ff]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="support-email">Email</label>
                  <input
                    id="support-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#2854ff]"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-semibold text-slate-700" htmlFor="support-topic">Topic</label>
                <select
                  id="support-topic"
                  value={form.topic}
                  onChange={(event) => setForm({ ...form, topic: event.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#2854ff]"
                >
                  <option>Product support</option>
                  <option>Billing</option>
                  <option>Integrations</option>
                  <option>Security</option>
                  <option>Sales</option>
                </select>
              </div>
              <div className="mt-4">
                <label className="text-sm font-semibold text-slate-700" htmlFor="support-message">Message</label>
                <textarea
                  id="support-message"
                  required
                  rows="5"
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2854ff]"
                  placeholder="Share what you were trying to do and what happened."
                />
              </div>
              <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2854ff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(40,84,255,0.24)] transition hover:bg-[#1f45dd]">
                Send support request
                <ArrowRightIcon className="h-4 w-4" />
              </button>
              {submitted ? (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  Request drafted. Our team will follow up by email.
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
