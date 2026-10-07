import { useEffect, useState } from "react";
import type { Customer, DeviceMessage, GeoLocation, Reading, Sensor } from "./types";

export interface Visit {
  id: string;
  startedAt: string;
  customer: Customer;
  location: GeoLocation | null;
  notes: string;
  latest: Partial<Record<Sensor, Reading>>; // a re-take replaces the earlier reading
  log: Reading[]; // everything received, newest first (shown, not saved)
  savedAt?: string;
}

const KEY = "ssos.visit.v1";

export function newVisit(): Visit {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    customer: { name: "", phone: "", address: "" },
    location: null,
    notes: "",
    latest: {},
    log: [],
  };
}

function load(): Visit {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v?.id && v?.latest) return v;
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return newVisit();
}

export function toReading(m: DeviceMessage): Reading {
  return { ...m, taken_at: new Date().toISOString() };
}

// The visit in progress, kept on the phone so a reload or a dead battery mid-visit loses nothing.
export function useVisit() {
  const [visit, setVisit] = useState<Visit>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(visit));
    } catch {
      /* private mode: keep working in memory */
    }
  }, [visit]);

  const addReading = (r: Reading) =>
    setVisit((v) => (v.savedAt ? v : { ...v, latest: { ...v.latest, [r.sensor]: r }, log: [r, ...v.log].slice(0, 100) }));

  return { visit, setVisit, addReading, reset: () => setVisit(newVisit()) };
}
