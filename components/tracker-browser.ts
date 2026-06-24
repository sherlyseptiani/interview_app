import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "../lib/interview-plan";
import { parseStoragePayload } from "../lib/storage-schema";
import { initialState, type TrackerState } from "../lib/tracker-state";

const CONFETTI_COLORS = [
  CATEGORY_COLORS.Coding,
  CATEGORY_COLORS.Frontend,
  CATEGORY_COLORS["System Design"],
  CATEGORY_COLORS["Leadership / TPM"],
  CATEGORY_COLORS["Mock / Review"],
] as const;

export const TOAST_MS = 2600;
export const CONFETTI_MS = 1600;
export const CONFETTI_COUNT = 34;

export type ConfettiPiece = Readonly<{
  id: number;
  left: string;
  delay: string;
  color: string;
}>;

type LoadProgressResult = Readonly<{
  configured: boolean;
  state: TrackerState;
}>;

export async function loadProgressState(): Promise<LoadProgressResult> {
  try {
    const response = await fetch("/api/progress", { cache: "no-store" });
    if (!response.ok) return { configured: true, state: initialState() };
    const payload: unknown = await response.json();
    const configured = typeof payload === "object" && payload !== null && "configured" in payload && payload.configured === true;
    const statePayload = typeof payload === "object" && payload !== null && "state" in payload ? payload.state : payload;
    const parsed = parseStoragePayload(statePayload);
    return { configured, state: parsed.ok ? parsed.state : initialState() };
  } catch {
    return { configured: true, state: initialState() };
  }
}

export async function saveProgressState(state: TrackerState): Promise<boolean> {
  try {
    const response = await fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!response.ok) return false;
    const payload: unknown = await response.json();
    return typeof payload === "object" && payload !== null && "ok" in payload && payload.ok === true;
  } catch {
    return false;
  }
}

export function sendProgressBeacon(state: TrackerState): boolean {
  if (typeof navigator.sendBeacon !== "function") return false;
  return navigator.sendBeacon("/api/progress", new Blob([JSON.stringify(state)], { type: "application/json" }));
}

function confettiColor(index: number): string {
  return CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? DEFAULT_CATEGORY_COLOR;
}

export function createConfettiPieces(baseId: number): readonly ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_item, index) => ({
    id: baseId + index,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.25}s`,
    color: confettiColor(index),
  }));
}
