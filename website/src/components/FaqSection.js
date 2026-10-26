import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightIcon, ChevronDownIcon } from './icons';
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

function FaqItem({ item, isOpen, onToggle, id }) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-6 py-5 text-left"
        >
          <span className="text-base font-semibold text-slate-950 sm:text-[17px]">{item.question}</span>
          <ChevronDownIcon className={`h-5 w-5 flex-none text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#003dff]' : ''}`} />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={id}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-[65ch] pb-6 text-[15px] leading-7 text-slate-600">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection() {
  const ref = useScrollReveal();
  const [openIndex, setOpenIndex] = useState(0);

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
        <div className="rounded-2xl border border-slate-200 bg-white px-6 sm:px-8" data-reveal data-delay="1">
          {FAQ_ITEMS.map((item, index) => (
            <FaqItem
              key={item.question}
              id={`faq-${index}`}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
