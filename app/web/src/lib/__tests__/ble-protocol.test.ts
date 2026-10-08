import { describe, expect, it } from "vitest";
import { BLE_NAME, lineSplitter, parseMessage } from "@/lib/ble";
import { isSettled, judgeReading } from "@/lib/evaluate";
import type { Check, DeviceMessage } from "@/lib/types";

// Mirrors sendReading() in firmware/ssos_main/ssos_main.ino: printf-built JSON line ending in
// "\n", value "null" on a fault, then split into 20-byte BLE notifications.
const FW = { dev: "F294", fw: "0.4.0", chunk: 20 };
function firmwareLine(sensor: string, value: number | null, decimals: number, unit: string, status: string, extra = "") {
  const val = value === null ? "null" : value.toFixed(decimals);
  return `{"dev":"${FW.dev}","fw":"${FW.fw}","sensor":"${sensor}","value":${val},"unit":"${unit}","status":"${status}"${extra}}\n`;
}
function notifications(line: string): DataView[] {
  const bytes = new TextEncoder().encode(line);
  const out: DataView[] = [];
  for (let i = 0; i < bytes.length; i += FW.chunk) out.push(new DataView(bytes.slice(i, i + FW.chunk).buffer));
  return out;
}
function receive(lines: string[]): DeviceMessage[] {
  const got: DeviceMessage[] = [];
  const feed = lineSplitter((l) => {
    const m = parseMessage(l);
    if (m) got.push(m);
  });
  for (const l of lines) for (const n of notifications(l)) feed(n);
  return got;
}

describe("Bluetooth protocol with firmware/ssos_main", () => {
  it("uses the firmware's advertised name", () => {
    expect(BLE_NAME).toBe("SSOS_B1.0");
  });

  it("rejoins every sensor's message from 20-byte notifications", () => {
    const got = receive([
      firmwareLine("TEMP", 31.24, 2, "C", "settled"),
      firmwareLine("TDS", 58, 0, "ppm", "settled", ',"temp":25.3'),
      firmwareLine("VOLT", 231.4, 1, "V", "settled", ',"min":229.8,"max":232.6,"cal":false'),
      firmwareLine("PRESS", 2.45, 2, "bar", "settled"),
    ]);
    expect(got.map((m) => [m.sensor, m.value, m.unit, m.status])).toEqual([
      ["TEMP", 31.24, "C", "settled"],
      ["TDS", 58, "ppm", "settled"],
      ["VOLT", 231.4, "V", "settled"],
      ["PRESS", 2.45, "bar", "settled"],
    ]);
    expect(got[1].temp).toBe(25.3);
    expect([got[2].min, got[2].max, got[2].cal]).toEqual([229.8, 232.6, false]);
    expect(got.every((m) => m.dev === "F294" && m.fw === "0.4.0")).toBe(true);
  });

  it("handles a sensor fault (value null) and an unstable reading", () => {
    const [fault, unstable] = receive([firmwareLine("PRESS", null, 2, "bar", "fault"), firmwareLine("TDS", 640, 0, "ppm", "unstable")]);
    expect(fault.value).toBeNull();
    expect(fault.status).toBe("fault");
    expect(unstable.status).toBe("unstable");
  });

  it("feeds received readings straight into the verdicts", () => {
    const [volt] = receive([firmwareLine("VOLT", 221, 1, "V", "settled", ',"min":205.0,"max":226.0')]);
    const check = {
      id: "x", createdAt: "", brand: "b", technician: { name: "", mobile: "" },
      product: { serial: "S", categoryId: "heater", modelId: "heater-storage-15" },
      customer: { name: "", phone: "", address: "", notes: "" }, location: null, readings: {}, log: [], ph: null, step: 0,
    } as Check;
    const r = { ...volt, taken_at: new Date().toISOString() };
    expect(isSettled(r)).toBe(true);
    expect(judgeReading(check, r)!.verdict).toMatchObject({ level: "fail", side: "low", fix: "Voltage stabilizer" });
  });

  it("ignores garbage and keeps going", () => {
    const got = receive(["not json\n", firmwareLine("TEMP", 25, 2, "C", "settled")]);
    expect(got).toHaveLength(1);
  });
});
