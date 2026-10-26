// Kommently logo mark ("Pin K": the K's arm ends in a ring pin, the app's pin
// style). Same artwork as public/favicon.svg and website/public/brand/.
// inverse: blue mark on a white tile, for dark or brand-blue backgrounds.
export default function BrandMark({ className = 'w-8 h-8', inverse = false }) {
  const tile = inverse ? '#ffffff' : '#003dff';
  const ink = inverse ? '#003dff' : '#ffffff';
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill={tile} />
      <path d="M18.5 16v33M18.5 36.5L39 19M25.1 31L39 49" stroke={ink} strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="40.5" cy="17.5" r="7.6" fill={ink} />
      <circle cx="40.5" cy="17.5" r="3" fill={tile} />
    </svg>
  );
}
