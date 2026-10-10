import { PRODUCT } from "@/config/brand";
import { cn } from "@/lib/utils";

// Service Sense OS mark: a sensing pulse on trust blue, ending in a green "OK" dot.
// Same geometry as public/favicon.svg and the report header (lib/report.ts).
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={cn("shrink-0", className)} role="img" aria-label={PRODUCT.name}>
      <rect width="48" height="48" rx="13" fill="#1565C0" />
      <path d="M8 27h7l4-10 6 17 5-12 3 5h5" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="27" r="3.6" fill="#69F0AE" />
    </svg>
  );
}

// "Powered by Service Sense OS" lockup.
export function PoweredBy({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Logo size={size} />
      <span className="leading-tight">
        <span className="block text-xs text-on-surface-variant">Powered by</span>
        <span className="block text-base font-medium text-on-surface">{PRODUCT.name}</span>
      </span>
    </span>
  );
}
