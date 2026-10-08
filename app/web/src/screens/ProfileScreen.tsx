import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { BRAND } from "@/config/brand";
import { Button, IconButton, TextField, TopAppBar } from "@/components/m3";
import type { Technician } from "@/lib/types";
import { validMobile } from "@/lib/validate";

// First run (once): the technician's name and mobile, stamped on every check (feature list Q2).
export function ProfileScreen({ initial, onSave, onBack }: { initial: Technician | null; onSave(t: Technician): void; onBack?: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [touched, setTouched] = useState(false);
  const mobileError = touched && !validMobile(mobile) ? "Enter the 10-digit mobile number" : null;
  const nameError = touched && !name.trim() ? "Enter your name" : null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (name.trim() && validMobile(mobile)) onSave({ name: name.trim(), mobile });
  };

  return (
    <div className="min-h-svh">
      {onBack ? (
        <TopAppBar leading={<IconButton label="Back" onClick={onBack}><ChevronLeft /></IconButton>} title="Technician profile" />
      ) : (
        <div className="h-6" />
      )}
      <form onSubmit={save} className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-md gap-6 px-4 pb-10 pt-4">
        {!onBack && (
          <header className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <p className="text-sm font-medium text-primary">{BRAND.name} · Service Sense OS</p>
            <h1 className="text-[32px] leading-10 text-on-surface">Welcome</h1>
            <p className="text-on-surface-variant">Set up once on this phone. Your name and number go on every site check report.</p>
          </header>
        )}
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
          supporting="Verification by OTP comes in a later update."
        />
        <Button type="submit" size="lg" className="w-full">
          {onBack ? "Save" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
