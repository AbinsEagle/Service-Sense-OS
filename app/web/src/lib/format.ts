import type { Reading } from "./types";

export function formatValue(r: Reading): string {
  if (r.value === null) return "—";
  const d = r.sensor === "TEMP" || r.sensor === "PRESS" ? 2 : r.sensor === "VOLT" ? 1 : 0;
  return r.value.toFixed(d);
}
