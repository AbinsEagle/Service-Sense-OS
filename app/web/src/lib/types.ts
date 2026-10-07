// The device's Bluetooth message (firmware/ssos_main), one JSON object per line:
//   {"dev":"F294","fw":"0.4.0","sensor":"TDS","value":58,"unit":"ppm","status":"settled","temp":25.3}
export type DeviceSensor = "TEMP" | "TDS" | "VOLT" | "PRESS";
export type Sensor = DeviceSensor | "SOUND";
export type Status = "settled" | "unstable" | "fault";

export interface DeviceMessage {
  dev: string;
  fw: string;
  sensor: DeviceSensor;
  value: number | null; // null on a fault
  unit: string;
  status: Status;
  temp?: number; // TDS: water temperature used for compensation
  min?: number; // VOLT
  max?: number; // VOLT
  cal?: boolean; // VOLT: false while the ZMPT101B is uncalibrated
}

// What the backend stores: the message as received, plus when the phone got it.
export interface Reading extends Partial<Omit<DeviceMessage, "sensor">> {
  sensor: Sensor;
  value: number | null;
  unit: string;
  taken_at: string;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

export const SENSORS: { key: Sensor; label: string; unit: string; button?: number }[] = [
  { key: "TEMP", label: "Water temp", unit: "°C", button: 1 },
  { key: "TDS", label: "TDS", unit: "ppm", button: 2 },
  { key: "VOLT", label: "Supply voltage", unit: "V", button: 3 },
  { key: "PRESS", label: "Inlet pressure", unit: "bar", button: 4 },
  { key: "SOUND", label: "Sound level", unit: "dB" },
];
