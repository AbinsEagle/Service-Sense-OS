import { API_URL } from "./config";
import type { Customer, GeoLocation, Reading } from "./types";

export interface VisitPayload {
  id: string; // generated once per visit, so a retried save is never stored twice
  customer: { name: string; phone?: string; address?: string };
  location?: GeoLocation;
  notes?: string;
  started_at: string;
  readings: Reading[];
}

export function buildPayload(v: {
  id: string;
  customer: Customer;
  location: GeoLocation | null;
  notes: string;
  startedAt: string;
  readings: Reading[];
}): VisitPayload {
  const blank = (s: string) => (s.trim() ? s.trim() : undefined);
  return {
    id: v.id,
    customer: { name: v.customer.name.trim(), phone: blank(v.customer.phone), address: blank(v.customer.address) },
    location: v.location ?? undefined,
    notes: blank(v.notes),
    started_at: v.startedAt,
    readings: v.readings,
  };
}

export class SaveError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

export async function submitVisit(payload: VisitPayload, accessToken: string): Promise<{ id: string; created: boolean }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new SaveError("No connection to the server. The visit is kept on this phone; try again.", true);
  }
  if (res.ok) return res.json();
  const body = await res.json().catch(() => ({}));
  const detail = Array.isArray(body.detail) ? body.detail.map((d: { msg: string }) => d.msg).join("; ") : body.detail;
  if (res.status === 401) throw new SaveError("Your sign-in has expired. Sign in again, then save.", false);
  if (res.status === 422) throw new SaveError(`The server rejected this visit: ${detail}`, false);
  throw new SaveError(`Server error (${res.status}). The visit is kept on this phone; try again.`, true);
}
