export default function TrustedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gold-soft text-[#8a5a00] ${className}`}
      title="4.8+ average rating across 10+ completed conversations"
    >
      <svg viewBox="0 0 20 20" className="w-3 h-3 fill-current">
        <path d="M10 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 11.8l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z" />
      </svg>
      Trusted Host
    </span>
  );
}
