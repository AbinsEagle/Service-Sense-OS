import { Bluetooth, BluetoothOff, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLE_NAME } from "@/lib/ble";

interface Props {
  connected: { name: string; unit?: string } | null;
  connecting: boolean;
  simulating: boolean;
  btAvailable: boolean;
  error: string | null;
  onConnect(): void;
  onDisconnect(): void;
  onSimulate(on: boolean): void;
}

export function DevicePanel({ connected, connecting, simulating, btAvailable, error, onConnect, onDisconnect, onSimulate }: Props) {
  if (simulating) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-unstable/60 bg-card px-4 py-3">
        <FlaskConical className="h-5 w-5 shrink-0 text-unstable" aria-hidden />
        <div className="mr-auto">
          <p className="font-medium">Simulated device</p>
          <p className="text-sm text-muted-foreground">Tap Simulate on a reading. Values are made up.</p>
        </div>
        <Button variant="outline" onClick={() => onSimulate(false)}>
          Stop
        </Button>
      </div>
    );
  }
  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-4 py-3">
        <span className="relative flex h-3 w-3" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-settled opacity-40 motion-reduce:animate-none" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-settled" />
        </span>
        <div className="mr-auto">
          <p className="font-medium">
            Connected to <span className="font-mono">{connected.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {connected.unit ? (
              <>
                Unit <span className="font-mono">{connected.unit}</span> · press a button on the device
              </>
            ) : (
              "Press a button on the device to take a reading"
            )}
          </p>
        </div>
        <Button variant="outline" onClick={onDisconnect}>
          Disconnect
        </Button>
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-card px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" className="h-12 px-5 text-base" onClick={onConnect} disabled={!btAvailable || connecting}>
          <Bluetooth className="mr-2 h-5 w-5" aria-hidden />
          {connecting ? "Connecting…" : "Connect device"}
        </Button>
        <Button variant="ghost" onClick={() => onSimulate(true)}>
          <FlaskConical className="mr-2 h-4 w-4" aria-hidden />
          Simulate
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {btAvailable ? (
          <>
            Switch the device on, tap Connect and choose <span className="font-mono">{BLE_NAME}</span>. It won't show in the
            phone's Bluetooth settings, only here.
          </>
        ) : (
          <span className="inline-flex items-start gap-2">
            <BluetoothOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            This browser can't use Bluetooth. Use Chrome on Android, or the Bluefy browser on iPhone.
          </span>
        )}
      </p>
      {error && <p className="mt-2 text-sm text-fault">{error}</p>}
    </div>
  );
}
