import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from './icons';
import Accordion from './Accordion';
import useScrollReveal from '../hooks/useScrollReveal';

const FAQ_ITEMS = [
  {
    question: 'How does Kommently work?',
    answer:
      'Paste a website link or upload PDFs and images. Switch to Comment, click anywhere, and write your note. Each comment is pinned to that spot, with the page URL, device size, and a screenshot, and opens a thread for the discussion.',
  },
  {
    question: 'Do I need to install anything on my website?',
    answer:
      'No. There is no script to add and no browser extension. Kommently loads the page for you, including staging sites and pages behind a login, and you review it in the browser.',
  },
  {
    question: 'What if a website can\u2019t be loaded?',
    answer:
      'A few sites use firewall protection that blocks review tools. Kommently tells you when that happens, and you can still collect feedback by uploading screenshots or a PDF of the pages to a document project.',
  },
  {
    question: 'Do clients need an account to review?',
    answer:
      'No. Share a review link and clients can view the site and pin their own comments with just a name and email. You can protect links with a password and an expiry date, make them view-only, or turn them off at any time.',
  },
  {
    question: 'Can I keep each client separate?',
    answer:
      'Yes. Create a workspace per client and keep their sites and documents in it. Invite people to the whole workspace, give each person Can manage, Can comment or Can view, and share one review link that lists every project in it. One plan covers all your workspaces.',
  },
  {
    question: 'Which tools does Kommently connect to?',
    answer:
      'Slack, Microsoft Teams, and Discord get notifications for new pins, comments, and status changes. Jira gets a new issue for every new pin. Integrations are included from the Starter plan and can be set for the whole workspace or per project.',
  },
  {
    question: 'How is our data handled?',
    answer:
      'Everything is sent over HTTPS, access is limited to your workspace members and the guests you invite, and you can export your data or delete your workspace from settings at any time. Payments are processed by Razorpay or PayPal; we never see card details.',
  },
];

export default function FaqSection() {
  const ref = useScrollReveal();

  return (
    <section id="faq" className="section-pad scroll-mt-24" ref={ref}>
      <div className="site-container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start" data-reveal>
          <span className="eyebrow">FAQ</span>
          <h2 className="section-heading mt-5">Questions, answered.</h2>
          <p className="body-large mt-4">Can't find what you need? We reply to every message, usually within one business day.</p>
          <Link to="/support" className="button-secondary mt-8">
            Contact support
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div data-reveal data-delay="1">
          <Accordion items={FAQ_ITEMS} idPrefix="faq" />
        </div>
      </div>
    </section>
  );
}
