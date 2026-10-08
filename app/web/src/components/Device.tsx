import { useState } from "react";
import { Bluetooth, BluetoothConnected, BluetoothOff, FlaskConical } from "lucide-react";
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
      {device.btAvailable ? (
        <p className="text-sm text-on-surface-variant">
          Switch the device on, tap Connect, then choose <b className="text-on-surface">{BLE_NAME}</b> in the list.
        </p>
      ) : (
        <p className="flex gap-2 text-sm text-on-surface-variant">
          <BluetoothOff className="h-4 w-4 shrink-0" aria-hidden />
          {isIOS()
            ? "Safari and Chrome on iPhone can't use Bluetooth. Install the free Bluefy browser from the App Store and open this same link in it."
            : "This browser can't use Bluetooth. Open the app in Chrome on Android."}
        </p>
      )}
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
    </div>
  );
}
