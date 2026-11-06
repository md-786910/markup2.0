// Kommently design system for the marketing site, ported from
// kommently-design-system/source/components/bundle.js (marketing section) to
// React with react-router links. Styles: src/styles/kommently-site.css.
// Rules (source/marketing.md): one h1 per page, one primary button per
// section ("Start free trial"), alternate light / muted sections, a dark
// CTABand just above the footer, real facts only.
import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { openCookieSettings } from '../CookieConsentManager';
import { ICON_PATHS } from './iconPaths';

export const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
export const TRIAL = { label: 'Start free trial', href: `${APP_URL}/onboarding` };
export const LOGIN_HREF = `${APP_URL}/login`;

export const PRODUCT_LINKS = [
  { label: 'Website review', href: '/website-review', icon: 'globe' },
  { label: 'Document review', href: '/document-review', icon: 'doc' },
  { label: 'Approvals', href: '/approvals', icon: 'okc' },
  { label: 'Integrations', href: '/integrations', icon: 'link' },
  { label: 'Teams and clients', href: '/teams', icon: 'team' },
];
// The site's own pages, after the Product menu
export const NAV_LINKS = [
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
];

const cx = (...a) => a.filter(Boolean).join(' ');
const isInternal = (href) => typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

// A link that uses the router for site pages and a plain <a> otherwise
export function SmartLink({ href, children, ...rest }) {
  if (isInternal(href) && !href.includes('#')) return <Link to={href} {...rest}>{children}</Link>;
  return <a href={href} {...rest}>{children}</a>;
}

// ── Base components ─────────────────────────────────────────────────────────
export function Icon({ name, size = 18, stroke, className, style }) {
  const d = [].concat(ICON_PATHS[name] || []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke || (name === 'dots' ? 3 : 1.6)} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      {d.map((x, i) => <path key={i} d={x} />)}
    </svg>
  );
}

export function Logo({ size = 28, wordmark = false, onDark = false }) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 64 64" role={wordmark ? undefined : 'img'} aria-label={wordmark ? undefined : 'Kommently'} aria-hidden={wordmark ? 'true' : undefined}>
      <rect width="64" height="64" rx="15" fill="var(--brand-600)" />
      <path d="M18.5 16v33M18.5 36.5L39 19M25.1 31L39 49" stroke="var(--white)" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="40.5" cy="17.5" r="7.6" fill="var(--white)" />
      <circle cx="40.5" cy="17.5" r="3" fill="var(--brand-600)" />
    </svg>
  );
  if (!wordmark) return mark;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, font: '700 15.5px/20px var(--font-display)', letterSpacing: '-.03em', color: onDark ? 'var(--on-brand)' : 'var(--text)' }}>
      {mark}Kommently
    </span>
  );
}

const STATUS = { review: 'In review', approved: 'Approved', changes: 'Changes requested' };
export function Badge({ status, tone, children }) {
  return <span className={cx('kc-st', tone || status || 'neutral')}><i />{children || STATUS[status]}</span>;
}

export function Tile({ name, tone = 'blue', size = 28 }) {
  return (
    <span className={cx('kc-tile', tone)} style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }} aria-hidden="true">
      {String(name || '?')[0]}
    </span>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────────
export function Container({ children, className = '', narrow }) {
  return <div className={cx('km-wrap', narrow && 'narrow', className)}>{children}</div>;
}

