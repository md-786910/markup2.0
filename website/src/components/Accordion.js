import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from './icons';

// Question/answer list used by every FAQ on the site (one style everywhere).
// items: [{ question, answer }]; one item open at a time.
export default function Accordion({ items, idPrefix = 'faq', defaultOpen = 0, className = '' }) {
  const [openIndex, setOpenIndex] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white px-6 sm:px-8 ${className}`}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const id = `${idPrefix}-${index}`;
        return (
          <div key={item.question} className="border-b border-slate-200 last:border-b-0">
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
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
      })}
    </div>
  );
}
