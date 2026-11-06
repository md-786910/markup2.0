import React, { useEffect } from 'react';
import { SiteLayout, Section, SectionHeader } from '../components/site';

const SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'types', title: 'Types of cookies we use' },
  { id: 'lawful-basis', title: 'Consent and lawful basis' },
  { id: 'manage', title: 'How to manage preferences' },
  { id: 'retention', title: 'Retention and storage' },
  { id: 'updates', title: 'Updates to this policy' },
  { id: 'contact', title: 'Contact us' },
];

export default function CookiePolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SiteLayout>
      <Section tone="light">
        <SectionHeader as="h1" title="Cookie policy" lead="Last updated: May 19, 2026" />
        <div className="km-prose">
          <nav className="km-feat" aria-label="Table of contents" style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 4px' }}>Table of contents</h2>
            <ol className="list-decimal pl-6" style={{ margin: 0 }}>
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <h2 id="overview">1. Overview</h2>
          <p>
            This Cookie Policy explains how Kommently uses cookies and similar technologies on our landing pages and product surfaces. Cookies help us keep the site secure, remember your consent settings, improve usability, and understand how visitors interact with the experience.
          </p>
          <p>
            Essential cookies are required for the website to function. Optional cookies are only used where you have given permission through our cookie banner or preferences panel.
          </p>

          <h2 id="types">2. Types of cookies we use</h2>

          <h3>2.1 Essential cookies</h3>
          <p>
            These cookies support core functions such as page navigation, security protections, and remembering your cookie consent choice. They cannot be turned off in our system because the site depends on them to operate correctly.
          </p>

          <h3>2.2 Analytics cookies</h3>
          <p>
            Analytics cookies help us understand page traffic, content engagement, conversion behavior, and performance bottlenecks. We use this information to improve the landing experience and prioritize product communication more effectively.
          </p>

          <h3>2.3 Preference cookies</h3>
          <p>
            Preference cookies remember optional settings such as UI choices or non-essential interface behavior that makes the site easier to use across sessions.
          </p>

          <h3>2.4 Marketing cookies</h3>
          <p>
            Marketing cookies are used only where permitted to understand campaign effectiveness, attribution, and related landing-page performance. They are optional and can be rejected without affecting core website functionality.
          </p>

          <h3>2.5 Live chat cookies</h3>
          <p>
            Our live chat is provided by Crisp. It loads only when you choose to open a chat, and then sets cookies that keep your conversation available across pages and visits. If you never open the chat, no chat cookies are set.
          </p>

          <h2 id="lawful-basis">3. Consent and lawful basis</h2>
          <p>
            For visitors in jurisdictions that require consent, including under GDPR-style rules, we request permission before enabling any non-essential cookies. Your preferences are stored locally in your browser so we can remember your selection.
          </p>
          <p>
            Essential cookies are processed on the basis of legitimate operation and security of the service. Optional cookies are processed only after consent.
          </p>

          <h2 id="manage">4. How to manage preferences</h2>
          <p>
            You can accept all optional cookies, reject optional cookies, or customize your settings through the cookie banner and preferences modal on the site.
          </p>
          <ul className="list-disc pl-6">
            <li>Use the cookie banner on first visit to make an initial choice.</li>
            <li>Reopen preferences using the floating cookie preferences button available after a decision is saved.</li>
            <li>Clear browser storage if you want to remove saved local consent data manually.</li>
          </ul>

          <h2 id="retention">5. Retention and storage</h2>
          <p>
            Consent preferences are stored locally in your browser using localStorage so the site can remember your cookie settings between visits. This stored consent record includes your selected preferences, a status value, and the time the decision was saved.
          </p>

          <h2 id="updates">6. Updates to this policy</h2>
          <p>
            We may update this Cookie Policy to reflect legal, product, or operational changes. When we make significant changes, we will update the revision date and may refresh the consent request where required.
          </p>

          <h2 id="contact">7. Contact us</h2>
          <p>
            If you have questions about this Cookie Policy or how consent is handled, contact us at{' '}
            <a href="mailto:hello@kommently.app">
              hello@kommently.app
            </a>.
          </p>
        </div>
      </Section>
    </SiteLayout>
  );
}
