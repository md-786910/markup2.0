import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FileTextIcon } from '../components/icons';

const SECTIONS = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'description', title: '2. Description of Service' },
  { id: 'user-accounts', title: '3. User Accounts' },
  { id: 'acceptable-use', title: '4. Acceptable Use Policy' },
  { id: 'intellectual-property', title: '5. Intellectual Property' },
  { id: 'guest-review-links', title: '6. Guest Review Links' },
  { id: 'payment-terms', title: '7. Payment Terms' },
  { id: 'free-trial', title: '8. Free Trial & Cancellation' },
  { id: 'termination', title: '9. Termination' },
  { id: 'disclaimers', title: '10. Disclaimers' },
  { id: 'limitation-of-liability', title: '11. Limitation of Liability' },
  { id: 'indemnification', title: '12. Indemnification' },
  { id: 'governing-law', title: '13. Governing Law & Dispute Resolution' },
  { id: 'changes', title: '14. Changes to These Terms' },
  { id: 'severability', title: '15. Severability' },
  { id: 'contact', title: '16. Contact Us' },
];

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      <main>
        {/* Hero Banner */}
        <section className="relative bg-gray-950 overflow-hidden pt-32 pb-16">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/[0.08] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/[0.08] rounded-full blur-[100px]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg shadow-blue-500/25">
              <FileTextIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              Terms of Service
            </h1>
            <p className="text-gray-400 mt-4 text-lg">
              Last updated: April 1, 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Table of Contents */}
            <nav className="bg-gray-50 rounded-2xl border border-gray-200 p-6 sm:p-8 mb-12">
              <h2 className="font-display text-lg font-semibold text-gray-900 mb-4">Table of Contents</h2>
              <ol className="list-decimal list-inside space-y-2">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      {section.title.replace(/^\d+\.\s/, '')}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* 1. Acceptance of Terms */}
            <h2 id="acceptance" className="font-display text-2xl font-bold text-gray-900 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              By accessing or using Feedbackly ("the Service"), operated by Feedbackly ("we," "us," or "our") at{' '}
              <a href="https://feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">feedbackly.online</a>{' '}
              and{' '}
              <a href="https://app.feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">app.feedbackly.online</a>,
              you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              "You" refers to the individual or entity accessing the Service. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
            </p>

            {/* 2. Description of Service */}
            <h2 id="description" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Feedbackly is a visual feedback and collaboration platform that enables teams to streamline their design review and approval process. The Service provides the following core capabilities:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>Pin-based visual feedback on live websites, PDFs, and design files</li>
              <li>Real-time collaboration with team members and stakeholders</li>
              <li>Password-protected guest review links for external reviewers</li>
              <li>Device mode preview across desktop, tablet, and mobile viewports</li>
              <li>Integrations with third-party services including Slack, Discord, and Jira</li>
              <li>Activity logging, version history, and project management tools</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We will make reasonable efforts to notify users of significant changes.
            </p>

            {/* 3. User Accounts */}
            <h2 id="user-accounts" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              3. User Accounts
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              To access certain features of the Service, you must create an account. When creating and maintaining your account, you agree to the following:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>You must be at least 16 years of age to use the Service.</li>
              <li>You must provide accurate, current, and complete registration information.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately at{' '}
                <a href="mailto:hello@feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">hello@feedbackly.online</a>{' '}
                if you suspect unauthorized access to your account.
              </li>
              <li>You may not create multiple accounts for the purpose of circumventing plan limitations.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to suspend or terminate accounts that violate these Terms or that have been inactive for an extended period, with prior notice where practicable.
            </p>

            {/* 4. Acceptable Use Policy */}
            <h2 id="acceptable-use" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              4. Acceptable Use Policy
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
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
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to investigate and take appropriate action against any violations, including suspending or terminating your access to the Service without prior notice.
            </p>

            {/* 5. Intellectual Property */}
            <h2 id="intellectual-property" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              5. Intellectual Property
            </h2>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              5.1 Our Intellectual Property
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              The Service, including its original content, features, functionality, user interface, design, logos, and documentation, is and shall remain the exclusive property of Feedbackly and its licensors. The Service is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without our explicit written permission.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              5.2 Your Content
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              You retain full ownership of all content you upload, create, or share through the Service, including feedback comments, annotations, uploaded files, and project data ("Your Content"). By using the Service, you grant us a limited, non-exclusive, worldwide, royalty-free license to host, store, display, reproduce, and process Your Content solely for the purpose of providing and improving the Service. This license terminates when you delete Your Content or your account.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              5.3 Feedback About the Service
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you provide us with suggestions, ideas, or feedback about the Service ("Service Feedback"), you acknowledge that we may use such Service Feedback without any obligation to compensate you. Service Feedback is distinct from Your Content and is not subject to the content ownership provisions above.
            </p>

            {/* 6. Guest Review Links */}
            <h2 id="guest-review-links" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              6. Guest Review Links
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              The Service allows you to create password-protected guest review links that enable external collaborators to view project content and leave feedback without creating a Feedbackly account. By using this feature, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>You are solely responsible for determining who receives access to your guest review links and passwords.</li>
              <li>Project content shared through guest review links may be viewed and commented on by anyone with the link and password.</li>
              <li>You may revoke access to guest review links at any time through your project settings.</li>
              <li>Feedbackly is not responsible for any unauthorized sharing of guest review links or passwords by recipients.</li>
              <li>Guest reviewers are subject to our Acceptable Use Policy while using the Service.</li>
            </ul>

            {/* 7. Payment Terms */}
            <h2 id="payment-terms" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              7. Payment Terms
            </h2>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.1 Plans and Pricing
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Feedbackly offers the following subscription plans:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Free:</strong> $0 — Includes limited projects, team members, and basic feedback tools at no cost, forever.</li>
              <li><strong>Starter:</strong> $12/month — Includes expanded project limits, guest review links, Slack integration, activity log, and email support.</li>
              <li><strong>Pro:</strong> $29/month — Includes unlimited projects and members, priority support, all integrations (Slack, Discord, Jira), version history, and advanced sharing.</li>
              <li><strong>Enterprise:</strong> Custom pricing — Includes everything in Pro plus dedicated support, custom integrations, SLA guarantee, SSO, and custom onboarding.</li>
            </ul>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.2 Billing
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Paid plans are billed on a monthly recurring basis. Payments are processed through a secure third-party payment processor. You authorize us to charge your designated payment method on each billing date. You are responsible for keeping your payment information current.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.3 Price Changes
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to modify our pricing at any time. We will provide at least 30 days' advance notice of any price increases. Price changes will take effect at the beginning of your next billing cycle following the notice period.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.4 Refunds
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Subscription fees are non-refundable except where required by applicable law. No refunds or credits will be issued for partial months of service. If you believe you have been charged in error, please contact us at{' '}
              <a href="mailto:hello@feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">hello@feedbackly.online</a>{' '}
              within 14 days of the charge.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.5 Failure to Pay
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              If payment fails or is not received, we may downgrade your account to the Free plan after a reasonable grace period and notification. You will retain access to your data, but features exclusive to paid plans will become unavailable.
            </p>

            {/* 8. Free Trial & Cancellation */}
            <h2 id="free-trial" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              8. Free Trial & Cancellation
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Paid plans may include a free trial period. During the trial, you will have access to all features of the selected plan. At the end of the trial period, your payment method will be charged automatically unless you cancel before the trial expires.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              You may cancel your paid subscription at any time through your account settings. Upon cancellation:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>You will retain access to paid features until the end of your current billing period.</li>
              <li>After the billing period ends, your account will be downgraded to the Free plan.</li>
              <li>Your data will be preserved, but features beyond the Free plan's limitations will no longer be accessible.</li>
              <li>You may upgrade again at any time to restore access to paid features.</li>
            </ul>

            {/* 9. Termination */}
            <h2 id="termination" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              9. Termination
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may suspend or terminate your access to the Service, without prior notice or liability, for any reason, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>Violation of these Terms or any applicable laws.</li>
              <li>Engaging in conduct that is harmful to other users, the Service, or third parties.</li>
              <li>Non-payment of fees owed under a paid plan.</li>
              <li>Upon your request to delete your account.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              You may delete your account at any time through your account settings or by contacting us at{' '}
              <a href="mailto:hello@feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">hello@feedbackly.online</a>.
              Upon termination, your data will be deleted within 30 days, except where retention is required by law or for legitimate business purposes.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              The following provisions survive termination: Intellectual Property, Disclaimers, Limitation of Liability, Indemnification, and Governing Law.
            </p>

            {/* 10. Disclaimers */}
            <h2 id="disclaimers" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              10. Disclaimers
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, FEEDBACKLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</li>
              <li>WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE.</li>
              <li>WARRANTIES REGARDING THE ACCURACY OR RELIABILITY OF ANY INFORMATION OBTAINED THROUGH THE SERVICE.</li>
              <li>WARRANTIES THAT DEFECTS IN THE SERVICE WILL BE CORRECTED.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              You acknowledge that you use the Service at your own risk and discretion. No advice or information, whether oral or written, obtained from Feedbackly or through the Service shall create any warranty not expressly stated herein.
            </p>

            {/* 11. Limitation of Liability */}
            <h2 id="limitation-of-liability" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              11. Limitation of Liability
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FEEDBACKLY, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>Loss of profits, revenue, data, or business opportunities.</li>
              <li>Cost of procurement of substitute services.</li>
              <li>Damages arising from unauthorized access to or alteration of your data.</li>
              <li>Any other intangible losses arising from your use of or inability to use the Service.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO FEEDBACKLY DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100 USD).
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              These limitations apply regardless of the theory of liability, whether based on warranty, contract, statute, tort (including negligence), or otherwise, and even if Feedbackly has been advised of the possibility of such damages.
            </p>

            {/* 12. Indemnification */}
            <h2 id="indemnification" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              12. Indemnification
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You agree to defend, indemnify, and hold harmless Feedbackly and its officers, directors, employees, agents, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>Your violation of these Terms.</li>
              <li>Your use of the Service, including any data or content you submit, post, or transmit through the Service.</li>
              <li>Your violation of any third-party rights, including intellectual property, privacy, or publicity rights.</li>
              <li>Any claim that Your Content caused damage to a third party.</li>
            </ul>

            {/* 13. Governing Law */}
            <h2 id="governing-law" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              13. Governing Law & Dispute Resolution
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles. Any disputes arising from or relating to these Terms or the Service shall be resolved as follows:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Informal resolution:</strong> The parties shall first attempt to resolve any dispute through good-faith negotiation. You agree to contact us at{' '}
                <a href="mailto:hello@feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">hello@feedbackly.online</a>{' '}
                before initiating any formal proceedings.
              </li>
              <li><strong>Formal resolution:</strong> If the dispute cannot be resolved informally within 30 days, either party may pursue resolution through binding arbitration or the courts of competent jurisdiction.</li>
              <li><strong>Class action waiver:</strong> You agree that any dispute resolution proceedings will be conducted on an individual basis and not in a class, consolidated, or representative action.</li>
            </ul>

            {/* 14. Changes */}
            <h2 id="changes" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              14. Changes to These Terms
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to modify or replace these Terms at any time at our sole discretion. When we make material changes, we will provide notice by email to the address associated with your account or by posting a prominent notice within the Service at least 30 days before the changes take effect.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Your continued use of the Service after the revised Terms take effect constitutes your acceptance of those changes. If you do not agree to the new Terms, you must stop using the Service and may delete your account.
            </p>

            {/* 15. Severability */}
            <h2 id="severability" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              15. Severability
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions of these Terms shall continue in full force and effect.
            </p>

            {/* 16. Contact Us */}
            <h2 id="contact" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              16. Contact Us
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have any questions or concerns about these Terms of Service, please contact us:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Email:</strong>{' '}
                <a href="mailto:hello@feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">hello@feedbackly.online</a>
              </li>
              <li><strong>Website:</strong>{' '}
                <a href="https://feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">feedbackly.online</a>
              </li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              We are committed to resolving any disputes or concerns promptly and fairly.
            </p>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
