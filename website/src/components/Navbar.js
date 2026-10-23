import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuIcon, XCloseIcon } from './icons';

const NAV_LINKS = [
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/support' },
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
        <div className="bg-[#0f172a] text-white">
          <div className="site-container flex h-10 items-center justify-center gap-3 text-center text-[13px] font-medium">
            <span className="rounded-full bg-[#003dff] px-2 py-0.5 text-[11px] font-semibold">New</span>
            <span className="truncate text-white/80">
              <span className="sm:hidden">Clients can pin comments on review links.</span>
              <span className="hidden sm:inline">Clients can now pin comments directly on shared review links.</span>
            </span>
            <a href="/#clients" className="flex-none font-semibold text-[#dbe5ff] underline-offset-4 hover:underline">
              Learn more
            </a>
          </div>
        </div>
        <header className={scrolled ? 'fixed inset-x-0 top-0 z-50' : 'relative z-50'}>
          <nav className={`border-b bg-[#ffffff]/90 backdrop-blur-xl transition-all duration-300 ${scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent'}`} aria-label="Main navigation">
            <div className="site-container flex h-16 items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center">
                <Link to="/" className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#003dff] text-white shadow-[0_10px_24px_rgba(0,61,255,0.24)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M7 16 L10 8 L12 12 L14 8 L17 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="font-display text-[1.45rem] font-semibold tracking-tight text-[#0f172a]">Kommently</span>
                </Link>
              </div>

              <div className="hidden flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/70 p-1 md:flex">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="rounded-full px-4 py-2 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="hidden flex-1 items-center justify-end gap-6 md:flex">
                <a href={`${APP_URL}/login`} className="text-[15px] font-medium text-[#475569] transition-colors hover:text-[#0f172a]">
                  Login
                </a>
                <a
                  href={`${APP_URL}/onboarding`}
                  className="inline-flex h-10 items-center rounded-full bg-[#003dff] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(0,61,255,0.24)] transition-transform hover:-translate-y-px hover:bg-[#0031d1]"
                >
                  Sign up free
                </a>
              </div>

              <button
                type="button"
                className="rounded-md p-2 text-[#475569] md:hidden"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? <XCloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
            </div>

            {mobileOpen && (
              <div className="border-t border-slate-200 bg-[#ffffff] md:hidden">
                <div className="site-container flex flex-col gap-1 py-4">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-3 text-sm font-medium text-[#475569] transition-colors hover:bg-[#f8fafc]"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3">
                    <a
                      href={`${APP_URL}/login`}
                      className="rounded-full border border-slate-300 px-4 py-3 text-center text-sm font-medium text-[#475569]"
                    >
                      Login
                    </a>
                    <a
                      href={`${APP_URL}/onboarding`}
                      className="rounded-full bg-[#003dff] px-4 py-3 text-center text-sm font-semibold text-white"
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

