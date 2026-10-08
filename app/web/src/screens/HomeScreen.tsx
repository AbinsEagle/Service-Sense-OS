import { useMemo, useState } from "react";
import { ChevronRight, ClipboardList, Plus, Search, UserRound } from "lucide-react";
import { BRAND } from "@/config/brand";
import { category, model } from "@/config/catalog";
import { IconButton, TopAppBar } from "@/components/m3";
import { isSimulated, outcome } from "@/lib/evaluate";
import type { Check } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_DOT = { ready: "bg-ok", addon: "bg-warn", notready: "bg-fail" } as const;
const STEP_NAMES = ["Product", "Customer", "Readings", "Result", "Share"];

export function HomeScreen({
  technicianName,
  draft,
  history,
  onNew,
  onResume,
  onOpen,
  onProfile,
}: {
  technicianName: string;
  draft: Check | null;
  history: Check[];
  onNew(): void;
  onResume(): void;
  onOpen(c: Check): void;
  onProfile(): void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? history.filter((c) => c.customer.name.toLowerCase().includes(t) || c.product.serial.toLowerCase().includes(t)) : history;
  }, [q, history]);

  return (
    <div className="min-h-svh pb-28">
      <TopAppBar
        title={BRAND.name}
        subtitle={`Site checks · ${technicianName}`}
        trailing={
          <IconButton label="Technician profile" onClick={onProfile}>
            <UserRound />
          </IconButton>
        }
      />
      <main className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-2xl gap-4 px-4 pt-2">
        {draft && (
          <button onClick={onResume} className="state flex items-center gap-4 rounded-md bg-primary-container p-4 text-left text-on-primary-container">
            <ClipboardList className="h-6 w-6 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Continue site check</span>
              <span className="block truncate text-sm opacity-90">
                {draft.customer.name || "New customer"} · step {Math.min(draft.step, 4) + 1} of 5, {STEP_NAMES[Math.min(draft.step, 4)]}
              </span>
            </span>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer or serial"
            aria-label="Search checks by customer or serial"
            className="h-14 w-full rounded-full bg-surface-container-high pl-12 pr-4 text-base text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary"
          />
        </div>

        <section aria-label="Finished checks">
          <h2 className="px-1 pb-2 text-sm font-medium text-on-surface-variant">Finished checks</h2>
          {list.length === 0 ? (
            <p className="rounded-md bg-surface-container-low px-4 py-8 text-center text-on-surface-variant">
              {history.length === 0 ? "No checks yet. Tap New site check to start." : "No check matches that search."}
            </p>
          ) : (
            <ul className="overflow-hidden rounded-md bg-surface-container-low">
              {list.map((c) => {
                const o = outcome(c);
                return (
                  <li key={c.id} className="border-b border-outline-variant last:border-0">
                    <button onClick={() => onOpen(c)} className="state flex w-full items-center gap-4 px-4 py-3 text-left">
                      <span className={cn("h-3 w-3 shrink-0 rounded-full", STATUS_DOT[o.status])} aria-label={o.title} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-on-surface">
                          {c.customer.name}
                          {isSimulated(c) && <span className="ml-2 text-xs font-normal text-warn">training</span>}
                        </span>
                        <span className="block truncate text-sm text-on-surface-variant">
                          {category(c.product.categoryId)?.name} · {model(c.product.categoryId, c.product.modelId)?.name} · {c.product.serial}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-on-surface-variant">
                        {new Date(c.finishedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <button
        onClick={onNew}
        className="state fixed bottom-6 right-4 z-30 inline-flex h-14 items-center gap-3 rounded-lg bg-primary-container pl-4 pr-5 font-medium text-on-primary-container shadow-e3 sm:right-[max(1rem,calc(50%-20rem))]"
      >
        <Plus className="h-6 w-6" aria-hidden />
        New site check
      </button>
    </div>
  );
}
