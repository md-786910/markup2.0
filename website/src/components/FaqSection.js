import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const FAQ_ITEMS = [
  {
    question: 'How does Markly work?',
    answer:
      'Paste a live URL or upload a file, then click anywhere to leave precise visual feedback. Every comment stays anchored to the exact page element, so designers, developers, and stakeholders all review the same context.',
  },
  {
    question: 'Do guests need an account to review?',
    answer:
      'No. You can share a review link with clients or external collaborators and let them comment without signing up. Admins still control access, passwords, expiration rules, and who can resolve feedback.',
  },
  {
    question: 'What file types can I review in Markly?',
    answer:
      'Markly supports live websites, PDFs, images, and video review workflows. Teams can keep comments in one place instead of splitting feedback across email threads, chat, and screenshots.',
  },
  {
    question: 'Can my team collaborate in real time?',
    answer:
      'Yes. Comments, replies, presence, and status changes update instantly for everyone in the review. That means fewer refreshes, fewer duplicate notes, and faster approvals.',
  },
  {
    question: 'Is guest sharing secure?',
    answer:
      'You can protect review links with passwords, expiration dates, private access rules, and internal-only visibility. That gives you client-friendly sharing without losing control of sensitive work.',
  },
  {
    question: 'Does Markly integrate with the rest of our workflow?',
    answer:
      'Yes. Teams typically connect review work to project management and communication tools so comments can move into delivery without manual copy-paste. The goal is to keep feedback actionable, not isolated.',
  },
];

function FaqItem({ item, isOpen, onToggle, index }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
        isOpen
          ? 'border-blue-200 shadow-[0_14px_40px_rgba(67,82,255,0.08)]'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left sm:px-6 sm:py-6"
      >
        <div className="min-w-0">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
            FAQ {String(index + 1).padStart(2, '0')}
          </span>
          <span className="block font-display text-lg font-semibold leading-snug text-gray-900 sm:text-[1.35rem]">
            {item.question}
          </span>
        </div>

        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
            isOpen
              ? 'border-blue-200 bg-blue-600 text-white'
              : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="mb-4 h-px bg-gradient-to-r from-blue-100 via-gray-100 to-transparent" />
              <p className="max-w-2xl text-[15px] leading-7 text-gray-600 sm:text-base">
                {item.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqSection() {
  const ref = useScrollReveal();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="relative overflow-hidden bg-[#f7f9fc] py-24 sm:py-28" ref={ref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(63,76,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(122,211,84,0.08),transparent_24%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            FAQ
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-500">
            Clear answers for teams moving visual feedback, review, and approval into one place.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-4" data-reveal="left">
            {FAQ_ITEMS.map((item, index) => (
              <FaqItem
                key={item.question}
                item={item}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
              />
            ))}
          </div>

          <div data-reveal="right">
            <div className="sticky top-28 rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,0.06)]">
              <div className="inline-flex rounded-2xl bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Need more?
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold text-gray-900">
                Still have questions?
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-500">
                Markly is built for review workflows that need to feel fast, clear, and easy for both internal teams and external clients.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  'Client review links with controlled access',
                  'Live comments anchored to exact page locations',
                  'Cleaner handoff from feedback to delivery',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <p className="text-sm leading-6 text-gray-600">{point}</p>
                  </div>
                ))}
              </div>

              <a
                href="#pricing"
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#3f4cf6] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(63,76,246,0.24)] transition-transform hover:-translate-y-px"
              >
                View pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
