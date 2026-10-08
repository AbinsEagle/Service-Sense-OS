import type { Reading } from "./types";

export const fmtValue = (r: Reading) =>
  r.value === null ? "—" : r.sensor === "PRESS" ? r.value.toFixed(2) : r.sensor === "VOLT" ? r.value.toFixed(0) : r.value.toFixed(0);
