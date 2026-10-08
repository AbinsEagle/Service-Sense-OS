// Product QR holds the serial number only (feature list Q3). Chrome on Android has a
// built-in QR reader (BarcodeDetector); elsewhere the technician types the serial.
interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (o: { formats: string[] }) => Detector;

export function qrSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
}

export function makeDetector(): Detector {
  const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
  return new Ctor({ formats: ["qr_code"] });
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
