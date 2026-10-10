import { useCallback, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { FEATURES } from "@/config/features";
import { DeviceChip } from "@/components/Device";
import { Button, Dialog, IconButton, Snackbar, TopAppBar } from "@/components/m3";
import { Progress, type StepState } from "@/components/Progress";
import { isDone, requiredSensors } from "@/lib/evaluate";
import { rememberModel, withReading } from "@/lib/store";
import type { Check } from "@/lib/types";
import { deviceReady, type Device } from "@/lib/useDevice";
import { validMobile } from "@/lib/validate";
import { CustomerStep } from "./CustomerStep";
import { ProductStep } from "./ProductStep";
import { ReadingsStep } from "./ReadingsStep";
import { ResultStep } from "./ResultStep";

type StepId = "product" | "customer" | "readings" | "result";
// Customer step is hidden for now (FEATURES.customerStep); location lives in the Product step.
const STEPS: { id: StepId; title: string }[] = [
  { id: "product", title: "Product & site" },
  ...(FEATURES.customerStep ? [{ id: "customer" as const, title: "Customer" }] : []),
  { id: "readings", title: "Site readings" },
  { id: "result", title: "Result" },
];

function blocker(c: Check, id: StepId, ready: boolean): string | null {
  if (id === "product") {
    if (!c.product.serial.trim()) return "Add the serial number";
    if (!c.product.categoryId) return "Pick the product type";
    if (!c.product.modelId) return "Pick the model";
    if (!c.location) return "Capture the site location";
  }
  if (id === "customer") {
    if (!c.customer.name.trim()) return "Enter the customer's name";
    if (!validMobile(c.customer.phone)) return "Enter the customer's mobile";
  }
  if (id === "readings") {
    const left = requiredSensors(c).filter((s) => !isDone(c, c.readings[s])).length;
    if (left) return `Take ${left} more reading${left > 1 ? "s" : ""}`;
  }
  // No check moves on without a live device link (or the training simulator).
  if (id !== "result" && !c.finishedAt && !ready) return "Connect the device to continue";
  return null;
}

// Step-by-step site check (UI plan U1, U7): thin progress bar, one button at the bottom.
export function CheckFlow({
  check,
  setCheck,
  device,
  onExit,
  onFinish,
}: {
  check: Check;
  setCheck(f: (c: Check) => Check): void;
  device: Device;
  onExit(): void;
  onFinish(c: Check): void;
}) {
  const last = STEPS.length - 1;
  const [step, setStep] = useState(Math.min(check.step, last));
  const [toast, setToast] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const notify = useCallback((m: string) => setToast(m), []);
  const finished = Boolean(check.finishedAt);
  const id = STEPS[step].id;
  const ready = deviceReady(device);
  const why = blocker(check, id, ready);

  const go = (i: number) => {
    setStep(i);
    setCheck((c) => ({ ...c, step: Math.max(c.step, i) }));
    window.scrollTo({ top: 0 });
  };
  const next = () => {
    if (why) return;
    if (id === "product" && check.product.modelId) rememberModel(check.product.modelId);
    go(step + 1);
  };
  const finish = () => {
    if (finished) return check;
    const done = { ...check, finishedAt: new Date().toISOString() };
    setCheck(() => done);
    onFinish(done);
    return done;
  };

  const steps = STEPS.map((s, i) => {
    const reached = i <= check.step;
    const state: StepState = i === step ? "current" : reached && blocker(check, s.id, ready) && i < step ? "attention" : reached || finished ? "done" : "todo";
    return { label: s.title, state, reachable: !finished && reached };
  });

  return (
    <div className={id === "result" ? "min-h-svh pb-40" : "min-h-svh pb-28"}>
      <div className="sticky top-0 z-30 bg-surface">
        <TopAppBar
          leading={
            <IconButton label={step === 0 || finished ? "Close" : "Back"} onClick={() => (finished ? onExit() : step === 0 ? setConfirmExit(true) : go(step - 1))}>
              {step === 0 || finished ? <X /> : <ChevronLeft />}
            </IconButton>
          }
          title={STEPS[step].title}
          trailing={<DeviceChip device={device} />}
        />
        <Progress steps={steps} onSelect={go} />
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {id === "product" && (
          <ProductStep
            check={check}
            update={(p) => setCheck((c) => ({ ...c, product: { ...c.product, ...p } }))}
            setLocation={(g) => setCheck((c) => ({ ...c, location: g }))}
            notify={notify}
          />
        )}
        {id === "customer" && (
          <CustomerStep check={check} showErrors={false} update={(p) => setCheck((c) => ({ ...c, customer: { ...c.customer, ...p } }))} />
        )}
        {id === "readings" && (
          <ReadingsStep check={check} device={device} setPh={(ph) => setCheck((c) => ({ ...c, ph }))} addReading={(r) => setCheck((c) => withReading(c, r))} />
        )}
        {id === "result" && <ResultStep check={check} finish={finish} onDone={onExit} notify={notify} />}
      </main>

      {id !== "result" && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-2xl">
            <Button size="lg" className="w-full" onClick={next} disabled={Boolean(why)}>
              {why ?? "Next"}
            </Button>
          </div>
        </div>
      )}

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
