import { useCallback, useEffect, useRef, useState } from "react";
import { bluetoothAvailable, connectDevice, type Connection } from "./ble";
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
      const err = e as Error;
      setState({
        kind: "idle",
        error:
          err.name === "NotFoundError"
            ? undefined
            : err.name === "SecurityError"
              ? "Bluetooth isn't allowed on this page. Open the app itself in Chrome (not inside another app)."
              : `Couldn't connect: ${err.message}`,
      });
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
