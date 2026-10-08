import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/config/catalog";
import { bandFor } from "@/config/limits";
import { judge, langelier, lsiFor, outcome } from "@/lib/evaluate";
import type { Check, DeviceSensor } from "@/lib/types";

const base: Check = {
  id: "x", createdAt: "", brand: "b", technician: { name: "t", mobile: "9876543210" },
  product: { serial: "S1", categoryId: "heater", modelId: "heater-storage-15" },
  customer: { name: "c", phone: "9876543210", address: "", notes: "" },
  location: null, readings: {}, log: [], ph: null, step: 0,
};
const rd = (sensor: DeviceSensor, value: number, extra: object = {}) =>
  ({ dev: "F294", fw: "0.4.0", sensor, value, unit: "", status: "settled" as const, taken_at: "", ...extra });

describe("Langelier index (Carrier)", () => {
  it("matches the formula with the TDS-based hardness/alkalinity estimate", () => {
    const tds = 320, t = 25, h = 0.4 * tds;
    const pHs = 9.3 + (Math.log10(tds) - 1) / 10 + (-13.12 * Math.log10(t + 273) + 34.55) - (Math.log10(h) - 0.4 + Math.log10(h));
    expect(langelier(7.5, tds, t)!.value).toBeCloseTo(7.5 - pHs, 6);
  });
  it("labels soft acidic water corrosive and hard alkaline hot water scale-forming", () => {
    expect(langelier(6.0, 60, 28)!.label).toBe("Corrosive");
    expect(langelier(8.5, 900, 60)!.label).toBe("Scale-forming");
  });
  it("assumes 25 °C when the TDS reading has no water temperature", () => {
    expect(langelier(7, 300, undefined)!.tempAssumed).toBe(true);
  });
});

describe("verdicts", () => {
  const V = bandFor("heater", null, "VOLT")!;
  it("supply voltage bands: 230 V ±6% ok, ±10% warn, beyond fail, extreme critical", () => {
    expect(judge(230, V).level).toBe("ok");
    expect(judge(212, V)).toMatchObject({ level: "warn", side: "low", fix: "Voltage stabilizer" });
    expect(judge(200, V).level).toBe("fail");
    expect(judge(150, V).level).toBe("critical");
  });
  it("stabilizers are judged against the model's own working range", () => {
    const m = CATEGORIES.find((c) => c.id === "stabilizer")!.models[0]; // 130–280 V
    const B = bandFor("stabilizer", m, "VOLT")!;
    expect(judge(200, B).level).toBe("ok");
    expect(judge(135, B).level).toBe("warn");
    expect(judge(120, B).level).toBe("critical");
  });
  it("purifier TDS follows IS 10500 (500 acceptable, 2000 permissible)", () => {
    const P = bandFor("purifier", null, "TDS")!;
    expect(judge(400, P).level).toBe("ok");
    expect(judge(900, P).level).toBe("warn");
    expect(judge(2500, P).level).toBe("critical");
  });
});

describe("site status", () => {
  it("all OK → ready", () => {
    expect(outcome({ ...base, readings: { TDS: rd("TDS", 200), PRESS: rd("PRESS", 2), VOLT: rd("VOLT", 230, { min: 228, max: 232 }) } }).status).toBe("ready");
  });
  it("fixable problems → ready with add-on, one add-on per fix, voltage judged on its dip", () => {
    const o = outcome({ ...base, readings: { TDS: rd("TDS", 450), PRESS: rd("PRESS", 0.6), VOLT: rd("VOLT", 225, { min: 205, max: 231 }) } });
    expect(o.status).toBe("addon");
    expect(o.addons.sort()).toEqual(["Booster pump", "Voltage stabilizer", "Water softener / scale guard"]);
    expect(o.reasons).toContain("Low supply voltage: dips to 205 V");
  });
  it("a dip no stabilizer can fix → not ready", () => {
    expect(outcome({ ...base, readings: { TDS: rd("TDS", 200), PRESS: rd("PRESS", 2), VOLT: rd("VOLT", 220, { min: 150, max: 230 }) } }).status).toBe("notready");
  });
  it("a stabilizer near its range edge is a caution, not an add-on", () => {
    const m = CATEGORIES.find((c) => c.id === "stabilizer")!.models[0];
    const o = outcome({ ...base, product: { serial: "S", categoryId: "stabilizer", modelId: m.id }, readings: { VOLT: rd("VOLT", 180, { min: 135, max: 200 }) } });
    expect(o.status).toBe("ready");
    expect(o.reasons.length).toBe(1);
  });
});

describe("temperature and sound (Q25)", () => {
  it("each category asks for temperature or sound where it fits", () => {
    const r = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.readings]));
    expect(r.heater).toContain("TEMP");
    expect(r.purifier).toContain("TEMP");
    for (const id of ["pump", "stabilizer", "chimney"]) expect(r[id]).toContain("SOUND");
  });
  it("background noise above 60 dB is a caution only, never blocking", () => {
    const m = CATEGORIES.find((c) => c.id === "chimney")!.models[0];
    const o = outcome({ ...base, product: { serial: "S", categoryId: "chimney", modelId: m.id }, readings: { VOLT: rd("VOLT", 230, { min: 229, max: 231 }), SOUND: { ...rd("VOLT", 78), sensor: "SOUND" } } });
    expect(o.status).toBe("ready");
    expect(o.reasons).toEqual(["Slightly high background noise: 78 dB"]);
  });
  it("inlet water temperature uses the provisional heater range", () => {
    const T = bandFor("heater", null, "TEMP")!;
    expect(judge(28, T).level).toBe("ok");
    expect(judge(43, T).level).toBe("warn");
    expect(T.provisional).toBe(true);
  });
  it("Langelier prefers the measured water temperature", () => {
    const c: Check = { ...base, ph: 7.5, readings: { TDS: rd("TDS", 300, { temp: 25 }), TEMP: rd("TEMP", 45) } };
    expect(lsiFor(c)!.tempC).toBe(45);
  });
});
