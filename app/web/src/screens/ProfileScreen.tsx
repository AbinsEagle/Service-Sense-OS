import { useState } from "react";
import { ChevronLeft, FileText, MapPin, Smartphone } from "lucide-react";
import { BRAND } from "@/config/brand";
import { Button, IconButton, TextField, TopAppBar } from "@/components/m3";
import type { Technician } from "@/lib/types";
import { validMobile } from "@/lib/validate";

const GUEST: Technician = { name: "", mobile: "" };

// Technician profile (feature list Q2): name and mobile, stamped on every report.
// First run offers "Skip for now"; it can be filled in later from the profile icon.
export function ProfileScreen({ initial, onSave, onBack }: { initial: Technician | null; onSave(t: Technician): void; onBack?: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [touched, setTouched] = useState(false);
  const firstRun = !onBack;
  const mobileError = touched && !validMobile(mobile) ? "Enter the 10-digit mobile number" : null;
  const nameError = touched && !name.trim() ? "Enter your name" : null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (name.trim() && validMobile(mobile)) onSave({ name: name.trim(), mobile });
  };

  return (
    <div className="flex min-h-svh flex-col">
      {firstRun ? (
        <div className="h-[max(24px,env(safe-area-inset-top))]" />
      ) : (
        <TopAppBar
          leading={
            <IconButton label="Back" onClick={onBack}>
              <ChevronLeft />
            </IconButton>
          }
          title="Technician profile"
        />
      )}

      <form onSubmit={save} noValidate className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        {firstRun && (
          <header className="pb-8 pt-6 [@media(max-height:720px)]:pb-4 [@media(max-height:720px)]:pt-0">
            <AppMark />
            <p className="mt-6 text-sm font-medium text-primary">{BRAND.name}</p>
            <h1 className="mt-1 text-[36px] font-normal leading-[44px] text-on-surface">Site check</h1>
            <p className="mt-3 text-base text-on-surface-variant">Measure the site before you install, and send the customer a clear report.</p>
            <ul className="mt-6 grid gap-3 text-sm text-on-surface-variant [@media(max-height:720px)]:hidden">
              <Point icon={<Smartphone className="h-4 w-4" />}>Works with the Service Sense device over Bluetooth</Point>
              <Point icon={<MapPin className="h-4 w-4" />}>Records the site location with every check</Point>
              <Point icon={<FileText className="h-4 w-4" />}>Shares a report image on WhatsApp</Point>
            </ul>
          </header>
        )}

        <section className="grid gap-5 pt-2">
          {firstRun && <h2 className="text-base font-medium text-on-surface">Your details for the reports</h2>}
          <TextField label="Your name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" error={nameError} />
          <TextField
            label="Mobile number"
            required
            prefix="+91"
            inputMode="numeric"
            autoComplete="tel-national"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "").slice(0, 10))}
            error={mobileError}
            supporting="Shown on reports. Verification comes in a later update."
          />
        </section>

        {/* pinned to the bottom so Continue and Skip are visible even on small phones */}
        <div className="sticky bottom-0 -mx-6 mt-auto grid gap-1 bg-surface px-6 pb-[max(12px,env(safe-area-inset-bottom))] pt-4">
          <Button type="submit" size="lg" className="w-full">
            {firstRun ? "Continue" : "Save"}
          </Button>
          {firstRun && (
            <Button type="button" variant="text" className="w-full" onClick={() => onSave(GUEST)}>
              Skip for now
            </Button>
          )}
          {firstRun && <p className="pt-1 text-center text-xs text-on-surface-variant">You can add your details later from the profile icon.</p>}
        </div>
      </form>
    </div>
  );
}

function Point({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container" aria-hidden>
        {icon}
      </span>
      {children}
    </li>
  );
}

// The app icon: the device's traffic light on the brand blue.
function AppMark() {
  return (
    <span className="inline-flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-lg bg-primary-container shadow-e1" aria-hidden>
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff8a80]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#ffd54f]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#69f0ae]" />
    </span>
  );
}
