// Quick answers in the Help & support panel. Same questions and answers as
// the website's Support page (website/src/pages/SupportPage.js HELP_ITEMS):
// change both together.
export const SUPPORT_FAQ = [
  {
    question: 'How do I invite a client to review?',
    answer: 'Open the project and click Share to create a review link. Clients open it, add their name and email once, and pin comments without an account. You can add a password and an expiry date, or make the link view-only. To share every project of a client at once, turn on the review link of their workspace in Settings → Workspaces.',
  },
  {
    question: 'How do I control who can see a project?',
    answer: 'Give each person Can manage, Can comment or Can view on a workspace, and it applies to every project in it. You can change it for a single project from its Members page. Owners and admins see everything, and guests can comment at most.',
  },
  {
    question: 'Which files can I review?',
    answer: 'Live websites (production, staging, or pages behind a login), and up to 10 PDFs or images per document project. Comments work the same way on all of them, on desktop, tablet and mobile sizes.',
  },
  {
    question: 'Why doesn\u2019t a website load in Kommently?',
    answer: 'Some sites use firewall or bot protection that blocks review tools. Kommently shows a message when that happens. You can still collect feedback by uploading screenshots or a PDF of the pages to a document project.',
  },
  {
    question: 'How do I connect Slack, Jira, Discord or Teams?',
    answer: 'Owners and admins can connect them from Integrations in the app, for the whole organization or one project, on the Starter plan and up. Slack, Discord and Teams use a channel webhook; Jira creates an issue for every new pin.',
  },
  {
    question: 'How do I change my plan or get an invoice?',
    answer: 'The organization owner can upgrade, downgrade or cancel in Settings → Billing, and find every invoice in Settings → Invoices. Cancelling keeps your plan until the end of the period you paid for.',
  },
];
