import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import BrandMark from './BrandMark';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon, XCloseIcon } from './icons';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
];

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

// Each page renders its own Navbar, so the active pill's last position is kept
// here: the next page's Navbar starts the pill there and slides it over.
let lastPill = null;

const isActive = (pathname, href) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const linksRef = useRef(null);
  // Starts where the previous page's pill was (painted first, then slid over)
  const [pill, setPill] = useState(lastPill);
  const [animate, setAnimate] = useState(!!lastPill);

  // Measure the active link and slide the pill to it
  useLayoutEffect(() => {
    const el = linksRef.current?.querySelector('[data-active="true"]');
    const target = el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
    const from = lastPill;
    lastPill = target;
    if (!from || !target) {
      setAnimate(false);
      setPill(target);
      return undefined;
    }
    // Two frames: let the start position paint, then move (CSS transition)
    let id2;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setAnimate(true);
        setPill(target);
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
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
    // Only on a cold load (fonts still loading); otherwise it would cut the slide short
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(realign).catch(() => {});
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
                  <BrandMark className="h-8 w-8" />
                  <span className="font-display text-[1.25rem] font-semibold tracking-tight text-[#0f172a]">Kommently</span>
                </Link>
              </div>

              <div ref={linksRef} className="relative hidden items-center gap-0.5 rounded-full border border-slate-200/80 bg-white/80 p-0.5 md:flex">
                {/* Active page indicator */}
                <span
                  aria-hidden="true"
                  className={`absolute top-0.5 bottom-0.5 rounded-full bg-[#eef3ff] ${animate ? 'transition-all duration-300 ease-out' : 'transition-opacity duration-200'} ${pill ? 'opacity-100' : 'opacity-0'}`}
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
                      className={`relative rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-300 ${
                        active ? 'text-[#003dff]' : 'text-slate-600 hover:text-[#0f172a]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="hidden flex-1 items-center justify-end gap-5 md:flex">
                <a href={`${APP_URL}/login`} className="text-[13.5px] font-medium text-[#475569] transition-colors hover:text-[#0f172a]">
                  Login
                </a>
                <a
                  href={`${APP_URL}/onboarding`}
                  className="inline-flex h-9 items-center rounded-full bg-[#003dff] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0031d1]"
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

