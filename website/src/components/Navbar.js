import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuIcon, XCloseIcon } from './icons';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#how-it-works' },
  { label: 'Comparison', href: '#comparison' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className={scrolled ? 'h-[104px]' : ''}>
        <div className="bg-[#111521] text-white">
          <div className="mx-auto flex h-10 max-w-[1600px] items-center justify-center gap-3 px-4 text-center text-[13px] font-medium">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#8fd14f] text-[11px] font-bold text-[#111521]">
              3
            </span>
            <span className="hidden text-white/80 sm:inline">New: realtime cursors, instant video notes, and controlled guest reviews.</span>
            <a href="#features" className="text-white underline-offset-4 hover:underline">
              See what changed
            </a>
          </div>
        </div>
        <header className={scrolled ? 'fixed inset-x-0 top-0 z-50' : 'relative z-50'}>
          <nav className={`border-b bg-white/90 backdrop-blur-xl transition-shadow ${scrolled ? 'border-slate-200 shadow-sm' : 'border-white/60'}`} aria-label="Main navigation">
            <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-10">
            <div className="flex min-w-0 flex-1 items-center">
              <Link to="/" className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#2854ff] text-white shadow-[0_10px_24px_rgba(40,84,255,0.26)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M7 16 L10 8 L12 12 L14 8 L17 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-[1.55rem] font-semibold tracking-tight text-[#1a1f2e]">Markly</span>
              </Link>
            </div>

            <div className="hidden flex-1 items-center justify-center gap-10 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[15px] font-medium text-[#5c6475] transition-colors hover:text-[#1a1f2e]"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden flex-1 items-center justify-end gap-6 md:flex">
              <a href={`${APP_URL}/login`} className="text-[15px] font-medium text-[#343b4d] transition-colors hover:text-[#111521]">
                Login
              </a>
              <a
                href={`${APP_URL}/onboarding`}
                className="inline-flex h-10 items-center rounded-full bg-[#2854ff] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(40,84,255,0.24)] transition-transform hover:-translate-y-px"
              >
                Sign up free
              </a>
            </div>

            <button
              type="button"
              className="rounded-md p-2 text-[#343b4d] md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <XCloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>

            {mobileOpen && (
            <div className="border-t border-gray-200 bg-white md:hidden">
              <div className="mx-auto flex max-w-[1600px] flex-col gap-1 px-4 py-4 sm:px-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-[#343b4d] transition-colors hover:bg-gray-50"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3">
                  <a
                    href={`${APP_URL}/login`}
                    className="rounded-full border border-gray-300 px-4 py-3 text-center text-sm font-medium text-[#343b4d]"
                  >
                    Login
                  </a>
                  <a
                    href={`${APP_URL}/onboarding`}
                    className="rounded-full bg-[#2854ff] px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Sign up free
                  </a>
                </div>
              </div>
            </div>
            )}
          </nav>
        </header>
      </div>
    </>
  );
}
