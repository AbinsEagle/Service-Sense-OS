import { useEffect, useRef, useState } from "react";
import { Check as CheckIcon, FlaskConical, LoaderCircle, Mic, Minus, Plus } from "lucide-react";
import { FIX_HINT, SENSOR_INFO } from "@/config/catalog";
import { PH_STEPS } from "@/config/limits";
import { DeviceControls } from "@/components/Device";
import { Button } from "@/components/m3";
import { RangeBar, VerdictText } from "@/components/RangeBar";
import { isDone, judgePh, judgeReading, lsiFor, requiredSensors, unstableVoltTries } from "@/lib/evaluate";
import { fmtValue } from "@/lib/format";
import { simulateSound } from "@/lib/simulator";
import { measureSound } from "@/lib/sound";
import type { Check, DeviceSensor, Reading, Sensor } from "@/lib/types";
import { deviceReady, type Device } from "@/lib/useDevice";
import { cn } from "@/lib/utils";

const SHORT: Record<Sensor, string> = { TEMP: "Temp", TDS: "TDS", VOLT: "Voltage", PRESS: "Pressure", SOUND: "Sound" };

// Guided, one reading at a time (UI plan U4): what to do → waiting → the value with its
// range bar, then on to the next. Unstable or fault must be re-taken (feature list Q17).
export function ReadingsStep({ check, device, setPh, addReading }: { check: Check; device: Device; setPh(ph: number | null): void; addReading(r: Reading): void }) {
  const required = requiredSensors(check);
  const pending = required.find((s) => !isDone(check, check.readings[s])) ?? null;
  const [hold, setHold] = useState<Sensor | null>(null);
  const lastSeen = useRef(check.log[0]?.taken_at);

  // A settled reading for the sensor on screen stays visible briefly, then the next one shows.
  const newest = check.log[0];
  useEffect(() => {
    if (!newest || newest.taken_at === lastSeen.current) return;
    lastSeen.current = newest.taken_at;
    if (isDone(check, newest) && requiredSensors(check).includes(newest.sensor)) setHold(newest.sensor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);
  useEffect(() => {
    if (!hold) return;
    const t = setTimeout(() => setHold(null), 1800);
    return () => clearTimeout(t);
  }, [hold, newest]);

  const focus = hold ?? pending;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <ol className={cn("flex", required.length > 3 ? "gap-1.5" : "gap-2")} aria-label="Readings in this check">
        {required.map((s) => {
          const r = check.readings[s];
          const ok = isDone(check, r);
          const bad = r && !ok;
          return (
            <li
              key={s}
              className={cn(
                "flex min-w-0 flex-1 flex-col rounded-sm py-2",
                required.length > 3 ? "px-2" : "px-3",
                s === focus ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-low text-on-surface-variant",
              )}
            >
              <span className="flex items-center gap-1 text-xs font-medium">
                {ok && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-ok" strokeWidth={3} aria-hidden />}
                {SHORT[s]}
              </span>
              <span className={cn("truncate tabnum", required.length > 3 ? "text-[13px]" : "text-sm", bad && "text-warn", ok && "text-on-surface")}>
                {ok ? `${fmtValue(r!)} ${SENSOR_INFO[s].unit}` : bad ? "re-take" : "–"}
              </span>
            </li>
          );
        })}
      </ol>

      {focus === "SOUND" && hold !== "SOUND" ? (
        <SoundFocus check={check} simulating={device.state.kind === "simulating"} addReading={addReading} />
      ) : focus ? (
        <Focus check={check} sensor={focus} device={device} justSettled={hold === focus} />
      ) : (
        <AllDone check={check} setPh={setPh} />
      )}
    </div>
  );
}

function Focus({ check, sensor, device, justSettled }: { check: Check; sensor: Sensor; device: Device; justSettled: boolean }) {
  const info = SENSOR_INFO[sensor];
  const r = check.readings[sensor];
  const j = r && justSettled ? judgeReading(check, r) : null;
  const bad = r && !justSettled && !isDone(check, r);
  const voltRetake = sensor === "VOLT" && r?.status === "unstable" && unstableVoltTries(check) === 1;
  const measuring = device.simMeasuring === sensor;
  const press = sensor as DeviceSensor; // the waiting state is only reached for device sensors

  return (
    <section aria-live="polite" className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h2 className="text-[28px] leading-9 text-on-surface">{info.label}</h2>

      {j && r ? (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[56px] font-light leading-none text-on-surface tabnum">{fmtValue(r)}</span>
            <span className="text-xl text-on-surface-variant">{info.unit}</span>
            <span className="ml-auto">
              <VerdictText level={j.verdict.level} text={j.verdict.text} />
            </span>
          </div>
          {sensor === "VOLT" && r.min !== undefined && (
            <p className="mt-1 text-sm text-on-surface-variant tabnum">
              {r.min.toFixed(0)}–{r.max!.toFixed(0)} V during the measurement
            </p>
          )}
          <RangeBar band={j.band} values={sensor === "VOLT" && r.min !== undefined ? [r.min, r.max!] : [r.value!]} level={j.verdict.level} unit={info.unit} />
        </div>
      ) : !deviceReady(device) ? (
        <DeviceControls device={device} />
      ) : (
        <>
          <div className="flex items-center gap-5">
            <span
              className={cn(
                "flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-medium",
                measuring ? "bg-primary text-on-primary" : "bg-primary-container text-on-primary-container",
                !measuring && "animate-[pulse_2.5s_ease-in-out_infinite] motion-reduce:animate-none",
              )}
              aria-hidden
            >
              {measuring ? <LoaderCircle className="h-8 w-8 animate-spin motion-reduce:animate-none" /> : info.button}
            </span>
            <p className="text-lg text-on-surface">{measuring ? "Measuring…" : `Press ${info.button} on the device`}</p>
          </div>
          <p className="text-on-surface-variant">
            {voltRetake ? (
              <span className="text-warn">The supply varied during the measurement. Press 3 again to re-take; if it varies again it's recorded as a fluctuating supply.</span>
            ) : bad ? (
              <span className="text-warn">
                {r!.status === "fault" ? "Sensor fault. " : "Didn't settle. "}
                {FIX_HINT[sensor]}
              </span>
            ) : (
              info.howTo
            )}
          </p>
          {device.state.kind === "simulating" && (
            <Button variant="text" className="justify-self-start" icon={<FlaskConical className="h-4 w-4" />} onClick={() => device.simulatePress(press)} disabled={measuring}>
              Simulate press {info.button}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

// Sound is measured with the phone's microphone (feature list Q25), not the device.
function SoundFocus({ check, simulating, addReading }: { check: Check; simulating: boolean; addReading(r: Reading): void }) {
  const info = SENSOR_INFO.SOUND;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prior = check.readings.SOUND;
  const take = async () => {
    setBusy(true);
    setError(null);
    try {
      const db = simulating ? await new Promise<number>((res) => setTimeout(() => res(simulateSound()), 1500)) : await measureSound(5000);
      addReading({ dev: simulating ? "DEMO" : "PHONE", fw: "app", sensor: "SOUND", value: db, unit: "dB", status: "settled", taken_at: new Date().toISOString() });
    } catch {
      setError(FIX_HINT.SOUND);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-live="polite" className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h2 className="text-[28px] leading-9 text-on-surface">{info.label}</h2>
      <div className="flex items-center gap-5">
        <button
          onClick={take}
          disabled={busy}
          aria-label="Measure sound level"
          className={cn("state flex h-20 w-20 shrink-0 items-center justify-center rounded-full", busy ? "bg-primary text-on-primary" : "bg-primary-container text-on-primary-container")}
        >
          {busy ? <LoaderCircle className="h-8 w-8 animate-spin motion-reduce:animate-none" /> : <Mic className="h-8 w-8" />}
        </button>
        <p className="text-lg text-on-surface">{busy ? "Listening for 5 seconds…" : "Tap to measure"}</p>
      </div>
      <p className="text-on-surface-variant">{error ? <span className="text-warn">{error}</span> : info.howTo}</p>
      {prior && !busy && <p className="text-sm text-on-surface-variant">Uses this phone's microphone; the value is an estimate.</p>}
    </section>
  );
}

function AllDone({ check, setPh }: { check: Check; setPh(ph: number | null): void }) {
  const water = requiredSensors(check).includes("TDS");
  const ph = check.ph;
  const lsi = lsiFor(check);
  const step = (dir: 1 | -1) => {
    if (ph === null) return setPh(7);
    const i = PH_STEPS.indexOf(ph) + dir;
    if (i >= 0 && i < PH_STEPS.length) setPh(PH_STEPS[i]);
  };
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ok-container text-on-ok-container">
          <CheckIcon className="h-5 w-5" strokeWidth={3} aria-hidden />
        </span>
        <p className="text-lg text-on-surface">All readings taken</p>
      </div>
      <p className="-mt-3 text-sm text-on-surface-variant">To re-take one, press its button on the device again.</p>

      {water && (
        <div className="grid gap-2 border-t border-outline-variant pt-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-on-surface">pH test strip</p>
              <p className="text-xs text-on-surface-variant">Optional</p>
            </div>
            <button onClick={() => step(-1)} disabled={ph === null || ph === PH_STEPS[0]} aria-label="Lower pH" className="state flex h-11 w-11 items-center justify-center rounded-full border border-outline text-on-surface disabled:opacity-30">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-14 text-center text-xl text-on-surface tabnum" aria-live="polite">
              {ph === null ? "–" : ph.toFixed(1)}
            </span>
            <button onClick={() => step(1)} disabled={ph === PH_STEPS[PH_STEPS.length - 1]} aria-label="Higher pH" className="state flex h-11 w-11 items-center justify-center rounded-full border border-outline text-on-surface disabled:opacity-30">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {ph !== null && (
            <div className="flex items-center justify-between text-sm">
              <VerdictText level={judgePh(ph).verdict.level} text={judgePh(ph).verdict.text} />
              <span className="text-on-surface-variant">{lsi ? `${lsi.label} water (estimate)` : ""}</span>
              <button onClick={() => setPh(null)} className="text-primary">
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
