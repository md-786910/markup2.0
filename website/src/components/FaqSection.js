import React, { useEffect, useRef, useState } from 'react';
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
      className={`overflow-hidden rounded-[24px] border bg-white transition-all duration-300 ${isOpen
        ? 'border-blue-200 shadow-[0_14px_40px_rgba(67,82,255,0.08)]'
        : 'border-gray-200 hover:border-gray-300'
        }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left sm:px-5 sm:py-4"
      >
        <div className="min-w-0">
          <span className="mb-2 block text-[8px] font-semibold uppercase tracking-[0.18em] text-blue-600">
            FAQ {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[17px] leading-[1.7] font-bold font-sans text-[#0B1D3A] max-w-[65ch]">
            {item.question}
          </span>
        </div>

        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${isOpen
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
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="mb-4 h-px bg-gradient-to-r from-blue-100 via-gray-100 to-transparent" />
              <p className="text-[13px] sm:text-[14px] lg:text-[14.5px] xl:text-[15px] leading-[1.7] font-normal font-sans tracking-[0] text-[#475569] max-w-[65ch]">
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
  const rightColumnRef = useRef(null);
  const rightCardRef = useRef(null);
  const [openIndex, setOpenIndex] = useState(0);
  const [rightCardStyle, setRightCardStyle] = useState({});

  useEffect(() => {
    const navbarOffset = 80;
    const desktopBreakpoint = 1024;

    const updateRightCardPosition = () => {
      const section = ref.current;
      const rightColumn = rightColumnRef.current;
      const rightCard = rightCardRef.current;

      if (!section || !rightColumn || !rightCard || window.innerWidth < desktopBreakpoint) {
        setRightCardStyle({});
        return;
      }

      const scrollY = window.scrollY || window.pageYOffset;
      const sectionRect = section.getBoundingClientRect();
      const columnRect = rightColumn.getBoundingClientRect();
      const sectionBottom = sectionRect.bottom + scrollY;
      const columnTop = columnRect.top + scrollY;
      const cardHeight = rightCard.offsetHeight;
      const startStickAt = columnTop - navbarOffset;
      const stopStickAt = sectionBottom - cardHeight - navbarOffset - 56;

      if (scrollY < startStickAt) {
        setRightCardStyle({});
        return;
      }

      if (scrollY >= stopStickAt) {
        setRightCardStyle({
          position: 'absolute',
          top: `${sectionBottom - cardHeight - columnTop - 56}px`,
          right: 0,
          width: `${columnRect.width}px`,
        });
        return;
      }

      setRightCardStyle({
        position: 'fixed',
        top: `${navbarOffset}px`,
        left: `${columnRect.left}px`,
        width: `${columnRect.width}px`,
        zIndex: 20,
      });
    };

    updateRightCardPosition();
    window.addEventListener('scroll', updateRightCardPosition, { passive: true });
    window.addEventListener('resize', updateRightCardPosition);

    return () => {
      window.removeEventListener('scroll', updateRightCardPosition);
      window.removeEventListener('resize', updateRightCardPosition);
    };
  }, [ref]);

  return (
    <section id="faq" className="relative bg-[#f7f9fc] py-14 sm:py-14 px-10 sm:px-10" ref={ref}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(63,76,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(122,211,84,0.08),transparent_24%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-start" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#38BDF8] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Markly FAQ</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Frequently
            <span className="block text-gradient font-sans">asked questions</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#475569] font-sans">
            Clear answers for teams moving visual feedback, review, and approval into one place.
          </p>
        </div>
        {/* FAQ items */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {/* left side FAQ list */}
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
          {/* right side content */}
          <div ref={rightColumnRef} className="relative min-h-[320px] lg:self-start" data-reveal="right">
            <div
              ref={rightCardRef}
              style={rightCardStyle}
              className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,0.06)]"
            >
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
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#2854ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(40,84,255,0.24)] transition-transform hover:-translate-y-px"
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
