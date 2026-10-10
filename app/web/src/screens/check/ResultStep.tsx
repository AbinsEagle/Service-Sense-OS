import { useState } from "react";
import { Share2 } from "lucide-react";
import { SENSOR_INFO } from "@/config/catalog";
import { Button } from "@/components/m3";
import { RangeBar, VerdictText } from "@/components/RangeBar";
import { isSimulated, judgePh, judgeReading, lsiFor, outcome, requiredSensors } from "@/lib/evaluate";
import { fmtValue } from "@/lib/format";
import { shareReport } from "@/lib/report";
import type { Check } from "@/lib/types";
import { cn } from "@/lib/utils";

// Site status for the product the customer bought (feature list Q9, Q10) and the
// shared image report (UI plan U5), on one screen (U7).
export function ResultStep({ check, finish, onDone, notify }: { check: Check; finish(): Check; onDone(): void; notify(m: string): void }) {
  const [busy, setBusy] = useState(false);
  const o = outcome(check);
  const lsi = lsiFor(check);
  const finished = Boolean(check.finishedAt);
  const color = o.status === "ready" ? "text-ok" : o.status === "addon" ? "text-warn" : "text-fail";

  const share = async () => {
    setBusy(true);
    try {
      const r = await shareReport(finish());
      if (r === "saved") notify("Report image saved. Send it from WhatsApp.");
    } catch {
      notify("Couldn't share the report. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pb-8">
      <section>
        {isSimulated(check) && <p className="mb-2 text-xs font-medium uppercase tracking-wider text-warn">Training · simulated readings</p>}
        <h2 className={cn("text-[32px] leading-10", color)}>{o.title}</h2>
        {o.reasons.map((r) => (
          <p key={r} className="mt-1 text-on-surface-variant">
            {r}
          </p>
        ))}
        {o.status === "notready" && <p className="mt-2 text-on-surface">Don't install until the supply or plumbing is fixed.</p>}
      </section>

      {o.addons.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-sm font-medium text-on-surface-variant">Recommend before installing</h3>
          {o.addons.map((a) => (
            <p key={a} className="text-lg text-on-surface">
              {a}
            </p>
          ))}
        </section>
      )}

      <section className="grid gap-5">
        <h3 className="text-sm font-medium text-on-surface-variant">Readings</h3>
        {requiredSensors(check).map((s) => {
          const r = check.readings[s]!;
          const j = judgeReading(check, r);
          if (!j) return null;
          return (
            <div key={s}>
              <div className="flex items-baseline gap-2">
                <span className="flex-1 text-on-surface">{SENSOR_INFO[s].label}</span>
                <span className="text-on-surface tabnum">
                  {fmtValue(r)} {SENSOR_INFO[s].unit}
                </span>
                <VerdictText level={j.verdict.level} text={j.verdict.text} />
              </div>
              <RangeBar band={j.band} values={s === "VOLT" && r.min !== undefined ? [r.min, r.max!] : [r.value!]} level={j.verdict.level} unit={SENSOR_INFO[s].unit} />
            </div>
          );
        })}
        {check.ph !== null && (
          <div className="flex items-baseline gap-2">
            <span className="flex-1 text-on-surface">pH (strip)</span>
            <span className="text-on-surface tabnum">{check.ph.toFixed(1)}</span>
            <VerdictText level={judgePh(check.ph).verdict.level} text={judgePh(check.ph).verdict.text} />
          </div>
        )}
        {lsi && (
          <div className="flex items-baseline gap-2">
            <span className="flex-1 text-on-surface">Water tendency (estimate)</span>
            <span className="text-on-surface">{lsi.label}</span>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto grid max-w-2xl gap-1">
          <Button size="lg" className="w-full" icon={<Share2 className="h-5 w-5" />} onClick={share} disabled={busy}>
            {busy ? "Preparing report…" : finished ? "Share again" : "Share report"}
          </Button>
          <Button
            variant="text"
            className="w-full"
            onClick={() => {
              finish();
              onDone();
            }}
          >
            {finished ? "Done" : "Finish without sharing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
