import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, STORAGE_KEY } from "../lib/interview-plan";
import { parseStorageJson } from "../lib/storage-schema";
import { initialState, localISO, type TrackerState } from "../lib/tracker-state";

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

export function loadStoredState(): TrackerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return initialState();
    const parsed = parseStorageJson(raw);
    return parsed.ok ? parsed.state : initialState();
  } catch (error) {
    if (error instanceof DOMException) return initialState();
    throw error;
  }
}

export function writeStoredState(state: TrackerState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
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

export function downloadStateExport(state: TrackerState): void {
  const blob = new Blob([JSON.stringify({ app: "Sherly Technical Interview Sprint", exportedAt: new Date().toISOString(), state }, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `sherly-interview-progress-${localISO()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
