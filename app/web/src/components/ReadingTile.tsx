import { cn } from "@/lib/utils";
import { formatValue } from "@/lib/format";
import type { Reading, Sensor, Status } from "@/lib/types";

const STATUS_TEXT: Record<Status, string> = {
  settled: "Settled",
  unstable: "Unstable · re-take",
  fault: "Sensor fault",
};

const BAR: Record<Status | "empty", string> = {
  settled: "bg-settled",
  unstable: "bg-unstable",
  fault: "bg-fault",
  empty: "bg-border",
};

function detail(r: Reading): string | null {
  if (r.sensor === "TDS" && r.temp !== undefined) return `at ${r.temp} °C water`;
  if (r.sensor === "VOLT" && r.min !== undefined) return `${r.min}–${r.max} V${r.cal === false ? " · uncalibrated" : ""}`;
  if (r.sensor === "SOUND") return "phone mic · approx.";
  return null;
}

export function StatusChip({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        status === "settled" && "text-settled",
        status === "unstable" && "text-unstable",
        status === "fault" && "text-fault",
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {STATUS_TEXT[status]}
    </span>
  );
}

interface Props {
  sensor: Sensor;
  label: string;
  unit: string;
  button?: number;
  reading?: Reading;
  action?: React.ReactNode; // e.g. Measure / Simulate
  className?: string;
}

export function ReadingTile({ sensor, label, unit, button, reading, action, className }: Props) {
  const state = reading ? (reading.status ?? "settled") : "empty";
  const info = reading && detail(reading);
  return (
    <section
      aria-label={label}
      className={cn("relative overflow-hidden rounded-md border bg-card py-3 pl-4 pr-3", className)}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", BAR[state])} aria-hidden />
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase leading-tight tracking-[0.07em] text-muted-foreground sm:text-[12px]">{label}</h3>
        {button && (
          <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-muted-foreground" title={`Button ${button} on the device`}>
            BTN {button}
          </span>
        )}
      </header>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("tabnum font-mono text-[28px] font-semibold leading-none sm:text-[34px]", !reading && "text-muted-foreground/50")}>
          {reading ? formatValue(reading) : "—"}
        </span>
        <span className="font-mono text-sm text-muted-foreground">{unit}</span>
      </div>

      <div className="mt-2 flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1">
        {reading?.status && <StatusChip status={reading.status} />}
        {info && <span className="text-xs text-muted-foreground">{info}</span>}
        {!reading && (
          <span className="text-xs text-muted-foreground">
            {button ? `Press ${button} on the device` : sensor === "SOUND" ? "Measured with this phone" : ""}
          </span>
        )}
        {reading && (
          <time className="font-mono text-[11px] text-muted-foreground sm:ml-auto" dateTime={reading.taken_at}>
            {new Date(reading.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
        )}
      </div>
      {action && <div className="mt-2.5">{action}</div>}
    </section>
  );
}
