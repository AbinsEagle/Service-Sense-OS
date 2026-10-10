import type { CategoryId, Sensor } from "@/lib/types";
import type { Model } from "./catalog";

// OK / Low / High limits (feature list Q6, Q15). Changed only by us, in an app update.
// Bands from the middle out:   [okLow, okHigh]  → OK
//                              [warnLow, warnHigh] → Warn (Low / High)
//                              beyond warn → Fail; beyond crit → no add-on can fix it ("Not ready")
export interface Band {
  okLow?: number;
  okHigh?: number;
  warnLow?: number;
  warnHigh?: number;
  critLow?: number;
  critHigh?: number;
  fixLow?: string; // add-on that fixes a low reading
  fixHigh?: string;
  scale: [number, number]; // range drawn on the bar
  basis: string;
  provisional?: boolean; // shown as "provisional limit" until the brand confirms
}

const STABILIZER = "Voltage stabilizer";
const BOOSTER = "Booster pump";
const PRV = "Pressure-reducing valve";

// Supply: 230 V ±6% OK (CEA supply regulations), ±10% warn. Beyond 160–280 V even a
// stabilizer isn't a safe fix: the supply itself needs an electrician.
const VOLT: Band = {
  okLow: 216, okHigh: 244, warnLow: 207, warnHigh: 253, critLow: 160, critHigh: 280,
  fixLow: STABILIZER, fixHigh: STABILIZER, scale: [150, 290], basis: "230 V ±6%",
};

// PLACEHOLDER pressure limits per category: collect from the product manuals (open item).
const PRESS: Partial<Record<CategoryId, Band>> = {
  heater: { okLow: 1, okHigh: 6, warnLow: 0.5, warnHigh: 7, fixLow: BOOSTER, fixHigh: PRV, scale: [0, 8], basis: "manual, to confirm", provisional: true },
  purifier: { okLow: 0.4, okHigh: 3, warnLow: 0.2, warnHigh: 4, fixLow: BOOSTER, fixHigh: PRV, scale: [0, 5], basis: "manual, to confirm", provisional: true },
  pump: { okLow: 0.1, okHigh: 3, warnLow: 0, warnHigh: 4, fixHigh: PRV, scale: [0, 5], basis: "manual, to confirm", provisional: true },
};

const TDS: Partial<Record<CategoryId, Band>> = {
  // IS 10500: 500 mg/L acceptable, 2000 permissible. Above 2000 the brand must advise.
  purifier: { okHigh: 500, warnHigh: 2000, critHigh: 2000, fixHigh: "Pre-filter", scale: [0, 2500], basis: "IS 10500" },
  // Scaling risk for heaters (proposal; hardness is the real driver, TDS a proxy).
  heater: { okHigh: 300, warnHigh: 500, fixHigh: "Water softener / scale guard", scale: [0, 1000], basis: "scaling risk (proposal)" },
};

// PLACEHOLDER inlet water temperature limits (Q25): typical operating range from product manuals, to confirm.
const TEMP: Partial<Record<CategoryId, Band>> = {
  heater: { okLow: 10, okHigh: 40, warnLow: 5, warnHigh: 45, scale: [0, 60], basis: "manual, to confirm", provisional: true },
  purifier: { okLow: 10, okHigh: 38, warnLow: 5, warnHigh: 45, scale: [0, 60], basis: "manual, to confirm", provisional: true },
};

// PLACEHOLDER sound limits (Q25): background noise at the site, measured by the phone (uncalibrated).
// Above 60 dB is a caution only; it never blocks an installation.
const SOUND_BAND: Band = { okHigh: 60, warnHigh: 150, scale: [30, 100], basis: "background noise, to confirm", provisional: true };

export function bandFor(categoryId: CategoryId, model: Model | null, sensor: Sensor): Band | null {
  if (sensor === "VOLT") {
    if (categoryId === "stabilizer" && model?.voltRange) {
      // The product itself must cope: inside its working range is fine, near the edge is a
      // warning, outside it nothing but a supply fix helps.
      const [lo, hi] = model.voltRange;
      return {
        okLow: lo + 15, okHigh: hi - 15, warnLow: lo, warnHigh: hi, critLow: lo, critHigh: hi,
        scale: [lo - 40, hi + 30], basis: `model range ${lo}–${hi} V`,
      };
    }
    return VOLT;
  }
  if (sensor === "PRESS") return PRESS[categoryId] ?? null;
  if (sensor === "TDS") return TDS[categoryId] ?? null;
  if (sensor === "TEMP") return TEMP[categoryId] ?? null;
  if (sensor === "SOUND") return SOUND_BAND;
  return null;
}

// pH from an indicator strip (Q19): IS 10500 range 6.5–8.5. Informational; doesn't change site status.
export const PH_BAND: Band = { okLow: 6.5, okHigh: 8.5, warnLow: 6, warnHigh: 9, scale: [5, 9], basis: "IS 10500" };
export const PH_STEPS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

// Langelier index, estimated (Q20, Q21). PLACEHOLDER ratios: validate against lab-tested
// local samples before trusting the label in the field.
export const LSI_RATIOS = {
  hardnessPerTds: 0.4, // calcium hardness as CaCO3 ≈ 0.4 × TDS
  alkalinityPerTds: 0.4, // alkalinity as CaCO3 ≈ 0.4 × TDS
};
export const LSI_BANDS = { corrosiveBelow: -0.5, scalingAbove: 0.5 };
