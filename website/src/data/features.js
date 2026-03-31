export const FEATURES = [
  {
    id: 'pins',
    title: 'Visual Feedback Pins',
    description: 'Click anywhere on any page to leave precise, contextual feedback. No more vague email descriptions or screenshot chaos.',
    gradient: 'from-blue-500 to-indigo-600',
    icon: 'pin',
  },
  {
    id: 'realtime',
    title: 'Real-time Collaboration',
    description: 'See who\'s online, get instant updates. No refresh needed. Live collaboration for your entire team.',
    gradient: 'from-purple-500 to-pink-600',
    icon: 'zap',
  },
  {
    id: 'guest',
    title: 'Guest Reviews',
    description: 'Share password-protected links with clients. They review and comment without creating an account.',
    gradient: 'from-emerald-500 to-teal-600',
    icon: 'share',
  },
  {
    id: 'pdf',
    title: 'PDF & Document Review',
    description: 'Upload PDFs and documents. Navigate multi-page files with inline comments on every page.',
    gradient: 'from-amber-500 to-orange-600',
    icon: 'fileText',
  },
  {
    id: 'device',
    title: 'Device Mode Preview',
    description: 'Test across desktop, tablet, and mobile viewports. Device-aware pins stay exactly where you put them.',
    gradient: 'from-cyan-500 to-blue-600',
    icon: 'monitor',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect Slack, Discord, and Jira. Get notified instantly. Auto-create issues from feedback pins.',
    gradient: 'from-rose-500 to-purple-600',
    icon: 'plug',
  },
];

export const SHOWCASE_FEATURES = [
  {
    id: 'precision',
    title: 'Pin feedback with surgical precision',
    description: 'No more guessing what your team is talking about. Every piece of feedback is anchored to the exact element on the page.',
    bullets: [
      'Click anywhere — websites or documents',
      'Pins persist across viewport sizes',
      'Auto-capture screenshots with every pin',
    ],
    visual: 'pins',
  },
  {
    id: 'collaborate',
    title: 'Collaborate in real-time, not in email threads',
    description: 'Your entire team sees feedback the moment it\'s posted. No more waiting for screenshots or meeting invites.',
    bullets: [
      'Threaded comments with @mentions',
      'Live presence — see who\'s viewing',
      'Rich text with file attachments',
    ],
    visual: 'comments',
  },
  {
    id: 'share',
    title: 'Share with clients, keep full control',
    description: 'Give clients a simple link to review and comment. Control exactly what they can see and do.',
    bullets: [
      'Password-protected review links',
      'Set expiration dates on shares',
      'Guest comments without signup',
    ],
    visual: 'sharing',
  },
];
