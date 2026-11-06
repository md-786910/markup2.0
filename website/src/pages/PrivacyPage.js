import React, { useEffect } from 'react';
import { SiteLayout, Section, SectionHeader } from '../components/site';

const SECTIONS = [
  { id: 'introduction', title: '1. Introduction' },
  { id: 'information-we-collect', title: '2. Information we collect' },
  { id: 'how-we-use', title: '3. How we use your information' },
  { id: 'information-sharing', title: '4. Information sharing & third-party services' },
  { id: 'data-retention', title: '5. Data retention' },
  { id: 'data-security', title: '6. Data security' },
  { id: 'your-rights', title: '7. Your rights' },
  { id: 'childrens-privacy', title: '8. Children\'s Privacy' },
  { id: 'international-transfers', title: '9. International data transfers' },
  { id: 'changes', title: '10. Changes to this Privacy Policy' },
  { id: 'contact', title: '11. Contact us' },
];

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <SiteLayout>
      <Section tone="light">
        <SectionHeader as="h1" title="Privacy policy" lead="Last updated: October 20, 2026" />
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

          {/* 1. Introduction */}
          <h2 id="introduction">1. Introduction</h2>
          <p>
            Welcome to Kommently. Kommently ("we," "us," or "our") operates the website{' '}
            <a href="https://kommently.app">kommently.app</a>{' '}
            and the application platform at{' '}
            <a href="https://app.kommently.app">app.kommently.app</a>{' '}
            (collectively, the "Service").
          </p>
          <p>
            This Privacy Policy describes how we collect, use, disclose, and protect your personal information when you access or use our Service. By using Kommently, you agree to the collection and use of information in accordance with this policy. If you do not agree with any part of this policy, please do not use our Service.
          </p>

          {/* 2. Information We Collect */}
          <h2 id="information-we-collect">2. Information we collect</h2>

          <h3>2.1 Account information</h3>
          <p>
            When you create an account, we collect information that you provide directly, including:
          </p>
          <ul className="list-disc pl-6">
            <li>Full name and display name</li>
            <li>Email address</li>
            <li>Password (stored in hashed form only)</li>
            <li>Profile photo (optional)</li>
            <li>Organization or company name (optional)</li>
          </ul>

          <h3>2.2 Project and comment data</h3>
          <p>
            When you use our Service, we store the content you create and upload, including:
          </p>
          <ul className="list-disc pl-6">
            <li>Website URLs submitted for review</li>
            <li>Uploaded PDFs, images, and design files</li>
            <li>Comment pins, comments, and annotations</li>
            <li>Project names, descriptions, and organizational data</li>
            <li>Collaboration activity such as mentions, replies, and status changes</li>
          </ul>

          <h3>2.3 Usage data</h3>
          <p>
            We automatically collect certain information when you access our Service, including:
          </p>
          <ul className="list-disc pl-6">
            <li>IP address and approximate geographic location</li>
            <li>Browser type, version, and language preferences</li>
            <li>Device type, operating system, and screen resolution</li>
            <li>Pages visited, features used, and actions taken within the Service</li>
            <li>Date, time, and duration of your sessions</li>
            <li>Referring URL and how you arrived at our Service</li>
          </ul>

          <h3>2.4 Cookies and tracking technologies</h3>
          <p>
            We use cookies and similar tracking technologies to operate and improve our Service. These include:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Essential cookies:</strong> Required for authentication, session management, and core functionality. These cannot be disabled.</li>
            <li><strong>Analytics cookies:</strong> Only on our marketing website, and only if you accept them in the cookie banner. The Kommently app itself uses essential cookies only.</li>
            <li><strong>Preference cookies:</strong> Remember your settings and preferences across sessions.</li>
          </ul>
          <p>
            We do not use third-party advertising cookies or sell data to advertisers. You can manage cookie preferences through your browser settings, though disabling essential cookies may impair Service functionality.
          </p>

          <h3>2.5 Technical diagnostic data (developer-ready reports)</h3>
          <p>
            When a reviewer drops a feedback pin on a project, Kommently automatically captures technical environment context (browser version, operating system, screen resolution, viewport, timezone, and recent console errors or failed network requests) to help developers reproduce defects. We never capture form input values, passwords, cookies, or authentication tokens. Project owners can configure or disable console error capture within project settings.
          </p>

          {/* 3. How We Use Your Information */}
          <h2 id="how-we-use">3. How we use your information</h2>
          <p>
            We use the information we collect for the following purposes:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Provide and maintain the Service:</strong> Deliver the core visual comment and collaboration features you expect.</li>
            <li><strong>Authenticate and secure accounts:</strong> Verify your identity and protect against unauthorized access.</li>
            <li><strong>Enable collaboration:</strong> Facilitate real-time comment, guest review sessions, and team communication.</li>
            <li><strong>Send transactional communications:</strong> Notify you of account activity, security alerts, comment updates, and important Service changes.</li>
            <li><strong>Improve and develop the Service:</strong> Analyze usage patterns, diagnose technical issues, and develop new features.</li>
            <li><strong>Provide customer support:</strong> Respond to your inquiries, troubleshoot issues, and fulfill your requests.</li>
            <li><strong>Detect and prevent abuse:</strong> Identify and mitigate fraudulent activity, spam, and violations of our terms.</li>
            <li><strong>Comply with legal obligations:</strong> Fulfill our legal and regulatory requirements.</li>
          </ul>

          {/* 4. Information Sharing */}
          <h2 id="information-sharing">4. Information sharing & third-party services</h2>
          <p>
            <strong>We do not sell, rent, or trade your personal information to third parties.</strong> We may share your information only in the following circumstances:
          </p>

          <h3>4.1 Service providers</h3>
          <p>
            We work with third-party service providers (sub-processors) who help us operate the Service: cloud hosting and infrastructure, email delivery, Cloudflare (used to load the live websites you add for review), Razorpay and PayPal (payment processing — we never see or store your full card details), Crisp (live chat, only when you open a chat), and error monitoring. These providers may only use your data to perform services on our behalf. A current list of sub-processors is available on request at the contact address below.
          </p>

          <h3>4.2 Third-party integrations</h3>
          <p>
            When you choose to connect third-party integrations such as Slack, Discord, Microsoft Teams, or Jira, relevant comment and project data will be transmitted to those platforms to enable the integration functionality. These third-party services are governed by their own privacy policies, and we encourage you to review them before connecting.
          </p>

          <h3>4.3 Guest review links</h3>
          <p>
            When you create a guest review link, the associated project content becomes accessible to anyone who possesses the link and its password. You are responsible for managing who you share these links with. Guest reviewers may view content and leave comment without creating a Kommently account.
          </p>

          <h3>4.4 Legal requirements</h3>
          <p>
            We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend our rights or property, prevent fraud or abuse, protect the personal safety of users or the public, or comply with legal process.
          </p>

          {/* 5. Data Retention */}
          <h2 id="data-retention">5. Data retention</h2>
          <p>
            We retain your information for as long as necessary to provide the Service and fulfill the purposes described in this policy:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Account data:</strong> Retained while your account is active. When you delete your account, your profile is removed immediately; comments you wrote in other people's projects remain, attributed to "Deleted user".</li>
            <li><strong>Workspace data:</strong> Projects, pins, comments and uploaded files are kept until you delete them. When a workspace owner deletes the workspace, all of its content and members are permanently deleted after a 7-day grace period.</li>
            <li><strong>Activity logs and notifications:</strong> Activity logs are deleted after 12 months and in-app notifications after 6 months.</li>
            <li><strong>Invoices:</strong> Kept for as long as tax law requires, even after a workspace is deleted.</li>
            <li><strong>Backup data:</strong> May persist in encrypted backups for up to 90 days after deletion from the active system.</li>
          </ul>

          {/* 6. Data Security */}
          <h2 id="data-security">6. Data security</h2>
          <p>
            We take the security of your data seriously and implement industry-standard measures to protect it, including:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Encryption in transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS (Transport Layer Security).</li>
            <li><strong>Encrypted backups:</strong> Database and file backups are encrypted (AES-256).</li>
            <li><strong>Access controls:</strong> Strict role-based access controls limit who within our organization can access user data.</li>
            <li><strong>Password hashing:</strong> Passwords are hashed using industry-standard algorithms and are never stored in plain text.</li>
            <li><strong>Regular security reviews:</strong> We conduct periodic security assessments and infrastructure reviews.</li>
          </ul>
          <p>
            While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to promptly addressing any security incidents.
          </p>

          {/* 7. Your Rights */}
          <h2 id="your-rights">7. Your rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal data. We are committed to honoring these rights regardless of where you reside.
          </p>

          <h3>7.1 Rights under GDPR (European Economic Area)</h3>
          <p>
            If you are located in the European Economic Area (EEA), you have the following rights under the General Data Protection Regulation:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete personal data.</li>
            <li><strong>Right to erasure:</strong> Request deletion of your personal data under certain circumstances.</li>
            <li><strong>Right to restriction:</strong> Request that we restrict the processing of your personal data.</li>
            <li><strong>Right to data portability:</strong> Receive your personal data in a structured, commonly used, machine-readable format.</li>
            <li><strong>Right to object:</strong> Object to the processing of your personal data for certain purposes.</li>
            <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
            <li><strong>Right to lodge a complaint:</strong> File a complaint with your local supervisory authority.</li>
          </ul>
          <p>
            You can exercise the rights of access and portability yourself: workspace owners and admins can export all workspace data from Settings → Workspace. Owners can delete the workspace there, and any user can delete their own account from their profile. For other requests, contact us.
          </p>
          <p>
            Our legal bases for processing your data include: performance of our contract with you, our legitimate interests in operating and improving the Service, compliance with legal obligations, and your consent where applicable.
          </p>

          <h3>7.2 Rights under CCPA (California residents)</h3>
          <p>
            If you are a California resident, the California Consumer Privacy Act provides you with the following rights:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Right to know:</strong> Request information about the categories and specific pieces of personal information we have collected about you.</li>
            <li><strong>Right to delete:</strong> Request deletion of your personal information, subject to certain exceptions.</li>
            <li><strong>Right to opt-out of sale:</strong> We do not sell your personal information. There is no need to opt out.</li>
            <li><strong>Right to non-discrimination:</strong> We will not discriminate against you for exercising any of your CCPA rights.</li>
          </ul>

          <h3>7.3 Exercising your rights</h3>
          <p>
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:hello@kommently.app">hello@kommently.app</a>.
            We will respond to your request within 30 days. We may need to verify your identity before processing certain requests.
          </p>

          {/* 8. Children's Privacy */}
          <h2 id="childrens-privacy">8. Children's privacy</h2>
          <p>
            Kommently is not directed to individuals under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that we have inadvertently collected personal data from a child under 16, we will take steps to delete that information as promptly as possible. If you believe that a child under 16 has provided us with personal information, please contact us at{' '}
            <a href="mailto:hello@kommently.app">hello@kommently.app</a>.
          </p>

          {/* 9. International Data Transfers */}
          <h2 id="international-transfers">9. International data transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from the laws of your jurisdiction. When we transfer your data internationally, we implement appropriate safeguards to ensure your information remains protected in accordance with this Privacy Policy and applicable data protection laws.
          </p>

          {/* 10. Changes */}
          <h2 id="changes">10. Changes to this Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by email or by posting a prominent notice on our Service prior to the change becoming effective. The "Last updated" date at the top of this policy indicates when it was most recently revised.
          </p>
          <p>
            Your continued use of the Service after any changes to this Privacy Policy constitutes your acceptance of those changes. We encourage you to review this policy periodically.
          </p>

          {/* 11. Contact Us */}
          <h2 id="contact">11. Contact us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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
            We aim to respond to all legitimate inquiries within 30 days. If you feel that your concerns have not been adequately addressed, you may have the right to lodge a complaint with your local data protection authority.
          </p>
        </div>
      </Section>
    </SiteLayout>
  );
}
