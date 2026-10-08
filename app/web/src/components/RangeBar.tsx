import type { Band } from "@/config/limits";
import type { Level } from "@/lib/evaluate";
import { cn } from "@/lib/utils";

// Low / high range bar (feature list Q6): green OK band, amber and red zones either side,
// a marker at the reading (or a span from min to max for voltage).
export function RangeBar({ band, values, level, unit }: { band: Band; values: number[]; level: Level; unit: string }) {
  const [lo, hi] = band.scale;
  const pct = (v: number) => ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100;
  const wl = pct(band.warnLow ?? lo), wh = pct(band.warnHigh ?? hi), ol = pct(band.okLow ?? lo), oh = pct(band.okHigh ?? hi);
  const marker = level === "ok" ? "bg-ok" : level === "warn" ? "bg-warn" : "bg-fail";
  return (
    <div aria-hidden className="pt-2">
      <div className="relative h-2 overflow-visible rounded-full bg-fail/20">
        <div className="absolute inset-y-0 bg-warn/25" style={{ left: `${wl}%`, width: `${wh - wl}%` }} />
        <div className="absolute inset-y-0 bg-ok/30" style={{ left: `${ol}%`, width: `${oh - ol}%` }} />
        {values.length === 2 ? (
          <div className={cn("absolute -top-1.5 h-5 rounded-full", marker)} style={{ left: `${pct(values[0])}%`, width: `max(6px, ${pct(values[1]) - pct(values[0])}%)` }} />
        ) : (
          <div className={cn("absolute -top-2 h-6 w-1.5 -translate-x-1/2 rounded-full", marker)} style={{ left: `${pct(values[0])}%` }} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-on-surface-variant tabnum">
        <span>{lo} {unit}</span>
        {band.okLow !== undefined && band.okHigh !== undefined && <span>OK {band.okLow}–{band.okHigh}</span>}
        {band.okLow === undefined && band.okHigh !== undefined && <span>OK ≤ {band.okHigh}</span>}
        <span>{hi} {unit}</span>
      </div>
    </div>
  );
}

export function VerdictText({ level, text }: { level: Level; text: string }) {
  return (
    <span className={cn("text-sm font-bold uppercase tracking-wide", level === "ok" ? "text-ok" : level === "warn" ? "text-warn" : "text-fail")}>{text}</span>
  );
}
