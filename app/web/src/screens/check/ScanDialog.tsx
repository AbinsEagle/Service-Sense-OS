import { useEffect, useRef, useState } from "react";
import { Camera, QrCode, X } from "lucide-react";
import { Button, IconButton } from "@/components/m3";
import { cameraAvailable, detectInFile, makeDetector, serialFromQr } from "@/lib/qr";

// Full-screen camera view that reads the product QR (serial only, feature list Q3).
// Works on Chrome (built-in reader) and iPhone browsers such as Bluefy (jsQR); if the
// live camera can't start, the technician can take a photo of the QR instead.
export function ScanDialog({ open, onClose, onSerial }: { open: boolean; onClose(): void; onSerial(serial: string): void }) {
  const video = useRef<HTMLVideoElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(cameraAvailable() ? null : "The live camera isn't available in this browser.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || error) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = await makeDetector();
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const raw = await detector.detect(video.current);
            if (raw) {
              onSerial(serialFromQr(raw));
              return;
            }
          } catch {
            /* frame not ready */
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        if (!stopped) setError((e as Error).name === "NotAllowedError" ? "Camera permission was not given." : "The live camera couldn't start.");
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, error, onSerial]);

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await detectInFile(file);
      if (raw) onSerial(serialFromQr(raw));
      else setError("No QR code found in that photo. Hold the phone closer and keep the QR sharp.");
    } catch {
      setError("That photo couldn't be read.");
    } finally {
      setBusy(false);
      if (photo.current) photo.current.value = "";
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Scan product QR">
      <div className="flex h-16 items-center gap-2 px-1">
        <IconButton label="Close scanner" onClick={onClose} className="text-white">
          <X />
        </IconButton>
        <h2 className="text-lg">Scan the product QR</h2>
      </div>
      <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => fromPhoto(e.target.files?.[0])} />
      {!error ? (
        <div className="relative flex-1">
          <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-lg border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
          <p className="absolute inset-x-0 bottom-10 text-center text-sm">Point at the QR sticker on the product or box</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <QrCode className="h-12 w-12 opacity-80" aria-hidden />
          <p>{error} Take a photo of the QR, or type the serial number.</p>
          <Button onClick={() => photo.current?.click()} disabled={busy} icon={<Camera className="h-4 w-4" />}>
            {busy ? "Reading…" : "Take a photo of the QR"}
          </Button>
          <Button variant="text" onClick={onClose} className="text-white">
            Type the serial
          </Button>
        </div>
      )}
    </div>
  );
}
