import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Visit } from "@/lib/visit";

interface Props {
  visit: Visit;
  disabled: boolean;
  onChange(v: Partial<Visit>): void;
}

export function VisitForm({ visit, disabled, onChange }: Props) {
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const c = visit.customer;
  const setCustomer = (k: keyof typeof c, value: string) => onChange({ customer: { ...c, [k]: value } });

  const locate = () => {
    if (!navigator.geolocation) return setLocError("This browser can't share its location.");
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        onChange({ location: { latitude: +p.coords.latitude.toFixed(6), longitude: +p.coords.longitude.toFixed(6) } });
      },
      (e) => {
        setLocating(false);
        setLocError(e.code === e.PERMISSION_DENIED ? "Location permission was denied." : "Couldn't get a location fix.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <fieldset disabled={disabled} className="grid gap-4 rounded-md border bg-card p-4">
      <legend className="sr-only">Customer and site</legend>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Customer & site</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="c-name">
          Customer name <span className="text-fault">*</span>
        </Label>
        <Input id="c-name" autoComplete="off" value={c.name} onChange={(e) => setCustomer("name", e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-phone">Phone</Label>
        <Input id="c-phone" type="tel" inputMode="tel" value={c.phone} onChange={(e) => setCustomer("phone", e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-addr">Address</Label>
        <Textarea id="c-addr" rows={2} value={c.address} onChange={(e) => setCustomer("address", e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Location</span>
        {visit.location ? (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-settled" aria-hidden />
            <a
              className="font-mono underline-offset-2 hover:underline"
              href={`https://maps.google.com/?q=${visit.location.latitude},${visit.location.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              {visit.location.latitude}, {visit.location.longitude}
            </a>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onChange({ location: null })}>
              Clear
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="justify-start" onClick={locate} disabled={locating}>
            <LocateFixed className="mr-2 h-4 w-4" aria-hidden />
            {locating ? "Finding location…" : "Use this phone's location"}
          </Button>
        )}
        {locError && <p className="text-sm text-fault">{locError}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-notes">Notes</Label>
        <Textarea id="c-notes" rows={3} value={visit.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </div>
    </fieldset>
  );
}
