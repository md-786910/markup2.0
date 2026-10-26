// Kommently logo mark (same as the website): brand-blue tile with the K stroke
export default function BrandMark({ className = 'w-8 h-8' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-lg bg-blue-600 text-white shrink-0 ${className}`} aria-hidden="true">
      <svg className="w-1/2 h-1/2" viewBox="0 0 24 24" fill="none">
        <path d="M7 16 L10 8 L12 12 L14 8 L17 16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
