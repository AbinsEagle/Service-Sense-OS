import type { DeviceMessage, DeviceSensor } from "./types";

// Stand-in for the device, for demos and training when no hardware is near.
export const SIMULATED_DEV = "DEMO"; // unit id on simulated readings; reports with them are stamped "training only"

const r = (lo: number, hi: number, d = 1) => +(lo + Math.random() * (hi - lo)).toFixed(d);

export function simulate(sensor: DeviceSensor): DeviceMessage {
  const base = { dev: SIMULATED_DEV, fw: "sim" };
  const roll = Math.random();
  const status = roll < 0.05 ? "fault" : roll < 0.15 ? "unstable" : "settled";
  if (status === "fault") {
    const unit = { TEMP: "C", TDS: "ppm", VOLT: "V", PRESS: "bar" }[sensor];
    return { ...base, sensor, value: null, unit, status };
  }
  switch (sensor) {
    case "TEMP":
      return { ...base, sensor, value: r(24, 34, 2), unit: "C", status };
    case "TDS":
      return { ...base, sensor, value: Math.round(r(60, 650)), unit: "ppm", status, temp: r(24, 30) };
    case "VOLT": {
      const v = r(198, 248);
      return { ...base, sensor, value: v, unit: "V", status, min: +(v - r(1, 9)).toFixed(1), max: +(v + r(1, 6)).toFixed(1), cal: false };
    }
    case "PRESS":
      return { ...base, sensor, value: r(0.3, 4.5, 2), unit: "bar", status };
  }
}

// Simulated phone sound measurement (dB).
export function simulateSound(): number {
  return Math.round(r(38, 72, 0));
}
