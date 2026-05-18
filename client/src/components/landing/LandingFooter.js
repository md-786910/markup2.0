import React from 'react';
import { Link } from 'react-router-dom';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
};

export default function LandingFooter() {
  const scrollTo = (href) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-gray-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/5">

          {/* Brand col */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <span className="text-base font-bold text-white tracking-tight">Feedbackly</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Visual feedback tools for modern teams. Pin comments directly on live web pages.
            </p>
          </div>

          {/* Link cols */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{group}</p>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l.label}>
                    {l.href.startsWith('#') ? (
                      <button
                        onClick={() => scrollTo(l.href)}
                        className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {l.label}
                      </button>
                    ) : (
                      <a href={l.href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Feedbackly. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <Link
              to="/onboarding"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
