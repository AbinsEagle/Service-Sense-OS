import { TextField } from "@/components/m3";
import type { Check, GeoFix } from "@/lib/types";
import { validMobile } from "@/lib/validate";
import { LocationField } from "./LocationField";

export function CustomerStep({
  check,
  update,
  setLocation,
  showErrors,
}: {
  check: Check;
  update(c: Partial<Check["customer"]>): void;
  setLocation(g: GeoFix | null): void;
  showErrors: boolean;
}) {
  const c = check.customer;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <TextField label="Customer name" required value={c.name} onChange={(e) => update({ name: e.target.value })} autoComplete="off" error={showErrors && !c.name.trim() ? "Enter the customer's name" : null} />
      <TextField
        label="Customer mobile"
        required
        prefix="+91"
        inputMode="numeric"
        value={c.phone}
        onChange={(e) => update({ phone: e.target.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "").slice(0, 10) })}
        error={showErrors && !validMobile(c.phone) ? "Enter the 10-digit mobile number" : null}
        supporting="The report is sent to this WhatsApp number"
      />
      <TextField label="Address" multiline value={c.address} onChange={(e) => update({ address: e.target.value })} />
      <LocationField value={check.location} onChange={setLocation} showError={showErrors} />
      <TextField label="Notes" multiline value={c.notes} onChange={(e) => update({ notes: e.target.value })} supporting="Optional, for your own records" />
    </div>
  );
}
