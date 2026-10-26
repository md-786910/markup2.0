import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon, XCloseIcon } from './icons';

const NAV_LINKS = [
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
];

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

// Each page renders its own Navbar, so the active pill's last position is kept
// here: the next page's Navbar starts the pill there and slides it over.
let lastPill = null;

const isActive = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const linksRef = useRef(null);
  const [pill, setPill] = useState(lastPill);
  const [animate, setAnimate] = useState(false);

  // Measure the active link and slide the pill to it
  useLayoutEffect(() => {
    const measure = () => {
      const el = linksRef.current?.querySelector('[data-active="true"]');
      return el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
    };
    const target = measure();
    if (lastPill && target) {
      // Start where the previous page's pill was, then animate on the next frame
      setPill(lastPill);
      setAnimate(false);
      const id = requestAnimationFrame(() => {
        setAnimate(true);
        setPill(target);
      });
      lastPill = target;
      return () => cancelAnimationFrame(id);
    }
    setAnimate(false);
    setPill(target);
    lastPill = target;
    return undefined;
  }, [pathname]);

  // Keep the pill aligned when fonts load or the window resizes
  useEffect(() => {
    const realign = () => {
      const el = linksRef.current?.querySelector('[data-active="true"]');
      const next = el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
      setAnimate(false);
      setPill(next);
      lastPill = next;
    };
    window.addEventListener('resize', realign);
    document.fonts?.ready?.then(realign).catch(() => {});
    return () => window.removeEventListener('resize', realign);
  }, []);

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
              <span className="sm:hidden">Workspaces: one place per client.</span>
              <span className="hidden sm:inline">Workspaces: one place and one review link for every client.</span>
            </span>
            <a href="/#workspaces" className="flex-none font-semibold text-[#dbe5ff] underline-offset-4 hover:underline">
              Learn more
            </a>
          </div>
        </div>
        <header className={scrolled ? 'fixed inset-x-0 top-0 z-50' : 'relative z-50'}>
          <nav className={`border-b bg-[#ffffff]/90 backdrop-blur-xl transition-all duration-300 ${scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent'}`} aria-label="Main navigation">
            <div className="site-container flex h-16 items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center">
                <Link to="/" className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#003dff] text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M7 16 L10 8 L12 12 L14 8 L17 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="font-display text-[1.45rem] font-semibold tracking-tight text-[#0f172a]">Kommently</span>
                </Link>
              </div>

              <div ref={linksRef} className="relative hidden flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/70 p-1 md:flex">
                {/* Active page indicator */}
                <span
                  aria-hidden="true"
                  className={`absolute top-1 bottom-1 rounded-full bg-[#eef3ff] ${animate ? 'transition-all duration-300 ease-out' : ''} ${pill ? 'opacity-100' : 'opacity-0'}`}
                  style={pill ? { left: pill.left, width: pill.width } : { left: 0, width: 0 }}
                />
                {NAV_LINKS.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      data-active={active}
                      aria-current={active ? 'page' : undefined}
                      className={`relative rounded-full px-4 py-2 text-[14px] font-semibold transition-colors duration-300 ${
                        active ? 'text-[#003dff]' : 'text-slate-600 hover:text-[#0f172a]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="hidden flex-1 items-center justify-end gap-6 md:flex">
                <a href={`${APP_URL}/login`} className="text-[15px] font-medium text-[#475569] transition-colors hover:text-[#0f172a]">
                  Login
                </a>
                <a
                  href={`${APP_URL}/onboarding`}
                  className="inline-flex h-10 items-center rounded-full bg-[#003dff] px-5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px hover:bg-[#0031d1]"
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
                  {NAV_LINKS.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <Link
                        key={link.label}
                        to={link.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                          active ? 'bg-[#eef3ff] text-[#003dff]' : 'text-[#475569] hover:bg-[#f8fafc]'
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
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

