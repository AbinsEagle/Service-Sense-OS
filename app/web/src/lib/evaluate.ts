import { SIMULATED_DEV } from "./simulator";
import { category, model, SENSOR_INFO } from "@/config/catalog";
import { bandFor, LSI_BANDS, LSI_RATIOS, PH_BAND, type Band } from "@/config/limits";
import type { Check, Reading, Sensor } from "./types";

export type Level = "ok" | "warn" | "fail" | "critical";
export interface Verdict {
  level: Level;
  side: "low" | "high" | null;
  text: string; // "OK", "Low", "High", "Too low", ...
  fix?: string;
}

const outside = (v: number, lo?: number, hi?: number): "low" | "high" | null =>
  lo !== undefined && v < lo ? "low" : hi !== undefined && v > hi ? "high" : null;

export function judge(value: number, band: Band): Verdict {
  const crit = outside(value, band.critLow, band.critHigh);
  if (crit) return { level: "critical", side: crit, text: crit === "low" ? "Too low" : "Too high" };
  const fail = outside(value, band.warnLow, band.warnHigh);
  const fixFor = (side: "low" | "high") => (side === "low" ? band.fixLow : band.fixHigh);
  if (fail) return { level: "fail", side: fail, text: fail === "low" ? "Low" : "High", fix: fixFor(fail) };
  const warn = outside(value, band.okLow, band.okHigh);
  if (warn) return { level: "warn", side: warn, text: warn === "low" ? "Slightly low" : "Slightly high", fix: fixFor(warn) };
  return { level: "ok", side: null, text: "OK" };
}

// Voltage is judged on its worst moment in the measuring window (firmware: 4 s now, 5 s planned, Q16): the dip or the peak.
export function judgeReading(check: Check, r: Reading): { band: Band; verdict: Verdict } | null {
  const cat = check.product.categoryId;
  const fluctuating = acceptedFluctuation(check, r);
  if (!cat || r.value === null || (r.status !== "settled" && !fluctuating)) return null;
  const band = bandFor(cat, model(cat, check.product.modelId), r.sensor);
  if (!band) return null;
  if (r.sensor === "VOLT" && r.min !== undefined && r.max !== undefined) {
    const low = judge(r.min, band);
    const high = judge(r.max, band);
    const rank: Record<Level, number> = { ok: 0, warn: 1, fail: 2, critical: 3 };
    const worst = rank[high.level] > rank[low.level] ? high : low;
    // A supply that kept fluctuating is itself a finding: at least a caution, fixed by a stabilizer (Q27).
    if (fluctuating && rank[worst.level] < rank.fail && band.fixLow)
      return { band, verdict: { level: "warn", side: worst.side, text: "Fluctuating", fix: band.fixLow } };
    return { band, verdict: worst };
  }
  return { band, verdict: judge(r.value, band) };
}

export function requiredSensors(check: Check): Sensor[] {
  return category(check.product.categoryId)?.readings ?? [];
}

export const isSettled = (r: Reading | undefined) => r !== undefined && r.status === "settled" && r.value !== null;

// Voltage that is "unstable" means the supply itself varied during the measurement, not a probe
// problem. One re-take is asked for; unstable again → accepted as a fluctuating supply (Q27).
export const VOLT_UNSTABLE_TRIES = 2;
export function unstableVoltTries(check: Check): number {
  let n = 0;
  for (const r of check.log) {
    if (r.sensor !== "VOLT") continue;
    if (r.status !== "unstable" || r.value === null) break;
    n++;
  }
  return n;
}
export function acceptedFluctuation(check: Check, r: Reading | undefined): boolean {
  return r?.sensor === "VOLT" && r.status === "unstable" && r.value !== null && check.readings.VOLT === r && unstableVoltTries(check) >= VOLT_UNSTABLE_TRIES;
}
// A required reading is done when it settled, or is an accepted fluctuating voltage.
export const isDone = (check: Check, r: Reading | undefined) => isSettled(r) || acceptedFluctuation(check, r);

