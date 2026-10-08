import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button, Snackbar } from "@/components/m3";
import { drawReport, reportBlob, shareReport } from "@/lib/report";
import type { Check } from "@/lib/types";

// The image report the customer gets on WhatsApp (UI plan U5, U6).
export function ReportPreview({ check }: { check: Check }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let u: string | null = null;
    let live = true;
    drawReport(check)
      .then(reportBlob)
      .then((b) => {
        if (!live) return;
        u = URL.createObjectURL(b);
        setUrl(u);
      });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [check]);

  const share = async () => {
    setBusy(true);
    try {
      const r = await shareReport(check);
      if (r === "saved") setToast("Image saved. Open WhatsApp and send it to the customer.");
    } catch {
      setToast("Couldn't share the image. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="rounded-md bg-surface-container-low p-4">
        <p className="text-sm text-on-surface-variant">Send to</p>
        <p className="text-lg text-on-surface">
          {check.customer.name} · <span className="tabnum">+91 {check.customer.phone}</span>
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">Tap Share report, choose WhatsApp, then this customer's chat.</p>
      </div>
      <Button size="lg" icon={<Share2 className="h-5 w-5" />} onClick={share} disabled={busy || !url}>
        {busy ? "Preparing…" : "Share report"}
      </Button>
      <figure className="overflow-hidden rounded-md border border-outline-variant bg-white">
        {url ? <img src={url} alt="Site check report image" className="w-full" /> : <div className="aspect-[3/4] animate-pulse bg-surface-container" />}
      </figure>
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
