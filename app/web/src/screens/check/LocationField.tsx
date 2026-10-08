import { useState } from "react";
import { LocateFixed, MapPin, MapPinOff } from "lucide-react";
import { Button, Dialog } from "@/components/m3";
import { fetchLocation, GeoError, geoPermission, mapLink } from "@/lib/location";
import { isIOS } from "@/lib/platform";
import type { GeoFix } from "@/lib/types";

// Required location field (feature list Q22–Q24). Nothing is fetched until the technician taps:
// allowed → fetch at once; not yet allowed → a "tap Allow" hint, then the phone's pop-up (every tap);
// blocked → how to unblock it in Chrome, then try again.
export function LocationField({ value, onChange, showError = false }: { value: GeoFix | null; onChange(g: GeoFix | null): void; showError?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchNow = async () => {
    setBusy(true);
    setMessage(null);
    try {
      onChange(await fetchLocation());
    } catch (e) {
      const err = e as GeoError;
      if (err.kind === "denied") {
        // Dismissed → still "prompt" (ask again next tap); "Block" → "denied" (needs site settings).
        if ((await geoPermission()) === "denied") setBlocked(true);
        else setMessage("Location wasn't allowed. Tap Capture location again and choose Allow.");
      } else setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    const p = await geoPermission();
    if (p === "granted") return fetchNow();
    if (p === "denied") return setBlocked(true);
    setHint(true); // prompt / unknown: prime the technician before the browser pop-up
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1">
      {value ? (
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 shrink-0 text-ok" aria-hidden />
          <div className="min-w-0 flex-1">
            <a href={mapLink(value)} target="_blank" rel="noreferrer" className="block truncate text-on-surface underline-offset-2 hover:underline tabnum">
              {value.latitude}, {value.longitude}
            </a>
            <span className="text-xs text-on-surface-variant">±{value.accuracy} m</span>
          </div>
          <Button variant="text" onClick={capture} disabled={busy}>
            Update
          </Button>
        </div>
      ) : (
        <Button variant="outlined" size="lg" className="w-full" icon={<LocateFixed className="h-5 w-5" />} onClick={capture} disabled={busy}>
          {busy ? "Getting location…" : "Capture location"}
        </Button>
      )}
      {message && <p className="px-4 text-xs text-error">{message}</p>}
      {showError && !value && !message && <p className="px-4 text-xs text-error">Capture the site location to continue</p>}
      {value && value.accuracy > 100 && <p className="px-4 text-xs text-warn">Low accuracy. Step outside or near a window and tap Update.</p>}

      <Dialog
        open={hint}
        onClose={() => setHint(false)}
        icon={<LocateFixed className="h-6 w-6" />}
        title="Allow location"
        actions={
          <>
            <Button variant="text" onClick={() => setHint(false)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                setHint(false);
                fetchNow();
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        <p>Your phone will now ask for location. Tap <b className="text-on-surface">Allow</b>, so this check can be completed.</p>
        <div className="mt-4 rounded-md bg-surface-container-highest p-4 text-on-surface" aria-hidden>
          <p className="text-sm">{isIOS() ? "“This website” would like to use your current location." : "Allow this site to use your device's location?"}</p>
          <div className="mt-3 flex justify-end gap-4 text-sm font-medium">
            <span className="opacity-50">{isIOS() ? "Don't Allow" : "Block"}</span>
            <span className="rounded-full bg-primary px-3 py-1 text-on-primary">Allow</span>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={blocked}
        onClose={() => setBlocked(false)}
        icon={<MapPinOff className="h-6 w-6" />}
        title="Location is blocked"
        actions={
          <>
            <Button variant="text" onClick={() => setBlocked(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setBlocked(false);
                fetchNow();
              }}
            >
              Try again
            </Button>
          </>
        }
      >
        <p>Location was blocked for this site earlier, so the phone won't ask again. To allow it:</p>
        {isIOS() ? (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-on-surface">
            <li>
              Open <b>Settings → Privacy &amp; Security → Location Services</b> and make sure it's on.
            </li>
            <li>
              In the same list, tap your browser (Safari, Chrome or Bluefy) and choose <b>While Using the App</b>.
            </li>
            <li>Come back here and tap Try again; tap <b>Allow</b> when asked.</li>
          </ol>
        ) : (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-on-surface">
            <li>Tap the icon left of the address bar in Chrome (🔒 or ⚙).</li>
            <li>
              Tap <b>Permissions → Location → Allow</b>.
            </li>
          </ol>
        )}
        <p className="mt-3">Also check that Location is switched on in the phone's quick settings. Then tap Try again.</p>
      </Dialog>
    </div>
  );
}