export type SiteStatus = "ready" | "addon" | "notready";
export interface Outcome {
  status: SiteStatus;
  title: string;
  reasons: string[]; // one line per reading that isn't OK
  addons: string[];
}

const fmt = (sensor: Sensor, v: number) =>
  `${sensor === "PRESS" ? v.toFixed(2) : sensor === "TEMP" ? v.toFixed(1) : v.toFixed(0)} ${SENSOR_INFO[sensor].unit}`;

export function reasonLine(r: Reading, v: Verdict): string {
  const label = { TEMP: "water temperature", TDS: "TDS", VOLT: "supply voltage", PRESS: "inlet pressure", SOUND: "background noise" }[r.sensor];
  const shown = r.sensor === "VOLT" && r.min !== undefined && r.max !== undefined
    ? v.text === "Fluctuating" ? `${r.min.toFixed(0)}–${r.max.toFixed(0)} V` : v.side === "low" ? `dips to ${fmt("VOLT", r.min)}` : v.side === "high" ? `peaks at ${fmt("VOLT", r.max)}` : fmt("VOLT", r.value!)
    : fmt(r.sensor, r.value!);
  return `${v.text} ${label}: ${shown}`;
}

export function outcome(check: Check): Outcome {
  const reasons: string[] = [];
  const addons = new Set<string>();
  let worst: SiteStatus = "ready";
  for (const s of requiredSensors(check)) {
    const r = check.readings[s];
    if (!r) continue;
    const j = judgeReading(check, r);
    if (!j || j.verdict.level === "ok") continue;
    reasons.push(reasonLine(r, j.verdict));
    // critical, or a clear failure no add-on fixes → not ready; an add-on fix → ready with add-on;
    // a slight deviation with no add-on (e.g. near a stabilizer's range edge) is listed as a caution only.
    if (j.verdict.level === "critical" || (j.verdict.level === "fail" && !j.verdict.fix)) worst = "notready";
    else if (j.verdict.fix) {
      addons.add(j.verdict.fix);
      if (worst === "ready") worst = "addon";
    }
  }
  const title = { ready: "Ready to install", addon: "Ready with add-on", notready: "Not ready" }[worst];
  return { status: worst, title, reasons, addons: [...addons] };
}

export function judgePh(ph: number) {
  return { band: PH_BAND, verdict: judge(ph, PH_BAND) };
}

// Langelier saturation index, Carrier method (feature list Q20).
export interface Lsi {
  value: number;
  label: "Scale-forming" | "Balanced" | "Corrosive";
  tempC: number;
  tempAssumed: boolean;
}

export function langelier(ph: number, tds: number, tempC: number | undefined): Lsi | null {
  if (!(tds > 0)) return null;
  const t = tempC ?? 25;
  const hardness = Math.max(tds * LSI_RATIOS.hardnessPerTds, 1);
  const alkalinity = Math.max(tds * LSI_RATIOS.alkalinityPerTds, 1);
  const A = (Math.log10(tds) - 1) / 10;
  const B = -13.12 * Math.log10(t + 273) + 34.55;
  const C = Math.log10(hardness) - 0.4;
  const D = Math.log10(alkalinity);
  const value = ph - (9.3 + A + B - (C + D));
  const label = value < LSI_BANDS.corrosiveBelow ? "Corrosive" : value > LSI_BANDS.scalingAbove ? "Scale-forming" : "Balanced";
  return { value, label, tempC: t, tempAssumed: tempC === undefined };
}

export function lsiFor(check: Check): Lsi | null {
  const tds = check.readings.TDS;
  if (check.ph === null || !tds || !isSettled(tds) || !requiredSensors(check).includes("TDS")) return null;
  // Prefer the measured water temperature; fall back to the one the TDS reading carries.
  const temp = check.readings.TEMP;
  return langelier(check.ph, tds.value!, isSettled(temp) ? temp!.value! : tds.temp);
}

// Simulated readings make a training-only check (its report is stamped so).
export const isSimulated = (check: Check) => Object.values(check.readings).some((r) => r?.dev === SIMULATED_DEV);
