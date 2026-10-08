import { useCallback, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { category } from "@/config/catalog";
import { Button, Dialog, IconButton, Snackbar, TopAppBar } from "@/components/m3";
import { StepTracker, type StepState } from "@/components/StepTracker";
import { isSettled, requiredSensors } from "@/lib/evaluate";
import { rememberModel, withReading } from "@/lib/store";
import type { Check } from "@/lib/types";
import { useDevice } from "@/lib/useDevice";
import { validMobile } from "@/lib/validate";
import { ReportPreview } from "../ReportPreview";
import { CustomerStep } from "./CustomerStep";
import { ProductStep } from "./ProductStep";
import { ReadingsStep } from "./ReadingsStep";
import { ResultStep } from "./ResultStep";

const STEPS = ["Product", "Customer", "Readings", "Result", "Share"];

const valid = (c: Check) => [
  Boolean(c.product.serial.trim() && c.product.categoryId && c.product.modelId),
  Boolean(c.customer.name.trim() && validMobile(c.customer.phone) && c.location),
  requiredSensors(c).length > 0 && requiredSensors(c).every((s) => isSettled(c.readings[s])),
  true,
  Boolean(c.finishedAt),
];

const blocker = (c: Check, step: number): string | null => {
  if (step === 0) {
    if (!c.product.serial.trim()) return "Scan or type the serial number";
    if (!c.product.categoryId) return "Pick the product type";
    if (!c.product.modelId) return "Pick the model";
  }
  if (step === 1) {
    if (!c.customer.name.trim()) return "Enter the customer's name";
    if (!validMobile(c.customer.phone)) return "Enter the customer's mobile";
    if (!c.location) return "Capture the site location";
  }
  if (step === 2) {
    const left = requiredSensors(c).filter((s) => !isSettled(c.readings[s])).length;
    if (left) return `${left} reading${left > 1 ? "s" : ""} still to take`;
  }
  return null;
};

// Step-by-step site check with an always-visible tracker (UI plan U1).
export function CheckFlow({
  check,
  setCheck,
  onExit,
  onFinish,
}: {
  check: Check;
  setCheck(f: (c: Check) => Check): void;
  onExit(): void;
  onFinish(c: Check): void;
}) {
  const finished = Boolean(check.finishedAt);
  const [step, setStep] = useState(finished ? 4 : Math.min(check.step, 3));
  const [showErrors, setShowErrors] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const device = useDevice((m) => setCheck((c) => (c.finishedAt ? c : withReading(c, { ...m, taken_at: new Date().toISOString() }))));
  const notify = useCallback((m: string) => setToast(m), []);

  const ok = valid(check);
  const go = (i: number) => {
    setShowErrors(false);
    setStep(i);
    setCheck((c) => ({ ...c, step: Math.max(c.step, i) }));
    window.scrollTo({ top: 0 });
  };
  const next = () => {
    if (!ok[step]) return setShowErrors(true);
    if (step === 0 && check.product.modelId) rememberModel(check.product.modelId);
    if (step === 3) {
      const done = { ...check, finishedAt: new Date().toISOString(), step: 4 };
      setCheck(() => done);
      onFinish(done);
      device.disconnect();
      return setStep(4);
    }
    go(step + 1);
  };

  const states: { label: string; state: StepState; reachable: boolean }[] = STEPS.map((label, i) => ({
    label,
    reachable: finished ? i === 4 : i <= check.step && i !== 4,
    state:
      i === step
        ? "current"
        : finished || (i <= check.step && ok[i])
          ? "done"
          : i <= check.step && i < step
            ? "attention"
            : i <= check.step && !ok[i] && i < 3
              ? "attention"
              : "todo",
  }));

  const why = blocker(check, step);
  const cat = category(check.product.categoryId);

  return (
    <div className="min-h-svh pb-32">
      <div className="sticky top-0 z-30 bg-surface shadow-[0_1px_0_var(--md-outline-variant)]">
        <TopAppBar
          leading={
            finished ? (
              <IconButton label="Close" onClick={onExit}>
                <X />
              </IconButton>
            ) : (
              <IconButton label={step === 0 ? "Close check" : "Back"} onClick={() => (step === 0 ? setConfirmExit(true) : go(step - 1))}>
                {step === 0 ? <X /> : <ChevronLeft />}
              </IconButton>
            )
          }
          title={["Product", "Customer & site", "Site readings", "Result", "Share report"][step]}
          subtitle={[check.customer.name, cat?.name, check.product.serial].filter(Boolean).join(" · ") || "New site check"}
        />
        <StepTracker steps={states} onSelect={go} />
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {step === 0 && <ProductStep check={check} update={(p) => setCheck((c) => ({ ...c, product: { ...c.product, ...p } }))} notify={notify} />}
        {step === 1 && (
          <CustomerStep
            check={check}
            showErrors={showErrors}
            update={(p) => setCheck((c) => ({ ...c, customer: { ...c.customer, ...p } }))}
            setLocation={(g) => setCheck((c) => ({ ...c, location: g }))}
          />
        )}
        {step === 2 && <ReadingsStep check={check} device={device} setPh={(ph) => setCheck((c) => ({ ...c, ph }))} />}
        {step === 3 && <ResultStep check={check} />}
        {step === 4 && <ReportPreview check={check} />}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {step < 4 ? (
            <>
              <p className="mr-auto text-sm text-on-surface-variant">{why ?? (step === 3 ? "Finishing locks the readings" : "Ready")}</p>
              <Button size="lg" onClick={next} className={why ? "!bg-surface-container-highest !text-on-surface-variant" : undefined}>
                {step === 3 ? "Finish check" : "Next"}
              </Button>
            </>
          ) : (
            <>
              <p className="mr-auto text-sm text-on-surface-variant">Saved in history on this phone</p>
              <Button size="lg" variant="tonal" onClick={onExit}>
                Done
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="Leave this check?"
        actions={
          <>
            <Button variant="text" onClick={() => setConfirmExit(false)}>
              Stay
            </Button>
            <Button variant="text" onClick={onExit}>
              Leave
            </Button>
          </>
        }
      >
        It stays saved on this phone. Continue it from the home screen.
      </Dialog>
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
