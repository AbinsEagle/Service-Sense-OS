import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, FlaskConical, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DevicePanel } from "@/components/DevicePanel";
import { ReadingTile, StatusChip } from "@/components/ReadingTile";
import { formatValue } from "@/lib/format";
import { Wordmark } from "@/components/Wordmark";
import { VisitForm } from "@/components/VisitForm";
import { bluetoothAvailable, connectDevice, type Connection } from "@/lib/ble";
import { simulate } from "@/lib/simulator";
import { measureSound } from "@/lib/sound";
import { SENSORS, type DeviceSensor } from "@/lib/types";
import { toReading, useVisit } from "@/lib/visit";
import { cn } from "@/lib/utils";

// Stage 1: everything stays on this phone. Sign-in and saving to a server
// (backend/, Supabase) come in the next stage.
export default function App() {
  return <VisitScreen />;
}

function VisitScreen() {
  const { visit, setVisit, addReading, reset } = useVisit();
  const conn = useRef<Connection | null>(null);
  const leaving = useRef(false); // true while we disconnect on purpose
  const [device, setDevice] = useState<{ name: string; unit?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [simulating, setSimulating] = useState(!bluetoothAvailable());
  const [bleError, setBleError] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const saved = Boolean(visit.savedAt); // "finished": locked, kept on this phone

  useEffect(() => () => conn.current?.disconnect(), []);

  const connect = async () => {
    setBleError(null);
    setConnecting(true);
    try {
      conn.current = await connectDevice(
        (m) => {
          addReading(toReading(m));
          setDevice((d) => (d ? { ...d, unit: m.dev } : d));
        },
        () => {
          conn.current = null;
          setDevice(null);
          if (!leaving.current) setBleError("The device disconnected. Readings taken so far are kept.");
          leaving.current = false;
        },
      );
      setDevice({ name: conn.current.name });
    } catch (e) {
      const err = e as Error;
      if (err.name !== "NotFoundError") setBleError(`Couldn't connect: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const takeSound = async () => {
    setSoundError(null);
    setMeasuring(true);
    try {
      const db = await measureSound(3000);
      addReading({ sensor: "SOUND", value: db, unit: "dB", taken_at: new Date().toISOString() });
    } catch {
      setSoundError("Microphone not available. Allow microphone access and try again.");
    } finally {
      setMeasuring(false);
    }
  };

  const readings = SENSORS.map((s) => visit.latest[s.key]).filter((r) => r !== undefined);
  const missingName = !visit.customer.name.trim();
  const finish = () => setVisit((v) => ({ ...v, savedAt: new Date().toISOString() }));

  return (
    <div className="min-h-svh pb-32 lg:pb-10">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Wordmark />
          <span className="ml-auto text-sm text-muted-foreground">Kept on this phone</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Visit · started {new Date(visit.startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <h1 className="text-2xl font-semibold">{visit.customer.name.trim() || "New site visit"}</h1>
            </div>
            <span className="font-mono text-sm text-muted-foreground">{readings.length}/5 readings</span>
          </div>

          {saved && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-settled/40 bg-settled/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-settled" aria-hidden />
              <p className="mr-auto">
                Finished at {new Date(visit.savedAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                <span className="ml-2 font-mono text-xs text-muted-foreground">ref {visit.id.slice(0, 8)}</span>
              </p>
              <Button onClick={reset}>Start next visit</Button>
            </div>
          )}

          {!saved && (
            <DevicePanel
              connected={device}
              connecting={connecting}
              simulating={simulating}
              btAvailable={bluetoothAvailable()}
              error={bleError}
              onConnect={connect}
              onDisconnect={() => {
                leaving.current = true;
                conn.current?.disconnect();
              }}
              onSimulate={(on) => {
                if (on && conn.current) {
                  leaving.current = true;
                  conn.current.disconnect();
                }
                setSimulating(on);
              }}
            />
          )}

          <div className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2">
            {SENSORS.map((s) => (
              <ReadingTile
                key={s.key}
                sensor={s.key}
                label={s.label}
                unit={s.unit}
                button={s.button}
                reading={visit.latest[s.key]}
                className={s.key === "SOUND" ? "min-[340px]:col-span-2" : undefined}
                action={
                  saved ? null : s.key === "SOUND" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={takeSound} disabled={measuring}>
                        <Mic className={cn("mr-2 h-4 w-4", measuring && "animate-pulse text-fault")} aria-hidden />
                        {measuring ? "Listening for 3 s…" : visit.latest.SOUND ? "Measure again" : "Measure (3 s)"}
                      </Button>
                      {soundError && <p className="mt-2 text-sm text-fault">{soundError}</p>}
                    </>
                  ) : simulating ? (
                    <Button variant="ghost" size="sm" className="-ml-2 text-unstable" onClick={() => addReading(toReading(simulate(s.key as DeviceSensor)))}>
                      <FlaskConical className="mr-2 h-4 w-4" aria-hidden />
                      Simulate
                    </Button>
                  ) : null
                }
              />
            ))}
          </div>

          {visit.log.length > 0 && (
            <section className="rounded-md border bg-card">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                onClick={() => setLogOpen((o) => !o)}
                aria-expanded={logOpen}
              >
                Everything received ({visit.log.length})
                <ChevronDown className={cn("h-4 w-4 transition-transform", logOpen && "rotate-180")} aria-hidden />
              </button>
              {logOpen && (
                <ol className="divide-y border-t text-sm">
                  {visit.log.map((r, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2">
                      <time className="w-12 font-mono text-xs text-muted-foreground">
                        {new Date(r.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                      <span className="w-14 font-mono text-xs">{r.sensor}</span>
                      <span className="tabnum font-mono">
                        {formatValue(r)} {r.value !== null && r.unit}
                      </span>
                      <span className="ml-auto">{r.status && <StatusChip status={r.status} />}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="border-t px-4 py-2 text-xs text-muted-foreground">Only the latest reading of each sensor is saved.</p>
            </section>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-20">
          <VisitForm visit={visit} disabled={saved} onChange={(patch) => setVisit((v) => ({ ...v, ...patch }))} />
          {!saved && (
            <FinishBar missingName={missingName} count={readings.length} onFinish={finish} />
          )}
        </aside>
      </main>
    </div>
  );
}

function FinishBar({ missingName, count, onFinish }: { missingName: boolean; count: number; onFinish(): void }) {
  const blocker = missingName ? "Add the customer name to finish." : count === 0 ? "Take at least one reading to finish." : null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:rounded-md lg:border lg:bg-card lg:p-4">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <p className="mr-auto text-sm text-muted-foreground">{blocker ?? `${count} reading${count === 1 ? "" : "s"} ready`}</p>
        <Button
          size="lg"
          className="h-12 px-6 text-base disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
          onClick={onFinish}
          disabled={Boolean(blocker)}
        >
          Finish visit
        </Button>
      </div>
    </div>
  );
}
