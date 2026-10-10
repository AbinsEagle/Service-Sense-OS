import type { GeoFix } from "./types";

// Location is a field the technician taps (feature list Q22–Q24): nothing is fetched until then.
export type GeoPermission = "granted" | "prompt" | "denied" | "unknown";

export async function geoPermission(): Promise<GeoPermission> {
  try {
    const p = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return p.state as GeoPermission;
  } catch {
    return "unknown"; // older browsers: just ask
  }
}

export class GeoError extends Error {
  readonly kind: "denied" | "unavailable" | "timeout" | "unsupported";
  constructor(kind: GeoError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

export function fetchLocation(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new GeoError("unsupported", "This browser can't share location."));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: +p.coords.latitude.toFixed(6),
          longitude: +p.coords.longitude.toFixed(6),
          accuracy: Math.round(p.coords.accuracy),
          at: new Date().toISOString(),
        }),
      (e) =>
        reject(
          e.code === e.PERMISSION_DENIED
            ? new GeoError("denied", "Location permission was not given.")
            : e.code === e.TIMEOUT
              ? new GeoError("timeout", "GPS took too long. Step outside or near a window and try again.")
              : new GeoError("unavailable", "Couldn't get a GPS fix. Turn on Location in the phone's quick settings and try again."),
        ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export const mapLink = (g: GeoFix) => `https://maps.google.com/?q=${g.latitude},${g.longitude}`;
