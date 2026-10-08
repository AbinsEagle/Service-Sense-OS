import { useEffect, useRef, useState } from "react";
import { QrCode, X } from "lucide-react";
import { Button, IconButton } from "@/components/m3";
import { makeDetector, qrSupported, serialFromQr } from "@/lib/qr";

// Full-screen camera view that reads the product QR (serial only, feature list Q3).
export function ScanDialog({ open, onClose, onSerial }: { open: boolean; onClose(): void; onSerial(serial: string): void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const supported = qrSupported();

  useEffect(() => {
    if (!open || !supported) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = makeDetector();
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            const raw = codes.find((c) => c.rawValue.trim())?.rawValue;
            if (raw) {
              onSerial(serialFromQr(raw));
              return;
            }
          } catch {
            /* frame not ready */
          }
          timer = window.setTimeout(tick, 200);
        };
        tick();
      } catch (e) {
        setError((e as Error).name === "NotAllowedError" ? "Camera permission was not given. Allow the camera for this site, or type the serial." : "The camera couldn't start. Type the serial instead.");
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, supported, onSerial]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Scan product QR">
      <div className="flex h-16 items-center gap-2 px-1">
        <IconButton label="Close scanner" onClick={onClose} className="text-white">
          <X />
        </IconButton>
        <h2 className="text-lg">Scan the product QR</h2>
      </div>
      {supported && !error ? (
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
          <p>{error ?? "This browser can't scan QR codes. Use Chrome on Android, or type the serial number."}</p>
          <Button variant="tonal" onClick={onClose}>
            Type the serial
          </Button>
        </div>
      )}
    </div>
  );
}
