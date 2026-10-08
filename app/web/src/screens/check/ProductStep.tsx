import { useCallback, useMemo, useState } from "react";
import { Droplets, Heater, QrCode, Waves, Wind, Zap } from "lucide-react";
import { CATEGORIES } from "@/config/catalog";
import { Button, TextField } from "@/components/m3";
import { recentModels } from "@/lib/store";
import type { CategoryId, Check } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScanDialog } from "./ScanDialog";

const ICONS: Record<CategoryId, typeof Heater> = { heater: Heater, purifier: Droplets, pump: Waves, stabilizer: Zap, chimney: Wind };

export function ProductStep({ check, update, notify }: { check: Check; update(p: Partial<Check["product"]>): void; notify(m: string): void }) {
  const [scanning, setScanning] = useState(false);
  const p = check.product;
  const cat = CATEGORIES.find((c) => c.id === p.categoryId);
  const models = useMemo(() => {
    if (!cat) return [];
    const recent = recentModels();
    const rank = (id: string) => (recent.includes(id) ? recent.indexOf(id) : 99);
    return [...cat.models].sort((a, b) => rank(a.id) - rank(b.id));
  }, [cat]);
  const recent = recentModels();

  const onSerial = useCallback(
    (serial: string) => {
      setScanning(false);
      update({ serial });
      notify(`Serial scanned: ${serial}`);
    },
    [update, notify],
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <h2 className="text-base font-medium text-on-surface">Product serial number</h2>
        <Button variant="filled" size="lg" icon={<QrCode className="h-5 w-5" />} onClick={() => setScanning(true)}>
          Scan product QR
        </Button>
        <TextField
          label="Serial number"
          required
          value={p.serial}
          onChange={(e) => update({ serial: e.target.value.toUpperCase().trimStart() })}
          autoCapitalize="characters"
          autoComplete="off"
          supporting="Scan the QR, or type the serial from the label"
        />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <h2 className="text-base font-medium text-on-surface">Product type</h2>
        <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
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
                  "state flex min-h-[88px] flex-col items-start justify-between gap-2 rounded-md border p-3 text-left",
                  sel ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant bg-surface-container-low text-on-surface",
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span className="text-sm font-medium leading-tight">{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {cat && (
        <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <h2 className="text-base font-medium text-on-surface">Model</h2>
          <ul role="radiogroup" aria-label="Model" className="overflow-hidden rounded-md bg-surface-container-low">
            {models.map((m) => {
              const sel = m.id === p.modelId;
              return (
                <li key={m.id} className="border-b border-outline-variant last:border-0">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => update({ modelId: m.id })}
                    className="state flex min-h-[56px] w-full items-center gap-4 px-4 text-left"
                  >
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", sel ? "border-primary" : "border-on-surface-variant")}>
                      {sel && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="flex-1 text-on-surface">{m.name}</span>
                    {recent.includes(m.id) && <span className="text-xs text-on-surface-variant">recent</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {scanning && <ScanDialog open onClose={() => setScanning(false)} onSerial={onSerial} />}
    </div>
  );
}
