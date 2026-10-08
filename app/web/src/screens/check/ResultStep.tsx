import { CircleAlert, CircleCheck, CircleX, FlaskConical } from "lucide-react";
import { SENSOR_INFO } from "@/config/catalog";
import { RangeBar, VerdictText } from "@/components/RangeBar";
import { isSimulated, judgePh, judgeReading, lsiFor, outcome, requiredSensors } from "@/lib/evaluate";
import type { Check } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fmtValue } from "@/lib/format";

// Site status for the product the customer bought + add-ons (feature list Q9, Q10).
export function ResultStep({ check }: { check: Check }) {
  const o = outcome(check);
  const lsi = lsiFor(check);
  const Icon = o.status === "ready" ? CircleCheck : o.status === "addon" ? CircleAlert : CircleX;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {isSimulated(check) && (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-warn px-4 py-2 text-sm text-warn">
          <FlaskConical className="h-4 w-4" aria-hidden /> Training check: simulated readings
        </p>
      )}
      <section
        className={cn(
          "rounded-xl p-5",
          o.status === "ready" && "bg-ok-container text-on-ok-container",
          o.status === "addon" && "bg-warn-container text-on-warn-container",
          o.status === "notready" && "bg-fail-container text-on-fail-container",
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-8 w-8 shrink-0" aria-hidden />
          <h2 className="text-[28px] leading-9">{o.title}</h2>
        </div>
        {o.reasons.length > 0 && (
          <ul className="mt-3 grid gap-1 pl-11 text-sm">
            {o.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {o.status === "notready" && <p className="mt-3 pl-11 text-sm">Don't install until the site is fixed. Advise the customer to get the supply or plumbing checked.</p>}
      </section>

      {o.addons.length > 0 && (
        <section className="rounded-md bg-surface-container-low p-4">
          <h3 className="text-base font-medium text-on-surface">Recommend before installing</h3>
          <ul className="mt-2 grid gap-2">
            {o.addons.map((a) => (
              <li key={a} className="flex items-center gap-3 text-on-surface">
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden /> {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-md bg-surface-container-low p-4">
        <h3 className="text-base font-medium text-on-surface">Site readings</h3>
        {requiredSensors(check).map((s) => {
          const r = check.readings[s]!;
          const j = judgeReading(check, r);
          if (!j) return null;
          return (
            <div key={s}>
              <div className="flex items-baseline gap-2">
                <span className="flex-1 text-on-surface">{SENSOR_INFO[s].label}</span>
                <span className="font-medium tabnum">
                  {fmtValue(r)} {SENSOR_INFO[s].unit}
                </span>
                <VerdictText level={j.verdict.level} text={j.verdict.text} />
              </div>
              <RangeBar band={j.band} values={s === "VOLT" && r.min !== undefined ? [r.min, r.max!] : [r.value!]} level={j.verdict.level} unit={SENSOR_INFO[s].unit} />
              <p className="text-[11px] text-on-surface-variant">
                Limit: {j.band.basis}
                {j.band.provisional && " · provisional"}
              </p>
            </div>
          );
        })}
        {check.ph !== null && (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="flex-1 text-on-surface">pH (test strip)</span>
              <span className="font-medium tabnum">{check.ph.toFixed(1)}</span>
              <VerdictText level={judgePh(check.ph).verdict.level} text={judgePh(check.ph).verdict.text} />
            </div>
            <RangeBar band={judgePh(check.ph).band} values={[check.ph]} level={judgePh(check.ph).verdict.level} unit="" />
          </div>
        )}
        {lsi && (
          <p className="text-sm text-on-surface">
            Water tendency (Langelier, estimate): <b>{lsi.label}</b> ({lsi.value >= 0 ? "+" : ""}
            {lsi.value.toFixed(1)})
          </p>
        )}
      </section>
    </div>
  );
}
