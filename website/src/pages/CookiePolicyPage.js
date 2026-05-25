import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { LockIcon } from '../components/icons';

const SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'types', title: 'Types of Cookies We Use' },
  { id: 'lawful-basis', title: 'Consent and Lawful Basis' },
  { id: 'manage', title: 'How to Manage Preferences' },
  { id: 'retention', title: 'Retention and Storage' },
  { id: 'updates', title: 'Updates to This Policy' },
  { id: 'contact', title: 'Contact Us' },
];

export default function CookiePolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />

      <main>
        <section className="page-hero">
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#176b57] text-white shadow-[0_16px_34px_rgba(23,107,87,0.24)]">
              <LockIcon className="h-7 w-7" />
            </div>
            <h1 className="section-heading">
              Cookie Policy
            </h1>
            <p className="body-large mt-4">
              Last updated: May 19, 2026
            </p>
          </div>
        </section>

        <section className="section-pad-tight">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <nav className="premium-card mb-12 p-6 sm:p-8">
              <h2 className="mb-4 font-display text-lg font-semibold text-[#10231f]">Table of Contents</h2>
              <ol className="list-decimal list-inside space-y-2">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-[#176b57] underline hover:text-[#0f5f4c]">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <h2 id="overview" className="mb-4 font-display text-2xl font-bold text-[#10231f]">
              1. Overview
            </h2>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              This Cookie Policy explains how Markly uses cookies and similar technologies on our landing pages and product surfaces. Cookies help us keep the site secure, remember your consent settings, improve usability, and understand how visitors interact with the experience.
            </p>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              Essential cookies are required for the website to function. Optional cookies are only used where you have given permission through our cookie banner or preferences panel.
            </p>

            <h2 id="types" className="mb-4 mt-12 font-display text-2xl font-bold text-[#10231f]">
              2. Types of Cookies We Use
            </h2>

            <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-[#10231f]">
              2.1 Essential Cookies
            </h3>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              These cookies support core functions such as page navigation, security protections, and remembering your cookie consent choice. They cannot be turned off in our system because the site depends on them to operate correctly.
            </p>

            <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-[#10231f]">
              2.2 Analytics Cookies
            </h3>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              Analytics cookies help us understand page traffic, content engagement, conversion behavior, and performance bottlenecks. We use this information to improve the landing experience and prioritize product communication more effectively.
            </p>

            <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-[#10231f]">
              2.3 Preference Cookies
            </h3>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              Preference cookies remember optional settings such as UI choices or non-essential interface behavior that makes the site easier to use across sessions.
            </p>

            <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-[#10231f]">
              2.4 Marketing Cookies
            </h3>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              Marketing cookies are used only where permitted to understand campaign effectiveness, attribution, and related landing-page performance. They are optional and can be rejected without affecting core website functionality.
            </p>

            <h2 id="lawful-basis" className="mb-4 mt-12 font-display text-2xl font-bold text-[#10231f]">
              3. Consent and Lawful Basis
            </h2>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              For visitors in jurisdictions that require consent, including under GDPR-style rules, we request permission before enabling any non-essential cookies. Your preferences are stored locally in your browser so we can remember your selection.
            </p>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              Essential cookies are processed on the basis of legitimate operation and security of the service. Optional cookies are processed only after consent.
            </p>

            <h2 id="manage" className="mb-4 mt-12 font-display text-2xl font-bold text-[#10231f]">
              4. How to Manage Preferences
            </h2>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              You can accept all optional cookies, reject optional cookies, or customize your settings through the cookie banner and preferences modal on the site.
            </p>
            <ul className="mb-4 ml-4 list-disc list-inside space-y-2 text-[#53645f]">
              <li>Use the cookie banner on first visit to make an initial choice.</li>
              <li>Reopen preferences using the floating cookie preferences button available after a decision is saved.</li>
              <li>Clear browser storage if you want to remove saved local consent data manually.</li>
            </ul>

            <h2 id="retention" className="mb-4 mt-12 font-display text-2xl font-bold text-[#10231f]">
              5. Retention and Storage
            </h2>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              Consent preferences are stored locally in your browser using localStorage so the site can remember your cookie settings between visits. This stored consent record includes your selected preferences, a status value, and the time the decision was saved.
            </p>

            <h2 id="updates" className="mb-4 mt-12 font-display text-2xl font-bold text-[#10231f]">
              6. Updates to This Policy
            </h2>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              We may update this Cookie Policy to reflect legal, product, or operational changes. When we make significant changes, we will update the revision date and may refresh the consent request where required.
            </p>

            <h2 id="contact" className="mb-4 mt-12 font-display text-2xl font-bold text-[#10231f]">
              7. Contact Us
            </h2>
            <p className="mb-4 leading-relaxed text-[#53645f]">
              If you have questions about this Cookie Policy or how consent is handled, contact us at{' '}
              <a href="#" className="text-[#176b57] underline hover:text-[#0f5f4c]">
                hello@markly.online
              </a>.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


