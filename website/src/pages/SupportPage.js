import React, { useEffect, useState } from 'react';
import Accordion from '../components/Accordion';
import { chatAvailable, openChat } from '../utils/supportChat';
import { SiteLayout, Section, SectionHeader, Icon } from '../components/site';

// Short, accurate answers to the questions support gets most. The app's
// Help & support panel shows the same list (client/src/components/support/supportFaq.js).
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
      icon: 'chat',
      title: 'Chat with us',
      meta: 'Fastest during business hours',
      copy: 'Ask a quick question and get an answer in the chat, or by email if we are away.',
      action: <button type="button" onClick={handleChat} className="kc-btn pri lg">Start a chat</button>,
    },
    {
      icon: 'mail',
      title: 'Email',
      meta: SUPPORT_EMAIL,
      copy: 'Best for billing, security and longer questions with screenshots.',
      action: <a href={`mailto:${SUPPORT_EMAIL}`} className="kc-btn sec lg">Write an email</a>,
    },
    {
      icon: 'edit',
      title: 'Contact form',
      meta: 'Below on this page',
      copy: 'Tell us what you were trying to do and we reply by email.',
      action: <a href="#contact" className="kc-btn sec lg">Open the form</a>,
    },
  ].filter(Boolean);

  return (
    <SiteLayout>
      <Section tone="light">
        <SectionHeader
          as="h1"
          eyebrow="Support"
          title="How can we help?"
          lead="Find a quick answer below, or reach the team. We reply to every message."
        />
        <div className={`km-grid ${contactOptions.length === 3 ? 'c3' : 'c2'}`}>
          {contactOptions.map(({ icon, title, meta, copy, action }) => (
            <article key={title} className="km-feat">
              <span className="km-ico"><Icon name={icon} size={20} /></span>
              <h2 className="km-h3">{title}</h2>
              <p className="km-note" style={{ margin: 0 }}>{meta}</p>
              <p>{copy}</p>
              <div style={{ marginTop: 'auto', paddingTop: 12 }}>{action}</div>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeader
          eyebrow="Common questions"
          title="Quick answers"
          lead="The questions we hear most, answered in a few lines."
        />
        <Accordion items={HELP_ITEMS} idPrefix="help" />
      </Section>

      <Section id="contact" tone="light">
        <div className="km-split" style={{ alignItems: 'start' }}>
          <div className="km-split-t">
            <div className="km-eyebrow">Contact</div>
            <h2 className="km-h2 sm">Tell us what is blocking your review</h2>
            <p className="km-lead">
              Include the project type, affected workflow, and any links or screenshots your team can safely share.
            </p>
            <ul className="km-points">
              {[
                ['clock', 'Typical response within one business day'],
                ['shield', 'Security and billing requests are handled privately'],
                ['team', 'Enterprise teams can request onboarding help'],
              ].map(([icon, text]) => (
                <li key={text}><Icon name={icon} size={16} stroke={2} />{text}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="km-feat" style={{ position: 'relative', gap: 16, padding: 32, alignItems: 'stretch' }}>
            <div className="km-grid c2" style={{ gap: 16 }}>
              <div className="kc-field">
                <label htmlFor="support-name">Name</label>
                <input
                  id="support-name"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="kc-input"
                />
              </div>
              <div className="kc-field">
                <label htmlFor="support-email">Email</label>
                <input
                  id="support-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="kc-input"
                />
              </div>
            </div>
            <div className="kc-field">
              <label htmlFor="support-topic">Topic</label>
              <select
                id="support-topic"
                value={form.topic}
                onChange={(event) => setForm({ ...form, topic: event.target.value })}
                className="kc-select"
              >
                <option>Product support</option>
                <option>Billing</option>
                <option>Integrations</option>
                <option>Security</option>
                <option>Sales</option>
                <option>Other</option>
              </select>
            </div>
            <div className="kc-field">
              <label htmlFor="support-message">Message</label>
              <textarea
                id="support-message"
                required
                rows="5"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                className="kc-textarea"
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
              style={{ position: 'absolute', left: -9999, width: 0, height: 0, opacity: 0 }}
            />
            <button type="submit" disabled={status.state === 'sending'} className="kc-btn pri lg block">
              {status.state === 'sending' ? 'Sending…' : 'Send support request'}
              <Icon name="arrow" size={16} stroke={2} />
            </button>
            {status.state === 'sent' ? (
              <p role="status" style={{ margin: 0, padding: '12px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--success-50)', color: 'var(--success-700)', fontWeight: 500 }}>
                Thanks, your message was sent. We'll reply by email.
              </p>
            ) : null}
            {status.state === 'error' ? (
              <p role="alert" style={{ margin: 0, padding: '12px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--danger-50)', color: 'var(--danger-600)', fontWeight: 500 }}>
                {status.message} You can also email <a style={{ textDecoration: 'underline' }} href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
            ) : null}
          </form>
        </div>
      </Section>
    </SiteLayout>
  );
}
