import { useEffect, useRef, useState } from "react";
import { Bluetooth, BluetoothOff, CircleCheck, FlaskConical, LoaderCircle, TriangleAlert } from "lucide-react";
import { FIX_HINT, SENSOR_INFO } from "@/config/catalog";
import { PH_STEPS } from "@/config/limits";
import { Button, FilterChip } from "@/components/m3";
import { RangeBar, VerdictText } from "@/components/RangeBar";
import { BLE_NAME } from "@/lib/ble";
import { isSettled, judgePh, judgeReading, lsiFor, requiredSensors } from "@/lib/evaluate";
import { fmtValue } from "@/lib/format";
import type { Check, DeviceSensor } from "@/lib/types";
import type { useDevice } from "@/lib/useDevice";
import { cn } from "@/lib/utils";

type Device = ReturnType<typeof useDevice>;

// Guided, one reading at a time (UI plan U4): instruction → waiting → value with its range bar,
// then on to the next required reading. Unstable/fault must be re-taken (feature list Q17).
export function ReadingsStep({ check, device, setPh }: { check: Check; device: Device; setPh(ph: number | null): void }) {
  const required = requiredSensors(check);
  const pending = required.find((s) => !isSettled(check.readings[s])) ?? null;
  const [hold, setHold] = useState<DeviceSensor | null>(null);
  const lastSeen = useRef(check.log[0]?.taken_at);

  // A settled reading for the sensor on screen stays visible briefly, then the next one shows.
  const newest = check.log[0];
  useEffect(() => {
    if (!newest || newest.taken_at === lastSeen.current) return;
    lastSeen.current = newest.taken_at;
    if (isSettled(newest) && requiredSensors(check).includes(newest.sensor)) setHold(newest.sensor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);
  useEffect(() => {
    if (!hold) return;
    const t = setTimeout(() => setHold(null), 1800);
    return () => clearTimeout(t);
  }, [hold, newest]);

  const focus = hold ?? pending;
  const done = required.filter((s) => isSettled(check.readings[s])).length;
  const waterTest = required.includes("TDS");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <DeviceBar device={device} />

      {focus ? (
        <GuidedCard check={check} sensor={focus} index={required.indexOf(focus)} total={required.length} device={device} justSettled={hold === focus} />
      ) : (
        <div className="flex items-center gap-3 rounded-lg bg-ok-container p-4 text-on-ok-container">
          <CircleCheck className="h-6 w-6 shrink-0" aria-hidden />
          <p className="font-medium">All {required.length} readings taken. To re-take one, press its button on the device again.</p>
        </div>
      )}

      <section aria-label="Readings in this check" className="overflow-hidden rounded-md bg-surface-container-low">
        <h3 className="px-4 pt-3 text-sm font-medium text-on-surface-variant">
          Readings · {done} of {required.length}
        </h3>
        <ul>
          {required.map((s) => {
            const r = check.readings[s];
            const j = r && judgeReading(check, r);
            return (
              <li key={s} className="flex items-center gap-3 border-b border-outline-variant px-4 py-3 last:border-0">
                <span className="w-8 text-center text-xs font-medium text-on-surface-variant">#{SENSOR_INFO[s].button}</span>
                <span className="flex-1 text-on-surface">{SENSOR_INFO[s].label}</span>
                {!r ? (
                  <span className="text-sm text-on-surface-variant">to do</span>
                ) : r.status === "settled" && r.value !== null ? (
                  <span className="flex items-baseline gap-2">
                    <span className="font-medium tabnum">
                      {fmtValue(r)} {SENSOR_INFO[s].unit}
                    </span>
                    {j && <VerdictText level={j.verdict.level} text={j.verdict.text} />}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-warn">{r.status === "fault" ? "Sensor fault" : "Unstable"} · re-take</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {waterTest && !pending && <PhCard check={check} setPh={setPh} />}
    </div>
  );
}

function DeviceBar({ device }: { device: Device }) {
  const s = device.state;
  if (s.kind === "connected")
    return (
      <div className="flex items-center gap-3 rounded-md bg-surface-container-low px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-ok" aria-hidden />
        <p className="flex-1 text-sm text-on-surface">
          Connected to <b>{s.name}</b>
          {s.unit && <span className="text-on-surface-variant"> · unit {s.unit}</span>}
        </p>
        <Button variant="text" onClick={device.disconnect}>
          Disconnect
        </Button>
      </div>
    );
  if (s.kind === "simulating")
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-warn px-4 py-3">
        <FlaskConical className="h-5 w-5 shrink-0 text-warn" aria-hidden />
        <p className="flex-1 text-sm text-on-surface">
          <b>Simulated device</b> · training only; the report is marked so
        </p>
        <Button variant="text" onClick={device.stopSimulating}>
          Stop
        </Button>
      </div>
    );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-md bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" icon={<Bluetooth className="h-5 w-5" />} onClick={device.connect} disabled={!device.btAvailable || s.kind === "connecting"}>
          {s.kind === "connecting" ? "Connecting…" : "Connect device"}
        </Button>
        <Button variant="text" icon={<FlaskConical className="h-4 w-4" />} onClick={device.startSimulating}>
          Simulate
        </Button>
      </div>
      <p className="text-sm text-on-surface-variant">
        {device.btAvailable ? (
          <>Switch the device on, tap Connect and choose <b className="text-on-surface">{BLE_NAME}</b>.</>
        ) : (
          <span className="inline-flex gap-2">
            <BluetoothOff className="h-4 w-4 shrink-0" aria-hidden /> This browser can't use Bluetooth. Use Chrome on Android, or Bluefy on iPhone.
          </span>
        )}
      </p>
      {s.kind === "idle" && s.error && <p className="text-sm text-error">{s.error}</p>}
    </div>
  );
}

function GuidedCard({ check, sensor, index, total, device, justSettled }: { check: Check; sensor: DeviceSensor; index: number; total: number; device: Device; justSettled: boolean }) {
  const info = SENSOR_INFO[sensor];
  const r = check.readings[sensor];
  const j = r && justSettled ? judgeReading(check, r) : null;
  const bad = r && !justSettled && r.status !== "settled" ? r : null;
  const measuring = device.simMeasuring === sensor;

  return (
    <section aria-live="polite" className="rounded-xl bg-surface-container p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
        Reading {index + 1} of {total}
      </p>
      <h2 className="mt-1 text-2xl text-on-surface">{info.label}</h2>

      {j && r ? (
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[44px] font-medium leading-none text-on-surface tabnum">{fmtValue(r)}</span>
            <span className="text-lg text-on-surface-variant">{info.unit}</span>
            <span className="ml-auto">
              <VerdictText level={j.verdict.level} text={j.verdict.text} />
            </span>
          </div>
          {sensor === "VOLT" && r.min !== undefined && (
            <p className="mt-1 text-sm text-on-surface-variant tabnum">
              Range over 5 s: {r.min.toFixed(0)}–{r.max!.toFixed(0)} V
            </p>
          )}
          <RangeBar band={j.band} values={sensor === "VOLT" && r.min !== undefined ? [r.min, r.max!] : [r.value!]} level={j.verdict.level} unit={info.unit} />
          <p className="mt-3 text-sm text-on-surface-variant">{index + 1 < total ? "Next reading in a moment…" : "Done."}</p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-on-surface">{info.howTo}</p>
          {bad && (
            <div className="mt-4 flex gap-3 rounded-md bg-warn-container p-3 text-on-warn-container">
              <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
              <div className="text-sm">
                <p className="font-medium">{bad.status === "fault" ? "Sensor fault" : "The reading didn't settle"}: re-take it</p>
                <p className="mt-1">{FIX_HINT[sensor]} Then press {info.button} again.</p>
              </div>
            </div>
          )}
          <div className="mt-5 flex items-center gap-4">
            <span
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full text-2xl font-medium",
                measuring ? "bg-primary text-on-primary" : "bg-primary-container text-on-primary-container",
              )}
              aria-hidden
            >
              {measuring ? <LoaderCircle className="h-7 w-7 animate-spin motion-reduce:animate-none" /> : info.button}
            </span>
            <p className="text-sm text-on-surface-variant">
              {measuring ? "Measuring…" : device.state.kind === "connected" || device.state.kind === "simulating" ? `Waiting for button ${info.button} on the device…` : "Connect the device first."}
            </p>
          </div>
          {device.state.kind === "simulating" && (
            <Button variant="tonal" className="mt-4" icon={<FlaskConical className="h-4 w-4" />} onClick={() => device.simulatePress(sensor)} disabled={measuring}>
              Simulate pressing {info.button}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function PhCard({ check, setPh }: { check: Check; setPh(ph: number | null): void }) {
  const p = check.ph !== null ? judgePh(check.ph) : null;
  const lsi = lsiFor(check);
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-md bg-surface-container-low p-4">
      <div>
        <h3 className="text-base font-medium text-on-surface">pH from test strip <span className="font-normal text-on-surface-variant">(optional)</span></h3>
        <p className="text-sm text-on-surface-variant">Dip the strip in the same water, match the colour, pick the value.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip selected={check.ph === null} onClick={() => setPh(null)}>
          Not tested
        </FilterChip>
        {PH_STEPS.map((v) => (
          <FilterChip key={v} selected={check.ph === v} onClick={() => setPh(v)}>
            {v.toFixed(1)}
          </FilterChip>
        ))}
      </div>
      {p && check.ph !== null && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-on-surface">pH {check.ph.toFixed(1)}</span>
            <VerdictText level={p.verdict.level} text={p.verdict.text} />
          </div>
          <RangeBar band={p.band} values={[check.ph]} level={p.verdict.level} unit="" />
        </div>
      )}
      {lsi && (
        <p className="rounded-md bg-surface-container-highest p-3 text-sm text-on-surface">
          Water tendency (Langelier, estimate): <b>{lsi.label}</b> ({lsi.value >= 0 ? "+" : ""}
          {lsi.value.toFixed(1)}). Estimated from pH, TDS and {lsi.tempAssumed ? "an assumed 25 °C" : `${lsi.tempC.toFixed(0)} °C`} water.
        </p>
      )}
    </section>
  );
}
