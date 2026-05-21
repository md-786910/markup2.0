import React, { useEffect, useState } from 'react';
import { CheckIcon, CursorIcon, LockIcon, ClipboardIcon, ShieldIcon } from './icons';
import { SHOWCASE_FEATURES } from '../data/features';
import useScrollReveal from '../hooks/useScrollReveal';

function AutoVisualSlider({ slides, interval = 3200, renderSlide, heightClassName, dotsClassName = 'bottom-4' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [interval, paused, slides.length]);

  return (
    <div
      className={`relative overflow-hidden ${heightClassName}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ease-out ${isActive ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
            aria-hidden={!isActive}
          >
            {renderSlide(slide, isActive)}
          </div>
        );
      })}

      <div className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center gap-2 ${dotsClassName}`}>
        {slides.map((slide, index) => (
          <span
            key={slide.id}
            className={`h-1.5 rounded-full transition-all duration-500 ${index === activeIndex ? 'w-7 bg-blue-500' : 'w-1.5 bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
}

const PINS_SLIDES = [
  {
    id: 'pins-layout',
    page: 'Homepage / Hero',
    status: 'Open',
    priority: 'High',
    titleWidth: 'w-2/3',
    lines: ['w-full', 'w-5/6', 'w-3/4'],
    pins: [
      { id: 1, label: '1', tone: 'bg-blue-500 shadow-blue-500/30', position: 'top-12 right-12' },
      { id: 2, label: '2', tone: 'bg-purple-500 shadow-purple-500/30', position: 'top-28 left-16' },
      { id: 3, label: '3', tone: 'bg-emerald-500 shadow-emerald-500/30', position: 'bottom-12 right-20' },
    ],
    tooltip: { title: 'Fix button alignment', body: 'Button is 4px off-center', position: 'top-6 right-4' },
    cursor: 'bottom-20 left-[45%]',
  },
  {
    id: 'pins-banner',
    page: 'Pricing / Banner',
    status: 'Needs Review',
    priority: 'Medium',
    titleWidth: 'w-1/2',
    lines: ['w-4/5', 'w-3/5', 'w-2/3'],
    pins: [
      { id: 1, label: '1', tone: 'bg-orange-500 shadow-orange-500/30', position: 'top-14 left-14' },
      { id: 2, label: '2', tone: 'bg-sky-500 shadow-sky-500/30', position: 'top-24 right-24' },
      { id: 3, label: '3', tone: 'bg-fuchsia-500 shadow-fuchsia-500/30', position: 'bottom-10 left-1/2' },
    ],
    tooltip: { title: 'Update promo copy', body: 'Heading needs stronger contrast', position: 'bottom-6 left-6' },
    cursor: 'top-24 left-[52%]',
  },
  {
    id: 'pins-card',
    page: 'Docs / Features',
    status: 'In Progress',
    priority: 'Low',
    titleWidth: 'w-3/5',
    lines: ['w-11/12', 'w-4/6', 'w-5/6'],
    pins: [
      { id: 1, label: '1', tone: 'bg-cyan-500 shadow-cyan-500/30', position: 'top-16 right-16' },
      { id: 2, label: '2', tone: 'bg-violet-500 shadow-violet-500/30', position: 'bottom-16 left-16' },
      { id: 3, label: '3', tone: 'bg-green-500 shadow-green-500/30', position: 'bottom-12 right-24' },
    ],
    tooltip: { title: 'Review spacing', body: 'Cards need 8px more gutter', position: 'top-10 left-8' },
    cursor: 'bottom-24 left-[58%]',
  },
];

function PinsVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center gap-1.5 border-b border-gray-700/50 bg-gray-800/80 px-4 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <div className="mx-3 flex-1">
          <div className="mx-auto max-w-[200px] rounded bg-gray-700/50 px-3 py-1 text-center text-[10px] text-gray-500">client-website.com</div>
        </div>
      </div>

      <AutoVisualSlider
        slides={PINS_SLIDES}
        interval={3000}
        heightClassName="h-64"
        dotsClassName="bottom-3"
        renderSlide={(slide, isActive) => (
          <div className="relative h-full p-6">
            <div className={`mb-4 flex items-center justify-between transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Pinned on</p>
                <p className="mt-1 text-xs font-medium text-gray-200">{slide.page}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">{slide.status}</span>
                <span className="rounded-full border border-gray-600 px-2 py-0.5 text-[10px] text-gray-400">{slide.priority}</span>
              </div>
            </div>
            <div className={`${slide.titleWidth} mb-3 h-4 rounded bg-gray-700/40 transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`} />
            <div className={`h-2.5 rounded bg-gray-700/25 transition-all duration-700 ${slide.lines[0]} ${isActive ? 'translate-y-0 opacity-100 delay-75' : 'translate-y-2 opacity-0'}`} />
            <div className={`mt-2 h-2.5 rounded bg-gray-700/25 transition-all duration-700 ${slide.lines[1]} ${isActive ? 'translate-y-0 opacity-100 delay-100' : 'translate-y-2 opacity-0'}`} />
            <div className={`mt-2 h-2.5 rounded bg-gray-700/25 transition-all duration-700 ${slide.lines[2]} ${isActive ? 'translate-y-0 opacity-100 delay-150' : 'translate-y-2 opacity-0'}`} />
            <div className="mt-6 flex gap-2">
              <div className="h-8 w-20 rounded-md bg-blue-600/30" />
              <div className="h-8 w-20 rounded-md bg-gray-700/30" />
            </div>

            {slide.pins.map((pin, index) => (
              <div
                key={pin.id}
                className={`absolute ${pin.position} transition-all duration-700 ${isActive ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg ${pin.tone}`}>
                  {pin.label}
                </div>
              </div>
            ))}

            <div
              className={`absolute ${slide.tooltip.position} w-44 rounded-lg border border-gray-100 bg-white p-2.5 shadow-xl transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100 delay-150' : 'translate-y-2 opacity-0'}`}
            >
              <p className="text-[10px] font-medium text-gray-900">{slide.tooltip.title}</p>
              <p className="mt-0.5 text-[9px] text-gray-400">{slide.tooltip.body}</p>
            </div>

            <div className={`absolute ${slide.cursor} transition-all duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              <CursorIcon className="h-4 w-4 text-white/30" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

const COMMENT_SLIDES = [
  {
    id: 'comment-thread-1',
    online: '3 online',
    typing: 'Alex is typing...',
    mention: '@mention',
    channel: 'Hero review',
    meta: '2 attachments',
    comments: [
      { initials: 'SC', name: 'Sarah Chen', text: 'The hero section looks great! Can we make the CTA button larger?', gradient: 'from-blue-500 to-indigo-600', time: '2m ago' },
      { initials: 'AR', name: 'Alex Rivera', text: 'Agreed. Also, the font size on mobile needs adjusting.', gradient: 'from-purple-500 to-pink-600', time: '1m ago' },
      { initials: 'MT', name: 'Maria Torres', text: "I'll push the fix now. Check the staging link.", gradient: 'from-emerald-500 to-teal-600', time: 'Just now' },
    ],
  },
  {
    id: 'comment-thread-2',
    online: '4 online',
    typing: 'Maria is replying...',
    mention: '@reply',
    channel: 'Pricing pass',
    meta: '1 Loom note',
    comments: [
      { initials: 'JR', name: 'James Reed', text: 'Can we tighten the spacing above the pricing cards?', gradient: 'from-cyan-500 to-blue-600', time: '4m ago' },
      { initials: 'LK', name: 'Lina Kim', text: 'Yes. The tablet layout also wraps a bit early.', gradient: 'from-fuchsia-500 to-rose-600', time: '2m ago' },
      { initials: 'MT', name: 'Maria Torres', text: 'I have a patch ready. Sharing preview shortly.', gradient: 'from-emerald-500 to-green-600', time: 'Now' },
    ],
  },
  {
    id: 'comment-thread-3',
    online: '2 online',
    typing: 'Noah is typing...',
    mention: '@resolved',
    channel: 'Final QA',
    meta: 'Marked ready',
    comments: [
      { initials: 'NB', name: 'Noah Blake', text: 'Footer links are cleaner. One more pass on contrast?', gradient: 'from-violet-500 to-indigo-600', time: '6m ago' },
      { initials: 'SC', name: 'Sarah Chen', text: 'I updated the palette. Looks better on dark backgrounds now.', gradient: 'from-blue-500 to-cyan-600', time: '3m ago' },
      { initials: 'AD', name: 'Ava Diaz', text: 'Approved from my side. Marking this ready for QA.', gradient: 'from-amber-500 to-orange-600', time: '1m ago' },
    ],
  },
];

function CommentsVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <span className="text-xs font-semibold text-gray-900">Comments (3)</span>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-gray-400">Live thread</span>
        </div>
      </div>

      <AutoVisualSlider
        slides={COMMENT_SLIDES}
        interval={3600}
        heightClassName="h-[248px]"
        dotsClassName="bottom-3"
        renderSlide={(slide, isActive) => (
          <div className="h-full p-4">
            <div className={`mb-3 flex items-center justify-between transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Thread</p>
                <p className="mt-1 text-xs font-semibold text-gray-900">{slide.channel}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500">{slide.meta}</span>
            </div>
            <div className="space-y-4">
              {slide.comments.map((comment, index) => (
                <div
                  key={`${slide.id}-${comment.name}`}
                  className={`flex items-start gap-2.5 transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
                  style={{ transitionDelay: `${index * 90}ms` }}
                >
                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${comment.gradient}`}>
                    <span className="text-[10px] font-semibold text-white">{comment.initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900">{comment.name}</span>
                      <span className="text-[10px] text-gray-400">{comment.time}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`mt-4 flex items-center gap-2 pl-9 transition-all duration-700 ${isActive ? 'opacity-100 delay-150' : 'opacity-0'}`}>
              <div className="flex gap-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse" />
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-[10px] text-gray-400">{slide.typing}</span>
            </div>

            <div className="absolute right-4 top-3 flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-gray-400">{slide.online}</span>
            </div>

            <div className={`absolute -right-2 -top-2 hidden lg:block transition-all duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{slide.mention}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}

const SHARING_SLIDES = [
  {
    id: 'sharing-open',
    password: 'password required',
    link: 'feedbackly.online/review/a8f3k...',
    viewers: ['J', 'K', 'M'],
    note: '3 guests viewing',
    toggleOn: true,
    copyLabel: 'Copy',
    access: 'Public to invitees',
    expiry: 'No expiry',
  },
  {
    id: 'sharing-expiry',
    password: 'expires in 24 hours',
    link: 'feedbackly.online/review/staging-v2...',
    viewers: ['L', 'N', 'A'],
    note: 'Link shared with stakeholders',
    toggleOn: true,
    copyLabel: 'Copied',
    access: 'Client review',
    expiry: 'Expires tomorrow',
  },
  {
    id: 'sharing-private',
    password: 'invite only access',
    link: 'feedbackly.online/review/private-qa...',
    viewers: ['P', 'R', 'S'],
    note: 'Private review enabled',
    toggleOn: false,
    copyLabel: 'Copy',
    access: 'Internal only',
    expiry: 'Hidden from guests',
  },
];

function SharingVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="border-b border-gray-100 px-5 py-3">
        <span className="text-xs font-semibold text-gray-900">Share Settings</span>
      </div>

      <AutoVisualSlider
        slides={SHARING_SLIDES}
        interval={3400}
        heightClassName="h-[252px]"
        dotsClassName="bottom-3"
        renderSlide={(slide, isActive) => (
          <div className="relative h-full p-5">
            <div className="space-y-4">
              <div className={`grid grid-cols-2 gap-2 transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Access</p>
                  <p className="mt-1 text-xs font-medium text-gray-700">{slide.access}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Expiry</p>
                  <p className="mt-1 text-xs font-medium text-gray-700">{slide.expiry}</p>
                </div>
              </div>

              <div className={`flex items-center justify-between transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
                <span className="text-xs font-medium text-gray-700">Enable sharing</span>
                <div className={`relative h-5 w-9 rounded-full transition-colors duration-500 ${slide.toggleOn ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-500 ${slide.toggleOn ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>

              <div className={`transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100 delay-75' : 'translate-y-2 opacity-0'}`}>
                <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Password Protection</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <LockIcon className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">{slide.password}</span>
                </div>
              </div>

              <div className={`transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100 delay-100' : 'translate-y-2 opacity-0'}`}>
                <label className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Share Link</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="block truncate text-[10px] text-gray-500">{slide.link}</span>
                  </div>
                  <button className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-100">
                    <ClipboardIcon className="h-3 w-3" />
                    {slide.copyLabel}
                  </button>
                </div>
              </div>

              <div className={`flex items-center gap-2 border-t border-gray-100 pt-2 transition-all duration-700 ${isActive ? 'translate-y-0 opacity-100 delay-150' : 'translate-y-2 opacity-0'}`}>
                <div className="flex -space-x-1.5">
                  {slide.viewers.map((viewer, index) => {
                    const gradients = ['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-green-400 to-green-600'];
                    return (
                      <div key={viewer} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br ${gradients[index]}`}>
                        <span className="text-[8px] font-bold text-white">{viewer}</span>
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-gray-400">{slide.note}</span>
              </div>
            </div>

            <div className={`absolute -bottom-3 -right-3 hidden lg:block transition-all duration-700 ${isActive ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
                <ShieldIcon className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

const VISUAL_MAP = {
  pins: PinsVisual,
  comments: CommentsVisual,
  sharing: SharingVisual,
};

function ShowcaseRow({ feature, index }) {
  const ref = useScrollReveal();
  const Visual = VISUAL_MAP[feature.visual];
  const reversed = index % 2 === 1;
  const bg = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';

  return (
    <section className={`${bg} py-10 lg:py-10`} ref={ref}>
      <div className={`mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 sm:px-6 lg:gap-20 lg:px-8 ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
        <div className="flex-1" data-reveal={reversed ? 'right' : 'left'}>
          <h2 className="text-[14px] sm:text-[20px] md:text-[26px] lg:text-[34px] xl:text-[38px] 2xl:text-[42px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            {feature.title}
          </h2>
          <p className="mt-4 leading-relaxed text-gray-500">{feature.description}</p>
          <ul className="mt-6 space-y-3">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckIcon className="h-3 w-3 text-emerald-600" />
                </div>
                <span className="text-[15px] text-gray-600">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative w-full max-w-lg flex-1" data-reveal={reversed ? 'left' : 'right'}>
          <Visual />
        </div>
      </div>
    </section>
  );
}

export default function FeatureShowcase() {
  return (
    <div>
      {SHOWCASE_FEATURES.map((feature, i) => (
        <ShowcaseRow key={feature.id} feature={feature} index={i} />
      ))}
    </div>
  );
}