export function Section({ id, tone = 'light', children, className = '' }) {
  return (
    <section id={id} className={cx('km-sec', tone, className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, lead, align = 'center', as: H = 'h2' }) {
  return (
    <div className={cx('km-sh', align)}>
      {eyebrow ? <div className="km-eyebrow">{eyebrow}</div> : null}
      <H className="km-h2">{title}</H>
      {lead ? <p className="km-lead">{lead}</p> : null}
    </div>
  );
}

export function CTA({ href = '#', variant = 'primary', size = 'lg', icon, children, className }) {
  const cls = { primary: 'pri', secondary: 'sec', ghost: 'ghost' }[variant];
  return (
    <SmartLink href={href} className={cx('kc-btn', cls, size, className)}>
      {children}
      {icon ? <Icon name={icon} size={16} stroke={2} /> : null}
    </SmartLink>
  );
}

export function PinNumber({ n, resolved, size = 28 }) {
  return (
    <span className={cx('km-pinnum', resolved && 'ok')} style={{ width: size, height: size }}>
      {resolved ? <Icon name="check" size={Math.round(size * 0.55)} stroke={3} /> : n}
    </span>
  );
}

// A real screenshot of the app in the design system's product frame
export function Shot({ src, alt, url, eager = false }) {
  return (
    <figure className="km-mock" style={{ margin: 0 }}>
      <div className="km-bar-top">
        <span className="km-dots" aria-hidden="true"><i /><i /><i /></span>
        {url ? <span className="km-url">{url}</span> : null}
      </div>
      <img src={src} alt={alt} width="1440" height="900" loading={eager ? 'eager' : 'lazy'} decoding="async" style={{ display: 'block', width: '100%', height: 'auto' }} />
    </figure>
  );
}

// ── Sections ────────────────────────────────────────────────────────────────
export function Hero({ eyebrow, title, lead, primary, secondary, note, visual }) {
  return (
    <section className="km-hero">
      <Container className="km-hero-in">
        <div className="km-hero-t">
          {eyebrow ? <div className="km-eyebrow">{eyebrow}</div> : null}
          <h1 className="km-h1">{title}</h1>
          <p className="km-lead">{lead}</p>
          <div className="km-actions">
            {primary ? <CTA href={primary.href} icon={primary.icon}>{primary.label}</CTA> : null}
            {secondary ? <CTA href={secondary.href} variant="secondary">{secondary.label}</CTA> : null}
          </div>
          {note ? <p className="km-note">{note}</p> : null}
        </div>
        <div className="km-hero-v">{visual}</div>
      </Container>
    </section>
  );
}

export function CTABand({ title, text, primary = TRIAL, secondary }) {
  return (
    <section className="km-sec dark km-cta">
      <Container narrow>
        <h2 className="km-h2">{title}</h2>
        {text ? <p className="km-lead">{text}</p> : null}
        <div className="km-actions center">
          {primary ? <CTA href={primary.href}>{primary.label}</CTA> : null}
          {secondary ? <SmartLink className="kc-btn lg km-on-dark" href={secondary.href}>{secondary.label}</SmartLink> : null}
        </div>
      </Container>
    </section>
  );
}

// items: { icon, title, text }
export function FeatureGrid({ id, eyebrow, title, lead, items, cols = 3, tone = 'light', children }) {
  return (
    <Section id={id} tone={tone}>
      {title ? <SectionHeader eyebrow={eyebrow} title={title} lead={lead} /> : null}
      <div className={`km-grid c${cols}`}>
        {items.map((f) => (
          <article key={f.title} className="km-feat">
            <span className="km-ico"><Icon name={f.icon} size={20} /></span>
            <h3 className="km-h3">{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </div>
      {children}
    </Section>
  );
}

export function FeatureSplit({ id, eyebrow, title, text, points = [], visual, reverse, tone = 'light' }) {
  return (
    <Section id={id} tone={tone}>
      <div className={cx('km-split', reverse && 'rev')}>
        <div className="km-split-t">
          {eyebrow ? <div className="km-eyebrow">{eyebrow}</div> : null}
          <h2 className="km-h2 sm">{title}</h2>
          <p className="km-lead">{text}</p>
          {points.length ? (
            <ul className="km-points">
              {points.map((p) => <li key={p}><Icon name="check" size={16} stroke={2.4} />{p}</li>)}
            </ul>
          ) : null}
        </div>
        <div className="km-split-v">{visual}</div>
      </div>
    </Section>
  );
}

// Numbers are comment pins, the product's own motif
export function StepList({ id, eyebrow, title, lead, steps, tone = 'muted' }) {
  return (
    <Section id={id} tone={tone}>
      <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
      <ol className={`km-steps c${steps.length}`}>
        {steps.map((s, i) => (
          <li key={s.title}>
            <PinNumber n={i + 1} size={36} />
            <h3 className="km-h3">{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// The three review states, joined by arrows
export function StatusFlow({ eyebrow, title, lead, states, tone = 'light' }) {
  return (
    <Section tone={tone}>
      <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
      <div className="km-grid c3">
        {states.map((s, i) => (
          <article key={s.status} className="km-feat km-state">
            <Badge status={s.status} />
            <h3 className="km-h3">{s.title}</h3>
            <p>{s.text}</p>
            {i < states.length - 1 ? <span className="km-arrow" aria-hidden="true"><Icon name="arrow" size={18} /></span> : null}
          </article>
        ))}
      </div>
    </Section>
  );
}

// Providers as Tile initials, never imitating their logos
export function IntegrationGrid({ id, eyebrow, title, lead, items, tone = 'muted' }) {
  return (
    <Section id={id} tone={tone}>
      <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
      <div className="km-grid c4">
        {items.map((p) => (
          <article key={p.name} className="km-feat km-prov">
            <Tile name={p.name} tone={p.tone} size={40} />
            <h3 className="km-h3">{p.name}</h3>
            <p>{p.text}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

// plans: { name, tagline, features, cta: {label, href}, price?, period?, badge?, featured? }
export function PricingCards({ plans }) {
  return (
    <div className={`km-plans c${Math.min(plans.length, 3)}${plans.length >= 4 ? ' c4' : ''}`}>
      {plans.map((p) => (
        <article key={p.name} className={cx('km-plan', p.featured && 'featured')}>
          {p.badge ? <span className="km-plan-badge">{p.badge}</span> : null}
          <h3 className="km-h3">{p.name}</h3>
          {p.price ? (
            <div className="km-price">
              {p.price}
              {p.period ? <span className="km-price-period">{p.period}</span> : null}
            </div>
          ) : null}
          <p className="km-plan-tag">{p.tagline}</p>
          <ul className="km-points">
            {p.features.map((f) => <li key={f}><Icon name="check" size={16} stroke={2.4} />{f}</li>)}
          </ul>
          <CTA href={p.cta.href} variant={p.featured ? 'primary' : 'secondary'}>{p.cta.label}</CTA>
        </article>
      ))}
    </div>
  );
}

// items: { q, a }. One answer open at a time.
export function FAQ({ id, title = 'Questions', lead, items, tone = 'muted', children }) {
  const [open, setOpen] = useState(0);
  const base = useId();
  return (
    <Section id={id} tone={tone}>
      <SectionHeader title={title} lead={lead} />
      <div className="km-faq">
        {items.map((q, i) => (
          <div key={q.q} className={cx('km-q', open === i && 'on')}>
            <h3>
              <button type="button" aria-expanded={open === i} aria-controls={`${base}-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                {q.q}
                <Icon name={open === i ? 'x' : 'plus'} size={18} />
              </button>
            </h3>
            {open === i ? <p id={`${base}-${i}`}>{q.a}</p> : null}
          </div>
        ))}
      </div>
      {children}
    </Section>
  );
}

// ── Nav and footer ──────────────────────────────────────────────────────────
function useCloseOn(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}

// Sticky 64px header: logo, Product menu, the site's pages, Log in, Start free trial
export function SiteNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const menuRef = useRef(null);
  const close = React.useCallback(() => setMenu(false), []);
  useCloseOn(menuRef, menu, close);
  useEffect(() => { setMenu(false); setMobile(false); }, [pathname]);
  useEffect(() => {
    if (!mobile) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMobile(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobile]);

  const productCurrent = PRODUCT_LINKS.find((l) => pathname === l.href);
  const isOn = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="km-nav">
        <Container className="km-nav-in">
          <Link to="/" className="km-brand" aria-label="Kommently home"><Logo size={28} wordmark /></Link>
          <nav className="km-links" aria-label="Main">
            <span className="km-pop-anchor" ref={menuRef}>
              <button type="button" className={cx('km-link', productCurrent && 'on')} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                Product <Icon name="down" size={14} />
              </button>
              {menu ? (
                <div className="km-dd">
                  <div className="kc-menu" role="menu" aria-label="Product">
                    {PRODUCT_LINKS.map((l) => (
                      <button key={l.href} type="button" role="menuitem" className={cx('mi', productCurrent === l && 'on')} onClick={() => { setMenu(false); navigate(l.href); }}>
                        <Icon name={l.icon} size={16} />
                        <span>{l.label}</span>
                        {productCurrent === l ? <span className="ck"><Icon name="check" size={15} stroke={2} /></span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </span>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className={cx('km-link', isOn(l.href) && 'on')} aria-current={isOn(l.href) ? 'page' : undefined}>{l.label}</Link>
            ))}
          </nav>
          <span className="sp" />
          <a className="km-link km-hide-sm" href={LOGIN_HREF}>Log in</a>
          <span className="km-hide-sm"><CTA href={TRIAL.href} size="">{TRIAL.label}</CTA></span>
          <button type="button" className="kc-icb km-show-sm" aria-label={mobile ? 'Close menu' : 'Open menu'} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>
            <Icon name={mobile ? 'x' : 'menu'} />
          </button>
        </Container>
        {mobile ? (
          <div className="km-mobile">
            {PRODUCT_LINKS.map((l) => <Link key={l.href} to={l.href} className={cx('km-link', isOn(l.href) && 'on')}>{l.label}</Link>)}
            {NAV_LINKS.map((l) => <Link key={l.href} to={l.href} className={cx('km-link', isOn(l.href) && 'on')}>{l.label}</Link>)}
            <a href={LOGIN_HREF} className="km-link">Log in</a>
            <CTA href={TRIAL.href}>{TRIAL.label}</CTA>
          </div>
        ) : null}
      </header>
    </>
  );
}

// Logo and promise, Product, Company and Account columns; legal links in the bottom row
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="km-foot">
      <Container>
        <div className="km-foot-g c4">
          <div>
            <Logo size={28} wordmark />
            <p>Point at the page. Say what to change.</p>
          </div>
          <nav aria-label="Product">
            <h4>Product</h4>
            {PRODUCT_LINKS.map((l) => <Link key={l.href} to={l.href}>{l.label}</Link>)}
            <Link to="/pricing">Pricing</Link>
          </nav>
          <nav aria-label="Company">
            <h4>Company</h4>
            <Link to="/use-cases">Use cases</Link>
            <Link to="/about">About</Link>
            <Link to="/support">Support</Link>
            <a href="mailto:hello@kommently.app">Contact</a>
          </nav>
          <nav aria-label="Account">
            <h4>Account</h4>
            <a href={LOGIN_HREF}>Log in</a>
            <a href={TRIAL.href}>{TRIAL.label}</a>
          </nav>
        </div>
        <div className="km-foot-b">
          <span>&copy; {year} Kommently</span>
          <nav className="km-foot-legal" aria-label="Legal">
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/cookie-policy">Cookie policy</Link>
            <Link to="/terms">Terms of service</Link>
            <button type="button" onClick={openCookieSettings}>Cookie settings</button>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

// Every marketing page: SiteNav, the page in <main>, SiteFooter
export function SiteLayout({ children }) {
  return (
    <div className="kc km">
      <SiteNav />
      <main id="main-content">{children}</main>
      <SiteFooter />
    </div>
  );
}

// ── Product illustration (design system ProductMock) ────────────────────────
// Redraws the app's own UI: `web` (browser frame, pins, an open comment),
// `doc` (a document page with pins and a comment list), `status` (three
// projects with their review badges). Sample content only, never customer data.
function Bars({ w = [100], h = 8, gap = 8, tone = 'var(--slate-200)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {w.map((x, i) => <i key={i} className="km-bar" style={{ width: `${x}%`, height: h, background: tone }} />)}
    </div>
  );
}

function MockAvatar({ name, tone }) {
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  return <span className={cx('kc-av', tone)} title={name}>{initials}</span>;
}

function Pop({ style, name = 'Dana Lee', tone = 'green', when = '12 min ago', text, pin = 4 }) {
  return (
    <div className="km-pop" style={style}>
      <div className="km-pop-h">
        <PinNumber n={pin} size={22} />
        <MockAvatar name={name} tone={tone} />
        <div><b>{name}</b><small>{when}</small></div>
      </div>
      <p>{text}</p>
      <div className="km-pop-f">
        <span className="kc-link">Reply</span>
        <span className="kc-btn sec sm"><Icon name="check" size={14} stroke={2} />Resolve</span>
      </div>
    </div>
  );
}

export function ProductMock({ kind = 'web', url = 'acme.com/pricing', comment }) {
  if (kind === 'status') {
    const rows = [
      ['review', 'acme.com redesign', '12 open · 18 resolved'],
      ['changes', 'Pricing page v3', '5 open · 9 resolved'],
      ['approved', 'Brand guidelines.pdf', '0 open · 14 resolved'],
    ];
    return (
      <div className="km-mock status" role="img" aria-label="Three projects with their review status">
        {rows.map(([s, n, c], i) => (
          <div key={n} className="km-statrow" style={{ marginLeft: i * 18 }}>
            <Icon name={n.endsWith('.pdf') ? 'doc' : 'globe'} size={18} />
            <div><b>{n}</b><small>{c}</small></div>
            <Badge status={s} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'doc') {
    return (
      <div className="km-mock" role="img" aria-label="A document with comment pins and a list of comments">
        <div className="km-bar-top">
          <Icon name="doc" size={14} /><span>Brand guidelines.pdf</span><span className="sp" /><Badge status="review" />
        </div>
        <div className="km-doc">
          <div className="km-page">
            <Bars w={[46]} h={12} tone="var(--slate-400)" />
            <div style={{ height: 14 }} />
            <Bars w={[100, 94, 98, 62]} />
            <div className="km-hl">
              <Bars w={[100, 88]} tone="var(--brand-100)" />
              <span className="km-pin-abs" style={{ right: -13, top: -6 }}><PinNumber n={2} /></span>
            </div>
            <Bars w={[96, 100, 70]} />
            <div className="km-fig" />
            <div className="km-hl2">
              <Bars w={[84]} tone="var(--brand-100)" />
              <span className="km-pin-abs" style={{ right: -13, top: -8 }}><PinNumber n={1} /></span>
            </div>
          </div>
          <div className="km-side">
            <div className="km-side-i"><PinNumber n={1} size={20} /><div><b>Marco</b><small>Use the primary blue here.</small></div></div>
            <div className="km-side-i"><PinNumber n={2} size={20} /><div><b>Dana Lee</b><small>Add the logo clear space.</small></div></div>
            <div className="km-side-i"><PinNumber resolved size={20} /><div><b>Priya</b><small>Resolved</small></div></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="km-mock" role="img" aria-label="A website with numbered comment pins and an open comment">
      <div className="km-bar-top">
        <span className="km-dots"><i /><i /><i /></span>
        <span className="km-url">{url}</span>
      </div>
      <div className="km-web">
        <div className="km-wnav"><Bars w={[100]} h={8} /><span style={{ width: 120 }}><Bars w={[100]} h={8} /></span></div>
        <div className="km-whero">
          <Bars w={[62, 48]} h={16} tone="var(--slate-300)" />
          <div style={{ height: 10 }} />
          <Bars w={[70]} h={8} />
          <span className="km-wbtn" />
        </div>
        <div className="km-wcards"><i /><i /><i /></div>
        <span className="km-pin-abs" style={{ left: '8%', top: '30%' }}><PinNumber n={4} /></span>
        <span className="km-pin-abs" style={{ left: '52%', top: '58%' }}><PinNumber n={7} /></span>
        <span className="km-pin-abs" style={{ left: '24%', top: '74%' }}><PinNumber resolved /></span>
        <Pop style={{ left: '58%', top: '12%' }} text={comment || 'Can the button say what happens next?'} pin={7} />
      </div>
    </div>
  );
}
