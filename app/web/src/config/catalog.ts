import type { CategoryId, Sensor } from "@/lib/types";

// PLACEHOLDER catalogue: replace with the brand's model list (feature list Q4).
// `readings` is the site check for that category, in the order the app asks for them
// (feature list Q5, Q14; temperature and sound added where they fit, Q25).
export interface Model {
  id: string;
  name: string;
  voltRange?: [number, number]; // stabilizers/inverters: input working range, volts
}

export interface Category {
  id: CategoryId;
  name: string;
  readings: Sensor[];
  models: Model[];
}

export const CATEGORIES: Category[] = [
  {
    id: "heater",
    name: "Water heater",
    readings: ["TDS", "TEMP", "PRESS", "VOLT"],
    models: [
      { id: "heater-storage-10", name: "Storage 10 L" },
      { id: "heater-storage-15", name: "Storage 15 L" },
      { id: "heater-storage-25", name: "Storage 25 L" },
      { id: "heater-instant-3", name: "Instant 3 L" },
    ],
  },
  {
    id: "purifier",
    name: "Water purifier",
    readings: ["TDS", "TEMP", "PRESS", "VOLT"],
    models: [
      { id: "purifier-ro-uv-7", name: "RO + UV 7 L" },
      { id: "purifier-ro-uv-min-8", name: "RO + UV + Mineral 8 L" },
      { id: "purifier-uv-6", name: "UV 6 L" },
      { id: "purifier-uf-gravity", name: "UF gravity 10 L" },
    ],
  },
  {
    id: "pump",
    name: "Pump",
    readings: ["PRESS", "VOLT", "SOUND"],
    models: [
      { id: "pump-sp-05", name: "Self-priming 0.5 HP" },
      { id: "pump-sp-1", name: "Self-priming 1 HP" },
      { id: "pump-booster-05", name: "Pressure booster 0.5 HP" },
      { id: "pump-sub-1", name: "Submersible 1 HP" },
    ],
  },
  {
    id: "stabilizer",
    name: "Stabilizer / inverter",
    readings: ["VOLT", "SOUND"],
    models: [
      { id: "stab-main-5k", name: "Mainline 5 kVA (130–280 V)", voltRange: [130, 280] },
      { id: "stab-main-4k", name: "Mainline 4 kVA (90–290 V)", voltRange: [90, 290] },
      { id: "stab-appliance", name: "Appliance stabilizer (170–270 V)", voltRange: [170, 270] },
      { id: "inv-900", name: "Inverter 900 VA (100–280 V)", voltRange: [100, 280] },
    ],
  },
  {
    id: "chimney",
    name: "Kitchen chimney",
    readings: ["VOLT", "SOUND"],
    models: [
      { id: "chim-60", name: "Wall-mount 60 cm" },
      { id: "chim-90", name: "Wall-mount 90 cm" },
      { id: "chim-island-90", name: "Island 90 cm" },
      { id: "chim-filterless-60", name: "Filterless auto-clean 60 cm" },
    ],
  },
];

export const category = (id: CategoryId | null) => CATEGORIES.find((c) => c.id === id) ?? null;
export const model = (categoryId: CategoryId | null, modelId: string | null) =>
  category(categoryId)?.models.find((m) => m.id === modelId) ?? null;

// button: the device button that takes the reading; 0 = measured by the phone.
export const SENSOR_INFO: Record<Sensor, { label: string; unit: string; button: number; howTo: string }> = {
  TEMP: { label: "Water temperature", unit: "°C", button: 1, howTo: "Put the temperature probe in a cup of inlet water, wait a few seconds, then press 1 on the device." },
  TDS: { label: "TDS", unit: "ppm", button: 2, howTo: "Fill a clean cup from the inlet tap, dip the TDS probe fully, then press 2 on the device." },
  VOLT: { label: "Supply voltage", unit: "V", button: 3, howTo: "Plug the voltage lead into the socket the product will use, then press 3 on the device. It watches for 5 seconds." },
  PRESS: { label: "Inlet pressure", unit: "bar", button: 4, howTo: "Connect the pressure sensor to the inlet point and open the valve fully, then press 4 on the device." },
  SOUND: { label: "Sound level", unit: "dB", button: 0, howTo: "Stand where the product will be installed, keep the room quiet, and hold the phone at arm's length. Tap Measure: it listens for 5 seconds." },
};

export const FIX_HINT: Record<Sensor, string> = {
  TEMP: "Make sure the probe tip is fully in the water and the connector is pushed in.",
  TDS: "Keep the TDS probe fully under water and still; rinse it if it was in another sample.",
  VOLT: "Check the lead is firmly in the socket and the switch is on; avoid starting motors nearby while it measures.",
  PRESS: "Check the sensor fitting doesn't leak and the valve is fully open; wait for the flow to steady.",
  SOUND: "Allow the microphone for this site, keep the phone still, and measure again.",
};
