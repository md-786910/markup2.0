export const FEATURES = [
  {
    id: 'pins',
    title: 'Visual Feedback Pins',
    description: 'Click anywhere on a live page, PDF, or image to leave precise feedback with URL, viewport, and screenshot context attached.',
    gradient: 'from-[#2854ff] to-[#0f766e]',
    icon: 'pin',
  },
  {
    id: 'realtime',
    title: 'Real-time Collaboration',
    description: 'See presence, replies, status changes, and typing activity as they happen so review work keeps moving without refreshes.',
    gradient: 'from-[#7c3aed] to-[#db2777]',
    icon: 'zap',
  },
  {
    id: 'guest',
    title: 'Guest Reviews',
    description: 'Invite clients with password-protected links and expiration rules. They can comment without creating an account.',
    gradient: 'from-[#0f766e] to-[#16a34a]',
    icon: 'share',
  },
  {
    id: 'pdf',
    title: 'PDF & Document Review',
    description: 'Review multipage PDFs and creative files with the same anchored comment workflow your team uses on websites.',
    gradient: 'from-[#f59e0b] to-[#ea580c]',
    icon: 'fileText',
  },
  {
    id: 'device',
    title: 'Device Mode Preview',
    description: 'Switch between desktop, tablet, and mobile previews while device-aware pins stay exactly where they belong.',
    gradient: 'from-[#0891b2] to-[#2563eb]',
    icon: 'monitor',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect Slack, Discord, and Jira so approved feedback can become notifications, issues, and release work.',
    gradient: 'from-[#e11d48] to-[#7c3aed]',
    icon: 'plug',
  },
];

export const SHOWCASE_FEATURES = [
  {
    id: 'precision',
    title: 'Pin feedback with precise context',
    description: 'Every note is anchored to the element, page, and viewport your reviewer meant, so the next action is obvious.',
    bullets: [
      'Click anywhere on websites or documents',
      'Pins persist across viewport sizes',
      'Auto-capture screenshots with every pin',
    ],
    visual: 'pins',
  },
  {
    id: 'collaborate',
    title: 'Collaborate in real time, not in email threads',
    description: 'Teams see comments, replies, and status updates the moment they happen, without waiting for screenshots or meetings.',
    bullets: [
      'Threaded comments with mentions',
      'Live presence shows who is viewing',
      'Rich text with file attachments',
    ],
    visual: 'comments',
  },
  {
    id: 'share',
    title: 'Share with clients while staying in control',
    description: 'Give external stakeholders a simple link to review work while your team keeps access, expiry, and resolution controls.',
    bullets: [
      'Password-protected review links',
      'Set expiration dates on shares',
      'Guest comments without signup',
    ],
    visual: 'sharing',
  },
];
