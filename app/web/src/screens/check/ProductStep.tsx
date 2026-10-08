import { useCallback, useMemo, useState } from "react";
import { Droplets, Heater, ScanLine, Waves, Wind, Zap } from "lucide-react";
import { CATEGORIES } from "@/config/catalog";
import { recentModels } from "@/lib/store";
import type { CategoryId, Check, GeoFix } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LocationField } from "./LocationField";
import { ScanDialog } from "./ScanDialog";

const ICONS: Record<CategoryId, typeof Heater> = { heater: Heater, purifier: Droplets, pump: Waves, stabilizer: Zap, chimney: Wind };

export function ProductStep({
  check,
  update,
  setLocation,
  notify,
}: {
  check: Check;
  update(p: Partial<Check["product"]>): void;
  setLocation(g: GeoFix | null): void;
  notify(m: string): void;
}) {
  const [scanning, setScanning] = useState(false);
  const p = check.product;
  const cat = CATEGORIES.find((c) => c.id === p.categoryId);
  const recent = recentModels();
  const models = useMemo(() => {
    if (!cat) return [];
    const rank = (id: string) => (recent.includes(id) ? recent.indexOf(id) : 99);
    return [...cat.models].sort((a, b) => rank(a.id) - rank(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  const onSerial = useCallback(
    (serial: string) => {
      setScanning(false);
      update({ serial });
      notify(`Serial scanned: ${serial}`);
    },
    [update, notify],
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <Section title="Serial number">
        <div className="flex items-center gap-2">
          <input
            aria-label="Serial number"
            value={p.serial}
            onChange={(e) => update({ serial: e.target.value.toUpperCase().trimStart() })}
            placeholder="Scan or type"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-14 min-w-0 flex-1 rounded-xs border border-outline bg-transparent px-4 text-lg tracking-wide text-on-surface outline-none placeholder:text-base placeholder:tracking-normal placeholder:text-on-surface-variant focus:border-2 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setScanning(true)}
            aria-label="Scan product QR"
            className="state inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary"
          >
            <ScanLine className="h-6 w-6" />
          </button>
        </div>
      </Section>

      <Section title="Product">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const Icon = ICONS[c.id];
            const sel = c.id === p.categoryId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={sel}
                onClick={() => update({ categoryId: c.id, modelId: sel ? p.modelId : null })}
                className={cn(
                  "state inline-flex h-11 items-center gap-2 rounded-sm border px-3 text-sm font-medium",
                  sel ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface",
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {c.name}
              </button>
            );
          })}
        </div>
      </Section>

      {cat && (
        <Section title="Model">
          <ul role="radiogroup" aria-label="Model" className="-mx-2 divide-y divide-outline-variant">
            {models.map((m) => {
              const sel = m.id === p.modelId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => update({ modelId: m.id })}
                    className="state flex min-h-[52px] w-full items-center gap-4 rounded-xs px-2 text-left"
                  >
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", sel ? "border-primary" : "border-on-surface-variant")}>
                      {sel && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="flex-1 text-on-surface">{m.name}</span>
                    {recent.includes(m.id) && <span className="text-xs text-on-surface-variant">recent</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Site location">
        <LocationField value={check.location} onChange={setLocation} />
      </Section>

      {scanning && <ScanDialog open onClose={() => setScanning(false)} onSerial={onSerial} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <h2 className="text-sm font-medium text-on-surface-variant">{title}</h2>
      {children}
    </section>
  );
}
