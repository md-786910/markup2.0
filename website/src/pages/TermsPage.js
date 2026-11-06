import React, { useEffect } from 'react';
import { SiteLayout, Section, SectionHeader } from '../components/site';

const SECTIONS = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'description', title: '2. Description of Service' },
  { id: 'user-accounts', title: '3. User accounts' },
  { id: 'acceptable-use', title: '4. Acceptable use policy' },
  { id: 'intellectual-property', title: '5. Intellectual property' },
  { id: 'guest-review-links', title: '6. Guest review links' },
  { id: 'payment-terms', title: '7. Payment terms' },
  { id: 'free-trial', title: '8. Free trial & cancellation' },
  { id: 'termination', title: '9. Termination' },
  { id: 'disclaimers', title: '10. Disclaimers' },
  { id: 'limitation-of-liability', title: '11. Limitation of liability' },
  { id: 'indemnification', title: '12. Indemnification' },
  { id: 'governing-law', title: '13. Governing law & dispute resolution' },
  { id: 'changes', title: '14. Changes to these Terms' },
  { id: 'severability', title: '15. Severability' },
  { id: 'contact', title: '16. Contact us' },
];

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SiteLayout>
      <Section tone="light">
        <SectionHeader as="h1" title="Terms of service" lead="Last updated: October 20, 2026" />
        <div className="km-prose">
          <nav className="km-feat" aria-label="Table of contents" style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 4px' }}>Table of contents</h2>
            <ol className="list-decimal pl-6" style={{ margin: 0 }}>
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    {section.title.replace(/^\d+\.\s/, '')}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* 1. Acceptance of Terms */}
          <h2 id="acceptance">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Kommently ("the Service"), operated by Kommently ("we," "us," or "our") at{' '}
            <a href="https://kommently.app">kommently.app</a>{' '}
            and{' '}
            <a href="https://app.kommently.app">app.kommently.app</a>,
            you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
          </p>
          <p>
            "You" refers to the individual or entity accessing the Service. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
          </p>

          {/* 2. Description of Service */}
          <h2 id="description">2. Description of Service</h2>
          <p>
            Kommently is a visual comment and collaboration platform that enables teams to streamline their design review and approval process. The Service provides the following core capabilities:
          </p>
          <ul className="list-disc pl-6">
            <li>Pin-based visual comment on live websites, PDFs, and design files</li>
            <li>Real-time collaboration with team members and stakeholders</li>
            <li>Password-protected guest review links for external reviewers</li>
            <li>Device mode preview across desktop, tablet, and mobile viewports</li>
            <li>Integrations with third-party services including Slack, Discord, Microsoft Teams, and Jira</li>
            <li>Activity logging, version history, and project management tools</li>
          </ul>
          <p>
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We will make reasonable efforts to notify users of significant changes.
          </p>

          {/* 3. User Accounts */}
          <h2 id="user-accounts">3. User accounts</h2>
          <p>
            To access certain features of the Service, you must create an account. When creating and maintaining your account, you agree to the following:
          </p>
          <ul className="list-disc pl-6">
            <li>You must be at least 16 years of age to use the Service.</li>
            <li>You must provide accurate, current, and complete registration information.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>You must notify us immediately at{' '}
              <a href="mailto:hello@kommently.app">hello@kommently.app</a>{' '}
              if you suspect unauthorized access to your account.
            </li>
            <li>You may not create multiple accounts for the purpose of circumventing plan limitations.</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms or that have been inactive for an extended period, with prior notice where practicable.
          </p>

          {/* 4. Acceptable Use Policy */}
          <h2 id="acceptable-use">4. Acceptable use policy</h2>
          <p>
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not:
          </p>
          <ul className="list-disc pl-6">
            <li>Violate any applicable local, state, national, or international law or regulation.</li>
            <li>Infringe upon the intellectual property rights, privacy rights, or other rights of third parties.</li>
            <li>Upload, transmit, or distribute any malicious code, viruses, or harmful software.</li>
            <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or connected systems.</li>
            <li>Use the Service to send unsolicited communications, spam, or promotional materials.</li>
            <li>Interfere with or disrupt the integrity or performance of the Service or its infrastructure.</li>
            <li>Use automated tools, bots, or scripts to access the Service in a manner that exceeds reasonable usage or places undue burden on our systems.</li>
            <li>Harass, abuse, threaten, or intimidate other users of the Service.</li>
            <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity.</li>
            <li>Use the Service to develop a competing product or service.</li>
          </ul>
          <p>
            We reserve the right to investigate and take appropriate action against any violations, including suspending or terminating your access to the Service without prior notice.
          </p>

          {/* 5. Intellectual Property */}
          <h2 id="intellectual-property">5. Intellectual property</h2>

          <h3>5.1 Our intellectual property</h3>
          <p>
            The Service, including its original content, features, functionality, user interface, design, logos, and documentation, is and shall remain the exclusive property of Kommently and its licensors. The Service is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without our explicit written permission.
          </p>

          <h3>5.2 Your Content</h3>
          <p>
            You retain full ownership of all content you upload, create, or share through the Service, including comments, annotations, uploaded files, and project data ("Your Content"). By using the Service, you grant us a limited, non-exclusive, worldwide, royalty-free license to host, store, display, reproduce, and process Your Content solely for the purpose of providing and improving the Service. This license terminates when you delete Your Content or your account.
          </p>

          <h3>5.3 Comments about the Service</h3>
          <p>
            If you provide us with suggestions, ideas, or comment about the Service ("Service Comments"), you acknowledge that we may use such Service Comments without any obligation to compensate you. Service Comments is distinct from Your Content and is not subject to the content ownership provisions above.
          </p>

          {/* 6. Guest Review Links */}
          <h2 id="guest-review-links">6. Guest review links</h2>
          <p>
            The Service allows you to create password-protected guest review links that enable external collaborators to view project content and leave comments without creating a Kommently account. By using this feature, you acknowledge and agree that:
          </p>
          <ul className="list-disc pl-6">
            <li>You are solely responsible for determining who receives access to your guest review links and passwords.</li>
            <li>Project content shared through guest review links may be viewed and commented on by anyone with the link and password.</li>
            <li>You may revoke access to guest review links at any time through your project settings.</li>
            <li>Kommently is not responsible for any unauthorized sharing of guest review links or passwords by recipients.</li>
            <li>Guest reviewers are subject to our Acceptable Use Policy while using the Service.</li>
          </ul>

          {/* 7. Payment terms */}
          <h2 id="payment-terms">7. Payment terms</h2>

          <h3>7.1 Plans and pricing</h3>
          <p>
            Kommently offers the following subscription plans:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Free:</strong> $0, where offered — Includes a limited number of projects, team members and guests, and the core pin and comment tools.</li>
            <li><strong>Starter:</strong> $12/month — Includes expanded project, member and guest limits, guest review links, integrations (Slack, Jira, Discord, Microsoft Teams), activity log, and email support.</li>
            <li><strong>Pro:</strong> $29/month — Includes unlimited projects and members, higher guest limits, all integrations, version history, and priority support.</li>
            <li><strong>Enterprise:</strong> Custom pricing — Includes everything in Pro plus dedicated support and onboarding, on terms agreed with us in writing.</li>
          </ul>

          <h3>7.2 Billing</h3>
          <p>
            Paid plans are billed monthly in advance. Your first payment is made at checkout. Before each following monthly period we issue an invoice, which is payable within 10 days through our third-party payment processors (Razorpay or PayPal). We do not store your card details, and we do not charge you without your action. Applicable taxes are shown on your invoice.
          </p>

          <h3>7.3 Price changes</h3>
          <p>
            We reserve the right to modify our pricing at any time. We will provide at least 30 days' advance notice of any price increases. Price changes will take effect at the beginning of your next billing cycle following the notice period.
          </p>

          <h3>7.4 Refunds</h3>
          <p>
            Subscription fees are non-refundable except where required by applicable law. No refunds or credits will be issued for partial months of service. If you believe you have been charged in error, please contact us at{' '}
            <a href="mailto:hello@kommently.app">hello@kommently.app</a>{' '}
            within 14 days of the charge.
          </p>

          <h3>7.5 Failure to pay</h3>
          <p>
            If an invoice is not paid within 10 days, we send reminders during that period and then place your workspace in read-only mode: your team can still sign in and view projects, but cannot add new feedback or make changes. Your data is preserved, and full access is restored as soon as the invoice is paid. You may also move to the Free plan, where offered, instead of paying.
          </p>

          {/* 8. Free Trial & Cancellation */}
          <h2 id="free-trial">8. Free trial & cancellation</h2>
          <p>
            New workspaces start with a 30-day free trial that includes all Pro plan features. No payment method is required to start a trial, and you will not be charged automatically when it ends. We email the workspace owner before the trial ends. If you have not chosen a paid plan by then, the workspace is placed in read-only mode until you do; your data is preserved.
          </p>
          <p>
            You may cancel your paid subscription at any time through your account settings. Upon cancellation:
          </p>
          <ul className="list-disc pl-6">
            <li>You will retain access to paid features until the end of your current billing period.</li>
            <li>After the billing period ends, your account will be downgraded to the Free plan.</li>
            <li>Your data will be preserved, but features beyond the Free plan's limitations will no longer be accessible.</li>
            <li>You may upgrade again at any time to restore access to paid features.</li>
          </ul>

          {/* 9. Termination */}
          <h2 id="termination">9. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service, without prior notice or liability, for any reason, including but not limited to:
          </p>
          <ul className="list-disc pl-6">
            <li>Violation of these Terms or any applicable laws.</li>
            <li>Engaging in conduct that is harmful to other users, the Service, or third parties.</li>
            <li>Non-payment of fees owed under a paid plan.</li>
            <li>Upon your request to delete your account.</li>
          </ul>
          <p>
            You may delete your account at any time through your account settings or by contacting us at{' '}
            <a href="mailto:hello@kommently.app">hello@kommently.app</a>.
            Upon termination, your data will be deleted within 30 days, except where retention is required by law or for legitimate business purposes.
          </p>
          <p>
            The following provisions survive termination: Intellectual Property, Disclaimers, Limitation of Liability, Indemnification, and Governing Law.
          </p>

          {/* 10. Disclaimers */}
          <h2 id="disclaimers">10. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, KOMMENTLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6">
            <li>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</li>
            <li>WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE.</li>
            <li>WARRANTIES REGARDING THE ACCURACY OR RELIABILITY OF ANY INFORMATION OBTAINED THROUGH THE SERVICE.</li>
            <li>WARRANTIES THAT DEFECTS IN THE SERVICE WILL BE CORRECTED.</li>
          </ul>
          <p>
            You acknowledge that you use the Service at your own risk and discretion. No advice or information, whether oral or written, obtained from Kommently or through the Service shall create any warranty not expressly stated herein.
          </p>

          {/* 11. Limitation of Liability */}
          <h2 id="limitation-of-liability">11. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL KOMMENTLY, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6">
            <li>Loss of profits, revenue, data, or business opportunities.</li>
            <li>Cost of procurement of substitute services.</li>
            <li>Damages arising from unauthorized access to or alteration of your data.</li>
            <li>Any other intangible losses arising from your use of or inability to use the Service.</li>
          </ul>
          <p>
            IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO KOMMENTLY DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100 USD).
          </p>
          <p>
            These limitations apply regardless of the theory of liability, whether based on warranty, contract, statute, tort (including negligence), or otherwise, and even if Kommently has been advised of the possibility of such damages.
          </p>

          {/* 12. Indemnification */}
          <h2 id="indemnification">12. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Kommently and its officers, directors, employees, agents, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
          </p>
          <ul className="list-disc pl-6">
            <li>Your violation of these Terms.</li>
            <li>Your use of the Service, including any data or content you submit, post, or transmit through the Service.</li>
            <li>Your violation of any third-party rights, including intellectual property, privacy, or publicity rights.</li>
            <li>Any claim that Your Content caused damage to a third party.</li>
          </ul>

          {/* 13. Governing Law */}
          <h2 id="governing-law">13. Governing law & dispute resolution</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles. Any disputes arising from or relating to these Terms or the Service shall be resolved as follows:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Informal resolution:</strong> The parties shall first attempt to resolve any dispute through good-faith negotiation. You agree to contact us at{' '}
              <a href="mailto:hello@kommently.app">hello@kommently.app</a>{' '}
              before initiating any formal proceedings.
            </li>
            <li><strong>Formal resolution:</strong> If the dispute cannot be resolved informally within 30 days, either party may pursue resolution through binding arbitration or the courts of competent jurisdiction.</li>
            <li><strong>Class action waiver:</strong> You agree that any dispute resolution proceedings will be conducted on an individual basis and not in a class, consolidated, or representative action.</li>
          </ul>

          {/* 14. Changes */}
          <h2 id="changes">14. Changes to these Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time at our sole discretion. When we make material changes, we will provide notice by email to the address associated with your account or by posting a prominent notice within the Service at least 30 days before the changes take effect.
          </p>
          <p>
            Your continued use of the Service after the revised Terms take effect constitutes your acceptance of those changes. If you do not agree to the new Terms, you must stop using the Service and may delete your account.
          </p>

          {/* 15. Severability */}
          <h2 id="severability">15. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions of these Terms shall continue in full force and effect.
          </p>

          {/* 16. Contact Us */}
          <h2 id="contact">16. Contact us</h2>
          <p>
            If you have any questions or concerns about these Terms of Service, please contact us:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Email:</strong>{' '}
              <a href="mailto:hello@kommently.app">hello@kommently.app</a>
            </li>
            <li><strong>Website:</strong>{' '}
              <a href="https://kommently.app">kommently.app</a>
            </li>
          </ul>
          <p>
            We are committed to resolving any disputes or concerns promptly and fairly.
          </p>
        </div>
      </Section>
    </SiteLayout>
  );
}
