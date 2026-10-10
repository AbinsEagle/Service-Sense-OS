import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "todo" | "attention";

// Thin segmented progress (UI plan U1, simplified in U7): one segment per step,
// tappable to go back to a reached step.
export function Progress({ steps, onSelect }: { steps: { label: string; state: StepState; reachable: boolean }[]; onSelect(i: number): void }) {
  const current = steps.findIndex((s) => s.state === "current");
  return (
    <nav aria-label="Check progress" className="mx-auto max-w-2xl px-4 pb-2">
      <ol className="flex gap-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className="flex-1">
            <button
              type="button"
              disabled={!s.reachable}
              onClick={() => onSelect(i)}
              aria-current={s.state === "current" ? "step" : undefined}
              aria-label={`${s.label}: ${s.state === "attention" ? "needs attention" : s.state === "current" ? "current step" : s.state}`}
              className="block w-full py-2"
            >
              <span
                className={cn(
                  "block h-1 rounded-full",
                  s.state === "done" && "bg-primary",
                  s.state === "current" && "bg-primary",
                  s.state === "todo" && "bg-outline-variant",
                  s.state === "attention" && "bg-warn",
                )}
              />
            </button>
          </li>
        ))}
      </ol>
      <p className="text-xs text-on-surface-variant">
        Step {current + 1} of {steps.length}
      </p>
    </nav>
  );
}
