import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, MessageCircle } from 'lucide-react';

const faqs = [
  {
    question: "Do I need to install anything to use Markup?",
    answer: "No! Markup works directly in your browser. Just paste your website URL in the dashboard, and you can start annotating immediately. Our advanced relay handles all the heavy lifting behind the scenes."
  },
  {
    question: "Can I invite clients without them creating accounts?",
    answer: "Yes, absolutely. You can share a public guest link with your clients or stakeholders. They can drop pins and leave comments instantly without having to sign up or remember another password."
  },
  {
    question: "Does it work on password-protected or local sites?",
    answer: "Yes! Markup works on local environments (localhost), staging sites, and password-protected pages. If you can see it in your browser, Markup can annotate it."
  },
  {
    question: "How many projects can I manage?",
    answer: "Our Explorer plan includes 3 active projects. Growth and Scale plans offer significantly more, with the Scale plan providing unlimited projects for your entire organization."
  },
  {
    question: "Is my data secure?",
    answer: "Security is our top priority. We use bank-grade 256-bit SSL encryption for all data transfers and perform daily backups. We never store your website's source code, only the annotation data."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-24 lg:py-32 bg-[#fafafa] relative overflow-hidden noise">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[11px] font-black uppercase tracking-widest mb-6"
          >
            Support
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-5xl font-black text-gray-900 tracking-tight mb-8"
          >
            Got <span className="text-gray-400">questions?</span> <br />We've got answers.
          </motion.h2>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <FAQItem 
              key={i} 
              faq={faq} 
              isOpen={openIndex === i} 
              toggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>

        {/* Contact Footer */}
        <motion.div 
          className="mt-16 p-8 rounded-[32px] bg-gray-900 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-gray-950/10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-7 h-7 text-brand-400" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">Still have questions?</p>
              <p className="text-sm text-white/60 font-medium">Our support team is here to help you 24/7.</p>
            </div>
          </div>
          <button className="px-7 py-3.5 rounded-xl bg-white text-gray-900 font-black text-sm transition-all hover:bg-brand-500 hover:text-white active:scale-95 whitespace-nowrap">
            Chat with us
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function FAQItem({ faq, isOpen, toggle }) {
  return (
    <motion.div 
      initial={false}
      className={`rounded-[24px] border transition-all duration-500 ${
        isOpen 
          ? 'bg-white border-brand-100 shadow-[0_32px_64px_-12px_rgba(99,102,241,0.08)]' 
          : 'bg-white/50 border-gray-100 hover:border-gray-200'
      }`}
    >
      <button
        onClick={toggle}
        className="w-full text-left px-7 py-6 flex items-center justify-between gap-6 group"
      >
        <span className={`text-lg font-bold tracking-tight transition-colors ${
          isOpen ? 'text-brand-600' : 'text-gray-900'
        }`}>
          {faq.question}
        </span>
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 ${
          isOpen ? 'bg-brand-600 text-white rotate-180 shadow-lg shadow-brand-500/20' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
        }`}>
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-7 pb-6 text-base text-gray-500 leading-relaxed font-medium">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
