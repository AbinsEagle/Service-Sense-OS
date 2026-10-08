import { Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "todo" | "attention";

// Always-visible step progress (UI plan U1). Tapping a reachable step jumps back to it.
export function StepTracker({ steps, onSelect }: { steps: { label: string; state: StepState; reachable: boolean }[]; onSelect(i: number): void }) {
  return (
    <nav aria-label="Check progress" className="mx-auto max-w-2xl px-4 pb-3">
      <ol className="flex items-start">
        {steps.map((s, i) => (
          <li key={s.label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : steps[i - 1].state === "done" || steps[i - 1].state === "attention" ? "bg-primary" : "bg-outline-variant")} />
              <button
                type="button"
                disabled={!s.reachable}
                onClick={() => onSelect(i)}
                aria-current={s.state === "current" ? "step" : undefined}
                aria-label={`${s.label}: ${s.state === "done" ? "done" : s.state === "attention" ? "needs attention" : s.state === "current" ? "current step" : "to do"}`}
                className={cn(
                  "state flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  s.state === "done" && "bg-primary text-on-primary",
                  s.state === "current" && "bg-primary-container text-on-primary-container ring-2 ring-primary ring-offset-2 ring-offset-surface",
                  s.state === "todo" && "border border-outline text-on-surface-variant",
                  s.state === "attention" && "bg-warn-container text-on-warn-container",
                )}
              >
                {s.state === "done" ? <CheckIcon className="h-4 w-4" strokeWidth={3} /> : s.state === "attention" ? "!" : i + 1}
              </button>
              <span className={cn("h-0.5 flex-1", i === steps.length - 1 ? "bg-transparent" : s.state === "done" || s.state === "attention" ? "bg-primary" : "bg-outline-variant")} />
            </div>
            <span className={cn("mt-1 text-[11px] font-medium", s.state === "current" ? "text-on-surface" : "text-on-surface-variant")}>{s.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
