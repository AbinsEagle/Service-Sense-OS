import { useCallback, useEffect, useRef, useState } from "react";
import { bluetoothAvailable, connectDevice, ConnectError, type Connection } from "./ble";
import { simulate } from "./simulator";
import type { DeviceMessage, DeviceSensor } from "./types";

export type DeviceState =
  | { kind: "idle"; error?: string }
  | { kind: "connecting" }
  | { kind: "connected"; name: string; unit?: string }
  | { kind: "simulating" };

// The Bluetooth link to SSOS_B1.0, kept for the whole check so moving between steps doesn't drop it.
export function useDevice(onMessage: (m: DeviceMessage) => void) {
  const [state, setState] = useState<DeviceState>({ kind: "idle" });
  const [simMeasuring, setSimMeasuring] = useState<DeviceSensor | null>(null);
  const conn = useRef<Connection | null>(null);
  const leaving = useRef(false);
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => () => conn.current?.disconnect(), []);

  const connect = useCallback(async (): Promise<boolean> => {
    setState({ kind: "connecting" });
    try {
      conn.current = await connectDevice(
        (m) => {
          handler.current(m);
          setState((s) => (s.kind === "connected" ? { ...s, unit: m.dev } : s));
        },
        () => {
          conn.current = null;
          setState(leaving.current ? { kind: "idle" } : { kind: "idle", error: "The device disconnected. Readings taken so far are kept; connect again to continue." });
          leaving.current = false;
        },
      );
      setState({ kind: "connected", name: conn.current.name });
      return true;
    } catch (e) {
      try {
        conn.current?.disconnect();
      } catch {
        /* half-open link */
      }
      conn.current = null;
      setState({ kind: "idle", error: connectErrorText(e) });
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    leaving.current = true;
    conn.current?.disconnect();
    if (!conn.current) setState({ kind: "idle" });
  }, []);

  const startSimulating = useCallback(() => {
    if (conn.current) {
      leaving.current = true;
      conn.current.disconnect();
    }
    setState({ kind: "simulating" });
  }, []);

  // Simulated button press: a short "measuring" pause, then a made-up final reading.
  const simulatePress = useCallback((sensor: DeviceSensor) => {
    setSimMeasuring(sensor);
    setTimeout(() => {
      setSimMeasuring(null);
      handler.current(simulate(sensor));
    }, sensor === "VOLT" ? 1600 : 1100);
  }, []);

  return { state, connect, disconnect, startSimulating, stopSimulating: () => setState({ kind: "idle" }), simulatePress, simMeasuring, btAvailable: bluetoothAvailable() };
}

export type Device = ReturnType<typeof useDevice>;
export const deviceReady = (d: Device) => d.state.kind === "connected" || d.state.kind === "simulating";

// What the technician sees when Connect fails. Cancelling the device list is not an error.
export function connectErrorText(e: unknown): string | undefined {
  const err = e instanceof ConnectError ? e : new ConnectError("choose", e);
  const text = `${err.name} ${err.message}`;
  if (err.name === "NotFoundError" || /cancel/i.test(text)) return undefined;
  if (err.name === "SecurityError") return "Bluetooth isn't allowed on this page. Open the app itself in Chrome or Bluefy (not inside another app).";
  if (err.step === "choose") return `Couldn't open the device list (${err.message}). Turn Bluetooth on, allow it for this browser, then try again.`;
  if (err.step === "connect") return `Found the device but couldn't connect (${err.message}). Keep it switched on and close by, then try again.`;
  return `Connected, but the device didn't answer as expected (${err.message}). Restart the device and try again; if it repeats, the firmware may be out of date.`;
}
