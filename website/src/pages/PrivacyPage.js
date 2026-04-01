import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ShieldIcon } from '../components/icons';

const SECTIONS = [
  { id: 'introduction', title: '1. Introduction' },
  { id: 'information-we-collect', title: '2. Information We Collect' },
  { id: 'how-we-use', title: '3. How We Use Your Information' },
  { id: 'information-sharing', title: '4. Information Sharing & Third-Party Services' },
  { id: 'data-retention', title: '5. Data Retention' },
  { id: 'data-security', title: '6. Data Security' },
  { id: 'your-rights', title: '7. Your Rights' },
  { id: 'childrens-privacy', title: '8. Children\'s Privacy' },
  { id: 'international-transfers', title: '9. International Data Transfers' },
  { id: 'changes', title: '10. Changes to This Privacy Policy' },
  { id: 'contact', title: '11. Contact Us' },
];

export default function PrivacyPage() {
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
              <ShieldIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              Privacy Policy
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

            {/* 1. Introduction */}
            <h2 id="introduction" className="font-display text-2xl font-bold text-gray-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Welcome to Feedbackly. Feedbackly ("we," "us," or "our") operates the website{' '}
              <a href="https://feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">feedbackly.online</a>{' '}
              and the application platform at{' '}
              <a href="https://app.feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">app.feedbackly.online</a>{' '}
              (collectively, the "Service").
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              This Privacy Policy describes how we collect, use, disclose, and protect your personal information when you access or use our Service. By using Feedbackly, you agree to the collection and use of information in accordance with this policy. If you do not agree with any part of this policy, please do not use our Service.
            </p>

            {/* 2. Information We Collect */}
            <h2 id="information-we-collect" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              2. Information We Collect
            </h2>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              2.1 Account Information
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you create an account, we collect information that you provide directly, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>Full name and display name</li>
              <li>Email address</li>
              <li>Password (stored in hashed form only)</li>
              <li>Profile photo (optional)</li>
              <li>Organization or company name (optional)</li>
            </ul>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              2.2 Project and Feedback Data
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you use our Service, we store the content you create and upload, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>Website URLs submitted for review</li>
              <li>Uploaded PDFs, images, and design files</li>
              <li>Feedback pins, comments, and annotations</li>
              <li>Project names, descriptions, and organizational data</li>
              <li>Collaboration activity such as mentions, replies, and status changes</li>
            </ul>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              2.3 Usage Data
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We automatically collect certain information when you access our Service, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li>IP address and approximate geographic location</li>
              <li>Browser type, version, and language preferences</li>
              <li>Device type, operating system, and screen resolution</li>
              <li>Pages visited, features used, and actions taken within the Service</li>
              <li>Date, time, and duration of your sessions</li>
              <li>Referring URL and how you arrived at our Service</li>
            </ul>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              2.4 Cookies and Tracking Technologies
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to operate and improve our Service. These include:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Essential cookies:</strong> Required for authentication, session management, and core functionality. These cannot be disabled.</li>
              <li><strong>Analytics cookies:</strong> Help us understand how users interact with our Service so we can improve the experience.</li>
              <li><strong>Preference cookies:</strong> Remember your settings and preferences across sessions.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not use third-party advertising cookies or sell data to advertisers. You can manage cookie preferences through your browser settings, though disabling essential cookies may impair Service functionality.
            </p>

            {/* 3. How We Use Your Information */}
            <h2 id="how-we-use" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Provide and maintain the Service:</strong> Deliver the core visual feedback and collaboration features you expect.</li>
              <li><strong>Authenticate and secure accounts:</strong> Verify your identity and protect against unauthorized access.</li>
              <li><strong>Enable collaboration:</strong> Facilitate real-time feedback, guest review sessions, and team communication.</li>
              <li><strong>Send transactional communications:</strong> Notify you of account activity, security alerts, feedback updates, and important Service changes.</li>
              <li><strong>Improve and develop the Service:</strong> Analyze usage patterns, diagnose technical issues, and develop new features.</li>
              <li><strong>Provide customer support:</strong> Respond to your inquiries, troubleshoot issues, and fulfill your requests.</li>
              <li><strong>Detect and prevent abuse:</strong> Identify and mitigate fraudulent activity, spam, and violations of our terms.</li>
              <li><strong>Comply with legal obligations:</strong> Fulfill our legal and regulatory requirements.</li>
            </ul>

            {/* 4. Information Sharing */}
            <h2 id="information-sharing" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              4. Information Sharing & Third-Party Services
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>We do not sell, rent, or trade your personal information to third parties.</strong> We may share your information only in the following circumstances:
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              4.1 Service Providers
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We work with trusted third-party service providers who assist us in operating the Service, including cloud hosting and infrastructure, email delivery services, payment processing, and analytics platforms. These providers are contractually obligated to protect your data and may only use it to perform services on our behalf.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              4.2 Third-Party Integrations
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you choose to connect third-party integrations such as Slack, Discord, or Jira, relevant feedback and project data will be transmitted to those platforms to enable the integration functionality. These third-party services are governed by their own privacy policies, and we encourage you to review them before connecting.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              4.3 Guest Review Links
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you create a guest review link, the associated project content becomes accessible to anyone who possesses the link and its password. You are responsible for managing who you share these links with. Guest reviewers may view content and leave feedback without creating a Feedbackly account.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              4.4 Legal Requirements
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend our rights or property, prevent fraud or abuse, protect the personal safety of users or the public, or comply with legal process.
            </p>

            {/* 5. Data Retention */}
            <h2 id="data-retention" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              5. Data Retention
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We retain your information for as long as necessary to provide the Service and fulfill the purposes described in this policy:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Account data:</strong> Retained for as long as your account remains active. Upon account deletion request, your personal data will be removed within 30 days.</li>
              <li><strong>Project and feedback data:</strong> Retained until you delete it or your account is terminated. You may delete individual projects and feedback at any time.</li>
              <li><strong>Usage logs:</strong> Retained for up to 12 months for analytics and security purposes, then automatically purged.</li>
              <li><strong>Backup data:</strong> May persist in encrypted backups for up to 90 days after deletion from the active system.</li>
            </ul>

            {/* 6. Data Security */}
            <h2 id="data-security" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              6. Data Security
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We take the security of your data seriously and implement industry-standard measures to protect it, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Encryption in transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS (Transport Layer Security).</li>
              <li><strong>Encryption at rest:</strong> Sensitive data stored on our servers is encrypted at rest.</li>
              <li><strong>Access controls:</strong> Strict role-based access controls limit who within our organization can access user data.</li>
              <li><strong>Password hashing:</strong> Passwords are hashed using industry-standard algorithms and are never stored in plain text.</li>
              <li><strong>Regular security reviews:</strong> We conduct periodic security assessments and infrastructure reviews.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to promptly addressing any security incidents.
            </p>

            {/* 7. Your Rights */}
            <h2 id="your-rights" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              7. Your Rights
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal data. We are committed to honoring these rights regardless of where you reside.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.1 Rights Under GDPR (European Economic Area)
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you are located in the European Economic Area (EEA), you have the following rights under the General Data Protection Regulation:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete personal data.</li>
              <li><strong>Right to erasure:</strong> Request deletion of your personal data under certain circumstances.</li>
              <li><strong>Right to restriction:</strong> Request that we restrict the processing of your personal data.</li>
              <li><strong>Right to data portability:</strong> Receive your personal data in a structured, commonly used, machine-readable format.</li>
              <li><strong>Right to object:</strong> Object to the processing of your personal data for certain purposes.</li>
              <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
              <li><strong>Right to lodge a complaint:</strong> File a complaint with your local supervisory authority.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our legal bases for processing your data include: performance of our contract with you, our legitimate interests in operating and improving the Service, compliance with legal obligations, and your consent where applicable.
            </p>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.2 Rights Under CCPA (California Residents)
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you are a California resident, the California Consumer Privacy Act provides you with the following rights:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4">
              <li><strong>Right to know:</strong> Request information about the categories and specific pieces of personal information we have collected about you.</li>
              <li><strong>Right to delete:</strong> Request deletion of your personal information, subject to certain exceptions.</li>
              <li><strong>Right to opt-out of sale:</strong> We do not sell your personal information. There is no need to opt out.</li>
              <li><strong>Right to non-discrimination:</strong> We will not discriminate against you for exercising any of your CCPA rights.</li>
            </ul>

            <h3 className="font-display text-lg font-semibold text-gray-900 mt-6 mb-2">
              7.3 Exercising Your Rights
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:hello@feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">hello@feedbackly.online</a>.
              We will respond to your request within 30 days. We may need to verify your identity before processing certain requests.
            </p>

            {/* 8. Children's Privacy */}
            <h2 id="childrens-privacy" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Feedbackly is not directed to individuals under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have inadvertently collected personal data from a child under 16, we will take steps to delete that information as promptly as possible. If you believe that a child under 16 has provided us with personal information, please contact us at{' '}
              <a href="mailto:hello@feedbackly.online" className="text-blue-600 hover:text-blue-700 underline">hello@feedbackly.online</a>.
            </p>

            {/* 9. International Data Transfers */}
            <h2 id="international-transfers" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from the laws of your jurisdiction. When we transfer your data internationally, we implement appropriate safeguards to ensure your information remains protected in accordance with this Privacy Policy and applicable data protection laws.
            </p>

            {/* 10. Changes */}
            <h2 id="changes" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              10. Changes to This Privacy Policy
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by email or by posting a prominent notice on our Service prior to the change becoming effective. The "Last updated" date at the top of this policy indicates when it was most recently revised.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Your continued use of the Service after any changes to this Privacy Policy constitutes your acceptance of those changes. We encourage you to review this policy periodically.
            </p>

            {/* 11. Contact Us */}
            <h2 id="contact" className="font-display text-2xl font-bold text-gray-900 mt-12 mb-4">
              11. Contact Us
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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
              We aim to respond to all legitimate inquiries within 30 days. If you feel that your concerns have not been adequately addressed, you may have the right to lodge a complaint with your local data protection authority.
            </p>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
