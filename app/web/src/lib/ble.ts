import type { DeviceMessage } from "./types";

// Must match firmware/ssos_main.
export const BLE_NAME = "SSOS_B1.0";
const SERVICE = "6f1b0001-8c3a-4d7e-9a52-0b1d5c7e4a10";
const READING = "6f1b0002-8c3a-4d7e-9a52-0b1d5c7e4a10";

// Web Bluetooth isn't in TypeScript's DOM types yet; this is the slice we use.
interface BtCharacteristic extends EventTarget {
  value: DataView;
  startNotifications(): Promise<unknown>;
}
interface BtDevice extends EventTarget {
  name?: string;
  gatt: {
    connected: boolean;
    connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtCharacteristic> }> }>;
    disconnect(): void;
  };
}
type Bluetooth = { requestDevice(o: object): Promise<BtDevice> };

export function bluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && Boolean((navigator as unknown as { bluetooth?: unknown }).bluetooth);
}

export interface Connection {
  name: string;
  disconnect(): void;
}

// Messages arrive split into 20-byte notifications; each ends with "\n".
export function lineSplitter(onLine: (line: string) => void) {
  const decoder = new TextDecoder();
  let buf = "";
  return (chunk: DataView) => {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onLine(line);
    }
    if (buf.length > 1024) buf = ""; // never grow without bound on garbage
  };
}

export function parseMessage(line: string): DeviceMessage | null {
  try {
    const m = JSON.parse(line);
    if (typeof m?.sensor !== "string" || typeof m?.unit !== "string") return null;
    return m as DeviceMessage;
  } catch {
    return null;
  }
}

export async function connectDevice(
  onMessage: (m: DeviceMessage) => void,
  onDisconnect: () => void,
): Promise<Connection> {
  const bt = (navigator as unknown as { bluetooth: Bluetooth }).bluetooth;
  const device = await bt.requestDevice({ filters: [{ name: BLE_NAME }], optionalServices: [SERVICE] });
  device.addEventListener("gattserverdisconnected", onDisconnect);
  const server = await device.gatt.connect();
  const ch = await (await server.getPrimaryService(SERVICE)).getCharacteristic(READING);
  const feed = lineSplitter((line) => {
    const m = parseMessage(line);
    if (m) onMessage(m);
  });
  ch.addEventListener("characteristicvaluechanged", (e) => feed((e.target as BtCharacteristic).value));
  await ch.startNotifications();
  return {
    name: device.name ?? BLE_NAME,
    disconnect: () => device.gatt.connected && device.gatt.disconnect(),
  };
}
