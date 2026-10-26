import React from 'react';
import BrandMark from './BrandMark';
import { openCookieSettings } from './CookieConsentManager';

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Use cases', href: '/use-cases' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Integrations', href: '/#integrations' },
    { label: 'FAQ', href: '/#faq' },
  ],
  Resources: [
    { label: 'About', href: '/about' },
    { label: 'Support', href: '/support' },
    { label: 'Get Started', href: `${APP_URL}/onboarding` },
    { label: 'Log In', href: `${APP_URL}/login` },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Contact', href: 'mailto:hello@kommently.app' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="site-container py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:gap-12">
          <div className="max-w-sm">
            <a href="/" className="inline-flex items-center gap-3">
              <BrandMark className="h-9 w-9" />
              <span className="font-display text-xl font-semibold tracking-tight">Kommently</span>
            </a>
            <p className="mt-5 text-sm leading-7 text-slate-400">
              Pin feedback on live websites, PDFs, and images. Review with your team and your clients in one place.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{category}</h3>
              <ul className="mt-5 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-slate-400 transition-colors hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
                {category === 'Legal' ? (
                  <li>
                    <button type="button" onClick={openCookieSettings} className="text-sm text-slate-400 transition-colors hover:text-white">
                      Cookie settings
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Kommently. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
