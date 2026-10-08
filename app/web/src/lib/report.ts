import { BRAND } from "@/config/brand";
import { category, model, SENSOR_INFO } from "@/config/catalog";
import type { Band } from "@/config/limits";
import { isSimulated, judgePh, judgeReading, lsiFor, outcome, requiredSensors, type Level } from "./evaluate";
import { mapLink } from "./location";
import type { Check } from "./types";

// The customer's report, drawn as an image to share on WhatsApp (UI plan U5, U6).
// Always light colours: it is viewed in chats and sometimes printed.
const C = {
  ink: "#191c21", sub: "#44474e", line: "#c4c6cf", surface: "#ffffff", band: "#f3f3fa",
  primary: "#004d99", primaryContainer: "#1565c0",
  ok: "#146c2e", okC: "#b7f1bf", warn: "#8b5000", warnC: "#ffdcbe", fail: "#ba1a1a", failC: "#ffdad6",
};
const W = 1080;
const PAD = 64;
const FONT = 'Roboto, "Segoe UI", system-ui, sans-serif';

const levelColor = (l: Level) => (l === "ok" ? C.ok : l === "warn" ? C.warn : C.fail);

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, band: Band, values: number[], level: Level) {
  const [lo, hi] = band.scale;
  const px = (v: number) => x + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * w;
  const h = 16;
  ctx.fillStyle = C.failC;
  ctx.fillRect(x, y, w, h);
  const wl = band.warnLow ?? lo, wh = band.warnHigh ?? hi, ol = band.okLow ?? lo, oh = band.okHigh ?? hi;
  ctx.fillStyle = C.warnC;
  ctx.fillRect(px(wl), y, px(wh) - px(wl), h);
  ctx.fillStyle = C.okC;
  ctx.fillRect(px(ol), y, px(oh) - px(ol), h);
  // marker(s): one for a single value, a span for voltage min–max
  ctx.fillStyle = levelColor(level);
  if (values.length === 2) ctx.fillRect(px(values[0]), y - 6, Math.max(4, px(values[1]) - px(values[0])), h + 12);
  else ctx.fillRect(px(values[0]) - 3, y - 8, 6, h + 16);
  ctx.fillStyle = C.sub;
  ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(String(lo), x, y + h + 30);
  ctx.textAlign = "right";
  ctx.fillText(String(hi), x + w, y + h + 30);
  ctx.textAlign = "left";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawReport(check: Check): Promise<HTMLCanvasElement> {
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts unavailable: system font */
  }
  const out = outcome(check);
  const cat = category(check.product.categoryId);
  const mdl = model(check.product.categoryId, check.product.modelId);
  const sensors = requiredSensors(check);
  const lsi = lsiFor(check);
  const simulated = isSimulated(check);

  const canvas = document.createElement("canvas");
  const scale = 1;
  canvas.width = W * scale;
  canvas.height = 2600; // trimmed at the end
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = C.surface;
  ctx.fillRect(0, 0, W, canvas.height);
  ctx.textBaseline = "alphabetic";

  // Header: brand first (U6)
  ctx.fillStyle = C.primaryContainer;
  ctx.fillRect(0, 0, W, 170);
  let x = PAD;
  if (BRAND.logo) {
    const img = new Image();
    img.src = BRAND.logo;
    try {
      await img.decode();
      ctx.drawImage(img, PAD, 35, 100, 100);
      x = PAD + 124;
    } catch {
      /* no logo */
    }
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText(BRAND.name, x, 92);
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText("Pre-installation site check", x, 136);

  let y = 170;
  if (simulated) {
    ctx.fillStyle = C.warnC;
    ctx.fillRect(0, y, W, 56);
    ctx.fillStyle = C.warn;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText("TRAINING ONLY: simulated readings, not a real site check", PAD, y + 37);
    y += 56;
  }

  // Status
  y += 40;
  const st = out.status === "ready" ? [C.okC, C.ok] : out.status === "addon" ? [C.warnC, C.warn] : [C.failC, C.fail];
  ctx.font = `400 26px ${FONT}`;
  const reasonLines = out.reasons.flatMap((r) => wrap(ctx, r, W - PAD * 2 - 48));
  const boxH = 100 + reasonLines.length * 36 + (out.reasons.length ? 10 : 0);
  ctx.fillStyle = st[0];
  roundRect(ctx, PAD, y, W - PAD * 2, boxH, 24);
  ctx.fillStyle = st[1];
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(out.title, PAD + 24, y + 66);
  ctx.fillStyle = C.ink;
  ctx.font = `400 26px ${FONT}`;
  reasonLines.forEach((l, i) => ctx.fillText(l, PAD + 24, y + 110 + i * 36));
  y += boxH + 36;

  // Add-ons
  if (out.addons.length) {
    ctx.fillStyle = C.ink;
    ctx.font = `700 28px ${FONT}`;
    y += 8;
    ctx.fillText("Recommended before installation", PAD, y);
    y += 14;
    ctx.font = `400 28px ${FONT}`;
    for (const a of out.addons) {
      y += 42;
      ctx.fillText(`•  ${a}`, PAD + 8, y);
    }
    y += 64;
  }

  // Readings
  ctx.fillStyle = C.sub;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText("SITE READINGS", PAD, y);
  y += 16;
  for (const s of sensors) {
    const r = check.readings[s];
    if (!r || r.value === null) continue;
    const j = judgeReading(check, r);
    y += 24;
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 50;
    ctx.fillStyle = C.ink;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(SENSOR_INFO[s].label, PAD, y);
    const val = s === "VOLT" && r.min !== undefined ? `${r.value.toFixed(0)} V  (${r.min.toFixed(0)}–${r.max!.toFixed(0)})` : `${s === "PRESS" ? r.value.toFixed(2) : s === "TEMP" ? r.value.toFixed(1) : r.value.toFixed(0)} ${SENSOR_INFO[s].unit}${s === "SOUND" ? " (phone, approx.)" : ""}`;
    ctx.textAlign = "right";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(val, W - PAD, y);
    ctx.textAlign = "left";
    if (j) {
      y += 40;
      ctx.fillStyle = levelColor(j.verdict.level);
      ctx.font = `700 26px ${FONT}`;
      const vt = j.verdict.text.toUpperCase();
      ctx.fillText(vt, PAD, y);
      const vw = ctx.measureText(vt).width;
      ctx.fillStyle = C.sub;
      ctx.font = `400 22px ${FONT}`;
      ctx.fillText(`Limit: ${j.band.basis}${j.band.provisional ? " (provisional)" : ""}`, PAD + vw + 28, y);
      y += 26;
      bar(ctx, PAD, y, W - PAD * 2, j.band, s === "VOLT" && r.min !== undefined ? [r.min, r.max!] : [r.value], j.verdict.level);
      y += 50;
    }
  }

  // Water chemistry (optional, Q19–Q20)
  if (check.ph !== null) {
    y += 24;
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 50;
    const p = judgePh(check.ph);
    ctx.fillStyle = C.ink;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText("pH (test strip)", PAD, y);
    ctx.textAlign = "right";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(check.ph.toFixed(1), W - PAD, y);
    ctx.textAlign = "left";
    y += 40;
    ctx.fillStyle = levelColor(p.verdict.level);
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(p.verdict.text.toUpperCase(), PAD, y);
    y += 26;
    bar(ctx, PAD, y, W - PAD * 2, p.band, [check.ph], p.verdict.level);
    y += 50;
    if (lsi) {
      y += 56;
      ctx.fillStyle = C.ink;
      ctx.font = `500 30px ${FONT}`;
      ctx.fillText("Water tendency (Langelier, estimate)", PAD, y);
      ctx.textAlign = "right";
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(`${lsi.label}  ${lsi.value >= 0 ? "+" : ""}${lsi.value.toFixed(1)}`, W - PAD, y);
      ctx.textAlign = "left";
      y += 34;
      ctx.fillStyle = C.sub;
      ctx.font = `400 22px ${FONT}`;
      for (const [i, l] of wrap(ctx, "Estimated from the pH strip, TDS and water temperature; hardness and alkalinity are not measured.", W - PAD * 2).entries()) {
        ctx.fillText(l, PAD, y + i * 30);
        if (i) y += 30;
      }
    }
  }

  // Details
  y += 50;
  ctx.fillStyle = C.band;
  const details: [string, string][] = [
    ...(check.customer.name ? ([["Customer", check.customer.name]] as [string, string][]) : []),
    ["Product", `${cat?.name ?? ""} · ${mdl?.name ?? ""}`],
    ["Serial no.", check.product.serial],
    ["Checked on", new Date(check.finishedAt ?? check.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })],
    ["Location", check.location ? `${check.location.latitude}, ${check.location.longitude}  (±${check.location.accuracy} m)` : "not captured"],
    ["Map", check.location ? mapLink(check.location).replace("https://", "") : ""],
    ["Technician", `${check.technician.name} · +91 ${check.technician.mobile}`],
  ];
  const dh = details.length * 46 + 40;
  roundRect(ctx, PAD, y, W - PAD * 2, dh, 20);
  details.forEach(([k, v], i) => {
    const ty = y + 52 + i * 46;
    ctx.fillStyle = C.sub;
    ctx.font = `400 24px ${FONT}`;
    ctx.fillText(k, PAD + 24, ty);
    ctx.fillStyle = C.ink;
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText(v, PAD + 220, ty);
  });
  y += dh + 50;

  // Footer: Service Sense, small (U6)
  ctx.fillStyle = C.sub;
  ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("Checked with Service Sense OS", W / 2, y);
  ctx.textAlign = "left";
  y += 40;

  const trimmed = document.createElement("canvas");
  trimmed.width = W;
  trimmed.height = y;
  trimmed.getContext("2d")!.drawImage(canvas, 0, 0);
  return trimmed;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

export const reportBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't create the image"))), "image/png"));

export function reportFileName(check: Check) {
  const d = new Date(check.finishedAt ?? check.createdAt).toISOString().slice(0, 10);
  const name = (check.customer.name.trim() || check.product.serial).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "check";
  return `site-check-${name}-${d}.png`;
}

// Share sheet with the image (WhatsApp is picked there); fall back to saving the image.
export async function shareReport(check: Check): Promise<"shared" | "saved" | "cancelled"> {
  const blob = await reportBlob(await drawReport(check));
  const file = new File([blob], reportFileName(check), { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Site check report" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "saved";
}
