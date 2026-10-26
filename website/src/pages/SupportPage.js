import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Accordion from '../components/Accordion';
import { chatAvailable, openChat } from '../utils/supportChat';
import { ArrowRightIcon, ChatIcon, ClipboardIcon, ClockIcon, MailIcon, ShieldIcon, UsersIcon } from '../components/icons';

// Short, accurate answers to the questions support gets most
const HELP_ITEMS = [
  {
    question: 'How do I invite a client to review?',
    answer: 'Open the project and click Share to create a review link. Clients open it, add their name and email once, and pin comments without an account. You can add a password and an expiry date, or make the link view-only. To share every project of a client at once, turn on the review link of their workspace in Settings → Workspaces.',
  },
  {
    question: 'How do I control who can see a project?',
    answer: 'Give each person Can manage, Can comment or Can view on a workspace, and it applies to every project in it. You can change it for a single project from its Members page. Owners and admins see everything, and guests can comment at most.',
  },
  {
    question: 'Which files can I review?',
    answer: 'Live websites (production, staging, or pages behind a login), and up to 10 PDFs or images per document project. Comments work the same way on all of them, on desktop, tablet and mobile sizes.',
  },
  {
    question: 'Why doesn\u2019t a website load in Kommently?',
    answer: 'Some sites use firewall or bot protection that blocks review tools. Kommently shows a message when that happens. You can still collect feedback by uploading screenshots or a PDF of the pages to a document project.',
  },
  {
    question: 'How do I connect Slack, Jira, Discord or Teams?',
    answer: 'Owners and admins can connect them from Integrations in the app, for the whole organization or one project, on the Starter plan and up. Slack, Discord and Teams use a channel webhook; Jira creates an issue for every new pin.',
  },
  {
    question: 'How do I change my plan or get an invoice?',
    answer: 'The organization owner can upgrade, downgrade or cancel in Settings → Billing, and find every invoice in Settings → Invoices. Cancelling keeps your plan until the end of the period you paid for.',
  },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SUPPORT_EMAIL = 'hello@kommently.app';
const EMPTY_FORM = { name: '', email: '', topic: 'Product support', message: '', website: '' };

export default function SupportPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ state: 'idle', message: '' }); // idle | sending | sent | error

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChat = async () => {
    try {
      if (await openChat()) return;
    } catch {
      // fall through to the form
    }
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: 'sending', message: '' });
    try {
      const response = await fetch(`${API_URL}/api/support/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'We could not send your message.');
      setStatus({ state: 'sent', message: '' });
      setForm(EMPTY_FORM);
    } catch (err) {
      setStatus({ state: 'error', message: err.message || 'We could not send your message.' });
    }
  };

  const contactOptions = [
    chatAvailable && {
      icon: ChatIcon,
      title: 'Chat with us',
      meta: 'Fastest during business hours',
      copy: 'Ask a quick question and get an answer in the chat, or by email if we are away.',
      action: <button type="button" onClick={handleChat} className="button-primary mt-5">Start a chat</button>,
    },
    {
      icon: MailIcon,
      title: 'Email',
      meta: SUPPORT_EMAIL,
      copy: 'Best for billing, security and longer questions with screenshots.',
      action: <a href={`mailto:${SUPPORT_EMAIL}`} className="button-secondary mt-5">Write an email</a>,
    },
    {
      icon: ClipboardIcon,
      title: 'Contact form',
      meta: 'Below on this page',
      copy: 'Tell us what you were trying to do and we reply by email.',
      action: <a href="#contact" className="button-secondary mt-5">Open the form</a>,
    },
  ].filter(Boolean);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content">
        <section className="page-hero">
          <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <span className="eyebrow">Support</span>
            <h1 className="display-heading mt-6">How can we help?</h1>
            <p className="body-large mx-auto mt-6 max-w-2xl">
              Find a quick answer below, or reach the team. We reply to every message.
            </p>
          </div>
        </section>

        <section className="pb-16 sm:pb-20">
          <div className={`site-container grid gap-5 ${contactOptions.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {contactOptions.map(({ icon: Icon, title, meta, copy, action }) => (
              <article key={title} className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6">
                <span className="icon-tile">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 font-display text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{meta}</p>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">{copy}</p>
                <div className="mt-auto">{action}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="soft-band section-pad">
          <div className="site-container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <span className="eyebrow">Common questions</span>
              <h2 className="section-heading mt-5">Quick answers.</h2>
              <p className="body-large mt-4">The questions we hear most, answered in a few lines.</p>
            </div>
            <Accordion items={HELP_ITEMS} idPrefix="help" />
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
                  <div key={text} className="flex items-center gap-3 text-sm font-medium text-[#475569]">
                    <Icon className="h-5 w-5 text-[#003dff]" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="support-name">Name</label>
                  <input
                    id="support-name"
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-[#003dff] focus:ring-2 focus:ring-[#003dff]/15"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="support-email">Email</label>
                  <input
                    id="support-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-[#003dff] focus:ring-2 focus:ring-[#003dff]/15"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700" htmlFor="support-topic">Topic</label>
                <select
                  id="support-topic"
                  value={form.topic}
                  onChange={(event) => setForm({ ...form, topic: event.target.value })}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-[#003dff] focus:ring-2 focus:ring-[#003dff]/15"
                >
                  <option>Product support</option>
                  <option>Billing</option>
                  <option>Integrations</option>
                  <option>Security</option>
                  <option>Sales</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700" htmlFor="support-message">Message</label>
                <textarea
                  id="support-message"
                  required
                  rows="5"
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-[#003dff] focus:ring-2 focus:ring-[#003dff]/15"
                  placeholder="Share what you were trying to do and what happened."
                />
              </div>
              {/* Honeypot: hidden from people, filled by bots */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              <button
                type="submit"
                disabled={status.state === 'sending'}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#003dff] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0031d1] disabled:opacity-60"
              >
                {status.state === 'sending' ? 'Sending…' : 'Send support request'}
                <ArrowRightIcon className="h-4 w-4" />
              </button>
              {status.state === 'sent' ? (
                <p role="status" className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  Thanks, your message was sent. We'll reply by email.
                </p>
              ) : null}
              {status.state === 'error' ? (
                <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {status.message} You can also email <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
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

