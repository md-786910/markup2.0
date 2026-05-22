export const FEATURES = [
  {
    id: 'pins',
    title: 'Visual Comments Pins',
    description: 'Click anywhere on a live page, PDF, or image to leave precise comments with URL, viewport, and screenshot context attached.',
    gradient: '#0ea5e9',
    icon: 'pin',
    color: '#0ea5e9',
  },
  {
    id: 'realtime',
    title: 'Real-time Collaboration',
    description: 'See presence, replies, status changes, and typing activity as they happen so review work keeps moving without refreshes.',
    gradient: '#ef4444',
    icon: 'zap',
    color: '#ef4444',
  },
  {
    id: 'guest',
    title: 'Guest Reviews',
    description: 'Invite clients with password-protected links and expiration rules. They can comment without creating an account.',
    gradient: '#22c55e',
    icon: 'share',
    color: '#22c55e',
  },
  {
    id: 'pdf',
    title: 'PDF & Document Review',
    description: 'Review multipage PDFs and creative files with the same anchored comment workflow your team uses on websites.',
    gradient: '#f59e0b',
    icon: 'fileText',
    color: '#f59e0b',
  },
  {
    id: 'device',
    title: 'Device Mode Preview',
    description: 'Switch between desktop, tablet, and mobile previews while device-aware pins stay exactly where they belong.',
    gradient: '#8b5cf6',
    icon: 'monitor',
    color: '#8b5cf6',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect Slack, Discord, and Jira so approved comments can become notifications, issues, and release work.',
    gradient: 'from-[#e11d48] to-[#7c3aed]',
    icon: 'plug',
    color: '#ef4444',
  },
];

export const SHOWCASE_FEATURES = [
  {
    id: 'precision',
    title: 'Pin comments with precise context',
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
