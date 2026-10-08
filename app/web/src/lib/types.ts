// The device's Bluetooth message (firmware/ssos_main), one JSON object per line:
//   {"dev":"F294","fw":"0.4.0","sensor":"TDS","value":58,"unit":"ppm","status":"settled","temp":25.3}
export type DeviceSensor = "TEMP" | "TDS" | "VOLT" | "PRESS";
export type Sensor = DeviceSensor | "SOUND"; // SOUND comes from the phone microphone
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

export interface Reading extends Omit<DeviceMessage, "sensor"> {
  sensor: Sensor;
  taken_at: string; // when the phone received it
}

export type CategoryId = "heater" | "purifier" | "pump" | "stabilizer" | "chimney";

export interface Technician {
  name: string;
  mobile: string; // 10 digits, Indian mobile
}

export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number; // metres
  at: string;
}

export interface Check {
  id: string;
  createdAt: string;
  finishedAt?: string;
  brand: string; // stored from day one so multi-brand is a settings change (feature list Q2)
  technician: Technician;
  product: { serial: string; categoryId: CategoryId | null; modelId: string | null };
  customer: { name: string; phone: string; address: string; notes: string };
  location: GeoFix | null;
  readings: Partial<Record<Sensor, Reading>>; // latest per sensor; a re-take replaces it
  log: Reading[]; // everything received, newest first
  ph: number | null; // from an indicator paper strip, optional (Q19)
  step: number; // furthest step reached, 0..4
}
