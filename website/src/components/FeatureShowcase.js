import React from 'react';
import { CheckIcon, CursorIcon, LockIcon, ClipboardIcon, ShieldIcon } from './icons';
import { SHOWCASE_FEATURES } from '../data/features';
import useScrollReveal from '../hooks/useScrollReveal';

function PinsVisual() {
  return (
    <div className="relative bg-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl">
      {/* Browser bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800/80 border-b border-gray-700/50">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <div className="flex-1 mx-3">
          <div className="bg-gray-700/50 rounded px-3 py-1 text-[10px] text-gray-500 max-w-[200px] mx-auto text-center">client-website.com</div>
        </div>
      </div>
      {/* Content */}
      <div className="relative p-6 h-64">
        <div className="w-2/3 h-4 bg-gray-700/40 rounded mb-3" />
        <div className="w-full h-2.5 bg-gray-700/25 rounded mb-2" />
        <div className="w-5/6 h-2.5 bg-gray-700/25 rounded mb-2" />
        <div className="w-3/4 h-2.5 bg-gray-700/25 rounded mb-6" />
        <div className="flex gap-2">
          <div className="w-20 h-8 bg-blue-600/30 rounded-md" />
          <div className="w-20 h-8 bg-gray-700/30 rounded-md" />
        </div>

        {/* Pins */}
        <div className="absolute top-12 right-12 animate-bounce-gentle">
          <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-500/40">1</div>
        </div>
        <div className="absolute top-28 left-16 animate-bounce-gentle" style={{ animationDelay: '0.6s' }}>
          <div className="w-7 h-7 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-purple-500/40">2</div>
        </div>
        <div className="absolute bottom-12 right-20 animate-bounce-gentle" style={{ animationDelay: '1.2s' }}>
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-emerald-500/40">3</div>
        </div>

        {/* Tooltip */}
        <div className="absolute top-6 right-4 bg-white rounded-lg shadow-xl p-2.5 w-44 border border-gray-100">
          <p className="text-[10px] font-medium text-gray-900">Fix button alignment</p>
          <p className="text-[9px] text-gray-400 mt-0.5">Button is 4px off-center</p>
        </div>

        {/* Cursor */}
        <div className="absolute bottom-20 left-[45%] animate-float" style={{ animationDelay: '0.8s' }}>
          <CursorIcon className="w-4 h-4 text-white/30" />
        </div>
      </div>
    </div>
  );
}

function CommentsVisual() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-900">Comments (3)</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-gray-400">3 online</span>
        </div>
      </div>
      {/* Comments */}
      <div className="p-4 space-y-4">
        {[
          { initials: 'SC', name: 'Sarah Chen', text: 'The hero section looks great! Can we make the CTA button larger?', gradient: 'from-blue-500 to-indigo-600', time: '2m ago' },
          { initials: 'AR', name: 'Alex Rivera', text: 'Agreed. Also, the font size on mobile needs adjusting.', gradient: 'from-purple-500 to-pink-600', time: '1m ago' },
          { initials: 'MT', name: 'Maria Torres', text: '@Sarah I\'ll push the fix now. Check the staging link.', gradient: 'from-emerald-500 to-teal-600', time: 'Just now' },
        ].map((comment, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${comment.gradient} flex items-center justify-center flex-shrink-0`}>
              <span className="text-[10px] text-white font-semibold">{comment.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-900">{comment.name}</span>
                <span className="text-[10px] text-gray-400">{comment.time}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{comment.text}</p>
            </div>
          </div>
        ))}
        {/* Typing indicator */}
        <div className="flex items-center gap-2 pl-9">
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="text-[10px] text-gray-400">Alex is typing...</span>
        </div>
      </div>
      {/* @mention badge */}
      <div className="absolute -top-2 -right-2 animate-float-delay hidden lg:block">
        <span className="bg-blue-50 text-blue-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-blue-100">@mention</span>
      </div>
    </div>
  );
}

function SharingVisual() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-900">Share Settings</span>
      </div>
      <div className="p-5 space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">Enable sharing</span>
          <div className="w-9 h-5 bg-blue-500 rounded-full relative">
            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        </div>
        {/* Password */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Password Protection</label>
          <div className="mt-1.5 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <LockIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">••••••••</span>
          </div>
        </div>
        {/* Link */}
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Share Link</label>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-[10px] text-gray-500 truncate block">feedbackly.online/review/a8f3k...</span>
            </div>
            <button className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-[10px] font-medium hover:bg-blue-100 transition-colors">
              <ClipboardIcon className="w-3 h-3" />
              Copy
            </button>
          </div>
        </div>
        {/* Guests viewing */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <div className="flex -space-x-1.5">
            {['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-green-400 to-green-600'].map((g, i) => (
              <div key={i} className={`w-6 h-6 rounded-full bg-gradient-to-br ${g} border-2 border-white flex items-center justify-center`}>
                <span className="text-[8px] text-white font-bold">{['J', 'K', 'M'][i]}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-gray-400">3 guests viewing</span>
        </div>
      </div>
      {/* Floating shield */}
      <div className="absolute -bottom-3 -right-3 animate-float-slow hidden lg:block">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <ShieldIcon className="w-5 h-5 text-emerald-500" />
        </div>
      </div>
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
    <section className={`${bg} py-20 lg:py-24`} ref={ref}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}>
        {/* Text */}
        <div className="flex-1" data-reveal={reversed ? 'right' : 'left'}>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            {feature.title}
          </h2>
          <p className="text-gray-500 mt-4 leading-relaxed">{feature.description}</p>
          <ul className="mt-6 space-y-3">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckIcon className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-gray-600 text-[15px]">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Visual */}
        <div className="flex-1 w-full max-w-lg relative" data-reveal={reversed ? 'left' : 'right'}>
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
