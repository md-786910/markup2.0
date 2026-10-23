import React from 'react';

// A real product screenshot in a light browser frame (images: public/images/product,
// captured at 2x from the app at 1440x900).
export default function ProductShot({ src, alt, url, eager = false, className = '' }) {
  return (
    <figure className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ${className}`}>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
        {url ? (
          <div className="mx-auto hidden max-w-sm flex-1 truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-center text-xs text-slate-500 sm:block">
            {url}
          </div>
        ) : null}
      </div>
      <img
        src={src}
        alt={alt}
        width="1440"
        height="900"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
    </figure>
  );
}
