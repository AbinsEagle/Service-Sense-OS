import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search, UserRound } from "lucide-react";
import { BRAND } from "@/config/brand";
import { category } from "@/config/catalog";
import { DeviceChip, DeviceControls } from "@/components/Device";
import { Button, IconButton, TopAppBar } from "@/components/m3";
import { ThemeButton } from "@/components/ThemeButton";
import { isSimulated, outcome } from "@/lib/evaluate";
import type { Check } from "@/lib/types";
import { deviceReady, type Device } from "@/lib/useDevice";
import { cn } from "@/lib/utils";

const STATUS_DOT = { ready: "bg-ok", addon: "bg-warn", notready: "bg-fail" } as const;

export function HomeScreen({
  technicianName,
  device,
  draft,
  history,
  onNew,
  onResume,
  onOpen,
  onProfile,
}: {
  technicianName: string;
  device: Device;
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
    <div className="min-h-svh pb-10">
      <TopAppBar
        title={BRAND.name}
        subtitle={technicianName}
        trailing={
          <>
            <DeviceChip device={device} />
            <ThemeButton />
            <IconButton label="Technician profile" onClick={onProfile}>
              <UserRound />
            </IconButton>
          </>
        }
      />
      <main className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-4">
        {!deviceReady(device) && (
          <section className="grid gap-3">
            <h2 className="text-[28px] leading-9 text-on-surface">Connect the device</h2>
            <DeviceControls device={device} />
            <button onClick={device.startSimulating} className="justify-self-start text-sm text-on-surface-variant underline-offset-4 hover:underline">
              No device? Use the simulator
            </button>
          </section>
        )}

        <section className="grid gap-3">
          {draft ? (
            <>
              <Button size="lg" onClick={onResume}>
                Continue check{draft.product.serial ? ` · ${draft.product.serial}` : ""}
              </Button>
              <Button variant="text" onClick={onNew} className="justify-self-center">
                Start a new check instead
              </Button>
            </>
          ) : (
            <Button size="lg" variant={deviceReady(device) ? "filled" : "tonal"} icon={<Plus className="h-5 w-5" />} onClick={onNew}>
              New site check
            </Button>
          )}
        </section>

        {history.length > 0 && (
          <section aria-label="Finished checks" className="grid grid-cols-[minmax(0,1fr)] gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-on-surface-variant">Recent checks</h2>
            </div>
            {history.length > 5 && (
              <label className="relative mb-2 block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" aria-hidden />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search serial or customer"
                  aria-label="Search checks"
                  className="h-12 w-full rounded-full bg-surface-container-high pl-12 pr-4 text-base text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary"
                />
              </label>
            )}
            <ul className="divide-y divide-outline-variant">
              {list.map((c) => {
                const o = outcome(c);
                return (
                  <li key={c.id}>
                    <button onClick={() => onOpen(c)} className="state -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-3 text-left">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[o.status])} aria-label={o.title} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-on-surface">
                          {c.product.serial}
                          {isSimulated(c) && <span className="ml-2 text-xs text-warn">training</span>}
                        </span>
                        <span className="block truncate text-sm text-on-surface-variant">
                          {category(c.product.categoryId)?.name} · {o.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-on-surface-variant">
                        {new Date(c.finishedAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            {list.length === 0 && <p className="py-6 text-center text-sm text-on-surface-variant">No check matches that search.</p>}
          </section>
        )}
      </main>
    </div>
  );
}
