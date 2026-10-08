import { useEffect, useState } from "react";
import { BRAND } from "@/config/brand";
import type { Check, Reading, Technician } from "./types";

// Stage 1: everything lives on this phone (feature list: stage plan, Q13).
const KEYS = { tech: "ssos.tech.v1", draft: "ssos.draft.v2", history: "ssos.history.v1", recent: "ssos.recentModels.v1" };

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: keep working in memory */
  }
}

function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));
  useEffect(() => write(key, value), [key, value]);
  return [value, setValue] as const;
}

export const useTechnician = () => usePersisted<Technician | null>(KEYS.tech, null);
export const useDraft = () => usePersisted<Check | null>(KEYS.draft, null);
export const useHistory = () => usePersisted<Check[]>(KEYS.history, []);

export function newCheck(technician: Technician): Check {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    brand: BRAND.name,
    technician,
    product: { serial: "", categoryId: null, modelId: null },
    customer: { name: "", phone: "", address: "", notes: "" },
    location: null,
    readings: {},
    log: [],
    ph: null,
    step: 0,
  };
}

export function withReading(c: Check, r: Reading): Check {
  return { ...c, readings: { ...c.readings, [r.sensor]: r }, log: [r, ...c.log].slice(0, 100) };
}

export function recentModels(): string[] {
  return read<string[]>(KEYS.recent, []);
}
export function rememberModel(id: string) {
  write(KEYS.recent, [id, ...recentModels().filter((m) => m !== id)].slice(0, 6));
}
