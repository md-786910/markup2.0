import React, { useState } from 'react';
import useScrollReveal from '../hooks/useScrollReveal';

const FAQ_ITEMS = [
  {
    question: 'Is Feedbackly a free alternative to Markup.io?',
    answer:
      'Yes. Feedbackly offers a free forever plan with 3 projects, 5 team members, and 2 guest reviewers. Paid plans start at $12/month — compared to Markup.io\'s $39/month starting price. You get real-time collaboration, guest review links, and integrations with Slack, Discord, and Jira.',
  },
  {
    question: 'How does visual feedback work on a live website?',
    answer:
      'Add your website URL to Feedbackly and it loads inside our review environment. Click anywhere on the page to drop a feedback pin. Each pin is anchored to the exact element, so your feedback stays precise even when the page layout changes. Your team sees pins in real-time.',
  },
  {
    question: 'Can clients leave feedback without creating an account?',
    answer:
      'Absolutely. Generate a password-protected guest review link and share it with clients. They can view the project, drop feedback pins, and leave comments — no signup required. You control access with passwords and expiration dates.',
  },
  {
    question: 'Does Feedbackly work with PDFs and design files?',
    answer:
      'Yes. Upload PDFs and multi-page documents directly to Feedbackly. Navigate pages, drop feedback pins, and collaborate with threaded comments — the same workflow as website review, applied to documents.',
  },
  {
    question: 'What integrations does Feedbackly support?',
    answer:
      'Feedbackly integrates with Slack, Discord, and Jira. Get instant notifications when feedback is posted, and auto-create Jira issues directly from feedback pins. More integrations are on the roadmap.',
  },
  {
    question: 'How is Feedbackly different from BugHerd or Pastel?',
    answer:
      'Feedbackly combines the best of both: visual pin-based feedback like BugHerd with real-time collaboration and guest review links like Pastel. Plus, Feedbackly includes PDF review, device mode preview, and starts with a free forever plan — no 14-day trial limits.',
  },
];

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-6 text-left hover:bg-gray-50/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-gray-900 text-[15px] sm:text-base pr-4">
          {item.question}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-6 pb-5 text-gray-500 leading-relaxed text-[15px]">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const ref = useScrollReveal();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-white py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">FAQ</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
            Frequently asked questions
          </h2>
          <p className="text-lg text-gray-500 mt-4">
            Everything you need to know before making the switch.
          </p>
        </div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto mt-16" data-reveal data-delay="1">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
