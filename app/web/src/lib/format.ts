import type { Reading } from "./types";

export const fmtValue = (r: Reading) =>
  r.value === null ? "—" : r.sensor === "PRESS" ? r.value.toFixed(2) : r.sensor === "TEMP" ? r.value.toFixed(1) : r.value.toFixed(0);
