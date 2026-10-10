// Product QR holds the serial number only (feature list Q3). Chrome on Android has a
// built-in QR reader (BarcodeDetector); other browsers (iPhone Safari, Bluefy) use jsQR,
// loaded only when needed. If the live camera is unavailable, a photo of the QR works too.
export interface Detector {
  detect(source: HTMLVideoElement | HTMLImageElement | ImageBitmap): Promise<string | null>;
}
type NativeCtor = new (o: { formats: string[] }) => { detect(s: CanvasImageSource): Promise<{ rawValue: string }[]> };

const native = () => (typeof window !== "undefined" ? (window as unknown as { BarcodeDetector?: NativeCtor }).BarcodeDetector : undefined);

export function cameraAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export async function makeDetector(): Promise<Detector> {
  const Native = native();
  if (Native) {
    try {
      const d = new Native({ formats: ["qr_code"] });
      return { detect: async (s) => (await d.detect(s)).find((c) => c.rawValue.trim())?.rawValue ?? null };
    } catch {
      /* fall through to jsQR */
    }
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return {
    async detect(s) {
      const w = s instanceof HTMLVideoElement ? s.videoWidth : s.width;
      const h = s instanceof HTMLVideoElement ? s.videoHeight : s.height;
      if (!w || !h) return null;
      // scale big frames/photos down: faster, and jsQR copes well at ~800 px
      const k = Math.min(1, 800 / Math.max(w, h));
      canvas.width = Math.round(w * k);
      canvas.height = Math.round(h * k);
      ctx.drawImage(s, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(img.data, img.width, img.height)?.data.trim() || null;
    },
  };
}

export async function detectInFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    return await (await makeDetector()).detect(bitmap);
  } finally {
    bitmap.close();
  }
}

// Serial = the QR text, trimmed; if the brand ever prints a URL, take its last path part or ?sn=.
export function serialFromQr(raw: string): string {
  const text = raw.trim();
  try {
    const u = new URL(text);
    return (u.searchParams.get("sn") ?? u.searchParams.get("serial") ?? u.pathname.split("/").filter(Boolean).pop() ?? text).trim();
  } catch {
    return text;
  }
}
