import { useState } from "react";
import { Bluetooth, BluetoothConnected, BluetoothOff, Check, Copy, FlaskConical, HelpCircle } from "lucide-react";
import { BLE_NAME } from "@/lib/ble";
import { isIOS } from "@/lib/platform";
import type { Device } from "@/lib/useDevice";
import { cn } from "@/lib/utils";
import { BottomSheet, Button } from "./m3";


// Device status in the top bar of every screen; tap to connect / disconnect.
export function DeviceChip({ device }: { device: Device }) {
  const [open, setOpen] = useState(false);
  const s = device.state;
  const label = s.kind === "connected" ? s.unit ?? "Connected" : s.kind === "simulating" ? "Simulator" : s.kind === "connecting" ? "Connecting…" : "Connect";
  const Icon = s.kind === "connected" ? BluetoothConnected : s.kind === "simulating" ? FlaskConical : Bluetooth;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Device: ${s.kind === "connected" ? `connected to ${s.name}` : s.kind === "simulating" ? "simulator" : "not connected"}`}
        className={cn(
          "state mr-0.5 inline-flex h-9 items-center gap-1 rounded-sm px-2.5 text-sm font-medium",
          s.kind === "connected" && "bg-ok-container text-on-ok-container",
          s.kind === "simulating" && "bg-warn-container text-on-warn-container",
          (s.kind === "idle" || s.kind === "connecting") && "border border-outline text-primary",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {/* very narrow phones: icon only (the colour still shows the state) */}
        <span className="max-[379px]:hidden">{label}</span>
      </button>
      <DeviceSheet open={open} onClose={() => setOpen(false)} device={device} />
    </>
  );
}

export function DeviceSheet({ open, onClose, device }: { open: boolean; onClose(): void; device: Device }) {
  const s = device.state;
  return (
    <BottomSheet open={open} onClose={onClose} title="Device">
      <DeviceControls device={device} onDone={onClose} />
      {s.kind !== "simulating" && (
        <button
          onClick={() => {
            device.startSimulating();
            onClose();
          }}
          className="state mt-4 inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm text-on-surface-variant"
        >
          <FlaskConical className="h-4 w-4" aria-hidden /> Use simulator for training
        </button>
      )}
    </BottomSheet>
  );
}

// Connect / status / disconnect: used in the sheet and on Home.
export function DeviceControls({ device, onDone }: { device: Device; onDone?: () => void }) {
  const s = device.state;
  if (s.kind === "connected")
    return (
      <div className="grid gap-4">
        <p className="text-on-surface">
          Connected to <b>{s.name}</b>
          {s.unit && <span className="text-on-surface-variant"> · unit {s.unit}</span>}
        </p>
        <Button variant="outlined" onClick={device.disconnect}>
          Disconnect
        </Button>
      </div>
    );
  if (s.kind === "simulating")
    return (
      <div className="grid gap-4">
        <p className="text-on-surface">Simulator on. Readings are made up and the report is marked training only.</p>
        <Button variant="outlined" onClick={device.stopSimulating}>
          Stop simulator
        </Button>
      </div>
    );
  return (
    <div className="grid gap-3">
      {!device.btAvailable && <NoBluetooth />}
      <Button
        size="lg"
        icon={<Bluetooth className="h-5 w-5" />}
        disabled={!device.btAvailable || s.kind === "connecting"}
        onClick={async () => {
          if (await device.connect()) onDone?.();
        }}
      >
        {s.kind === "connecting" ? "Connecting…" : "Connect device"}
      </Button>
      {s.kind === "idle" && s.error && <p className="text-sm text-error">{s.error}</p>}
      <HelpLink className="justify-self-start" />
    </div>
  );
}

const BLUEFY_URL = "https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055";

// Home before a device is connected: one centred action; the technical details live in "Connection help".
export function ConnectHero({ device }: { device: Device }) {
  const s = device.state;
  const connecting = s.kind === "connecting";
  const supported = device.btAvailable;
  return (
    <section className="flex min-h-[62svh] flex-col items-center justify-center px-2 text-center" aria-label="Connect the device">
      <span className="relative flex h-24 w-24 items-center justify-center">
        {supported && (
          <span
            className={cn(
              "absolute inset-0 rounded-full bg-primary/15 motion-reduce:hidden",
              connecting ? "animate-ping" : "animate-[pulse_3s_ease-in-out_infinite]",
            )}
            aria-hidden
          />
        )}
        <span
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full",
            supported ? "bg-primary-container text-on-primary-container" : "bg-surface-container-highest text-on-surface-variant",
          )}
        >
          {supported ? <Bluetooth className="h-9 w-9" aria-hidden /> : <BluetoothOff className="h-9 w-9" aria-hidden />}
        </span>
      </span>

      <h2 className="mt-6 text-[28px] leading-9 text-on-surface">{supported ? "Connect your device" : isIOS() ? "Open in Bluefy" : "Bluetooth not available"}</h2>
      <p className="mt-2 max-w-xs text-base text-on-surface-variant">
        {supported
          ? "Switch on the Service Sense device and keep it close to your phone."
          : isIOS()
            ? "iPhone browsers can't use Bluetooth. Open this page in the free Bluefy browser."
            : "This browser can't use Bluetooth. Open this page in Chrome."}
      </p>

      <div className="mt-8 grid w-full max-w-xs gap-2">
        {supported ? (
          <Button size="lg" icon={connecting ? undefined : <Bluetooth className="h-5 w-5" />} disabled={connecting} onClick={() => device.connect()}>
            {connecting ? "Connecting…" : "Connect device"}
          </Button>
        ) : (
          <>
            {isIOS() && (
              <Button size="lg" onClick={() => window.open(BLUEFY_URL, "_blank", "noopener")}>
                Get Bluefy
              </Button>
            )}
            <CopyLink />
          </>
        )}
        {s.kind === "idle" && s.error && (
          <p className="pt-2 text-sm text-error" role="alert">
            {s.error}
          </p>
        )}
      </div>

      <div className="mt-6 grid justify-items-center text-sm">
        <HelpLink />
        <button onClick={device.startSimulating} className="state rounded-full px-3 py-2 text-on-surface-variant">
          Practice with simulator
        </button>
      </div>
    </section>
  );
}

function NoBluetooth() {
  return (
    <p className="flex gap-2 text-sm text-on-surface-variant">
      <BluetoothOff className="h-4 w-4 shrink-0" aria-hidden />
      {isIOS() ? "iPhone browsers can't use Bluetooth. Open this page in the free Bluefy browser." : "This browser can't use Bluetooth. Open this page in Chrome."}
    </p>
  );
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outlined"
      size="lg"
      icon={copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          setCopied(true);
        } catch {
          /* clipboard blocked: the address bar still has the link */
        }
      }}
    >
      {copied ? "Link copied" : "Copy this link"}
    </Button>
  );
}

function HelpLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={cn("state inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-primary", className)}>
        <HelpCircle className="h-4 w-4" aria-hidden /> Connection help
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Connection help">
        <ol className="grid gap-4 text-sm text-on-surface-variant">
          <Tip n={1} title="Switch the device on">Keep it within a few metres of the phone.</Tip>
          <Tip n={2} title={`Choose ${BLE_NAME}`}>After you tap Connect, pick it from the list the browser shows.</Tip>
          <Tip n={3} title="iPhone: use Bluefy">
            Safari and Chrome on iPhone can't use Bluetooth. In Bluefy, allow Bluetooth when asked (iPhone Settings → Bluefy → Bluetooth).
          </Tip>
          <Tip n={4} title="Android: use Chrome">Turn on Bluetooth and Location, and allow Nearby devices for Chrome.</Tip>
          <Tip n={5} title="One phone at a time">If another phone or tab is connected, disconnect it first.</Tip>
          <Tip n={6} title="Still not connecting?">Switch the device off and on again, then tap Connect.</Tip>
        </ol>
      </BottomSheet>
    </>
  );
}

function Tip({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container text-xs font-medium text-on-secondary-container">{n}</span>
      <span>
        <b className="block font-medium text-on-surface">{title}</b>
        {children}
      </span>
    </li>
  );
}
