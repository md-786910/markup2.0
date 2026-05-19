import React from 'react';
import { HeartIcon } from './icons';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Comparison', href: '#comparison' },
    { label: 'FAQ', href: '#faq' },
  ],
  Resources: [
    { label: 'Get Started', href: `${APP_URL}/onboarding` },
    { label: 'Log In', href: `${APP_URL}/login` },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Contact', href: 'mailto:hello@feedbackly.online' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-[#0b1120] text-white">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#2854ff]/16 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
          <div className="max-w-sm">
            <a href="/" className="inline-flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2854ff] text-white shadow-[0_18px_38px_rgba(40,84,255,0.26)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 20 L9 4 L12 12 L15 4 L21 20" />
                </svg>
              </div>
              <span className="font-display text-xl font-semibold tracking-tight">Markly</span>
            </a>

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Visual review software for teams that want cleaner feedback, faster approvals, and less operational drag between design, delivery, and stakeholders.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">Review faster</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ship with contextual comments, share links, and real-time collaboration in one workspace.
              </p>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/90">{category}</h3>
              <ul className="mt-5 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-slate-400 transition-colors hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Markly. All rights reserved.</p>
          <p className="flex items-center gap-2">
            Crafted with <HeartIcon className="h-4 w-4 text-red-500" /> for faster review teams
          </p>
        </div>
      </div>
    </footer>
  );
}
