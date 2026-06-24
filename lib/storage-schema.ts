import { TASKS, clampTaskId, isFilterValue, type FilterValue, type TaskId } from './interview-plan';
import { ensureDay, initialState, localISO, parseISO, type DayState, type TrackerState } from './tracker-state';

export type StorageSchemaError = {
  readonly kind: 'invalid_json' | 'invalid_state' | 'invalid_start_date' | 'invalid_days';
  readonly message: string;
};

export type StorageParseResult =
  | { readonly ok: true; readonly state: TrackerState }
  | { readonly ok: false; readonly error: StorageSchemaError };

const LOCAL_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function ok(state: TrackerState): StorageParseResult {
  return { ok: true, state };
}

function err(error: StorageSchemaError): StorageParseResult {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocalISO(value: string): boolean {
  return LOCAL_ISO_PATTERN.test(value) && localISO(parseISO(value)) === value;
}

function normalizeSeconds(value: unknown): number {
  const seconds = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
  return Number.isFinite(seconds) ? seconds : 0;
}

function normalizeRunningSince(value: unknown): number | null {
  const timestamp = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function normalizeCompletedOn(value: unknown): string | null {
  return typeof value === 'string' && isLocalISO(value) ? value : null;
}

function normalizeChecks(value: unknown, id: TaskId): readonly boolean[] {
  const task = TASKS.find((candidate) => candidate.id === id);
  const length = task === undefined ? 0 : task.checklist.length;
  return Array.from({ length }, (_item, index) => (Array.isArray(value) ? Boolean(value[index]) : false));
}

function normalizeDay(value: unknown, id: TaskId): DayState {
  if (!isRecord(value)) return ensureDay(initialState('1970-01-01'), id);
  return {
    checks: normalizeChecks(value['checks'], id),
    notes: typeof value['notes'] === 'string' ? value['notes'] : '',
    elapsed: normalizeSeconds(value['elapsed']),
    runningSince: normalizeRunningSince(value['runningSince']),
    completed: Boolean(value['completed']),
    completedOn: normalizeCompletedOn(value['completedOn']),
  };
}

function normalizeDays(value: Record<string, unknown>): Record<string, DayState> {
  const days: Record<string, DayState> = {};
  for (const task of TASKS) {
    days[String(task.id)] = normalizeDay(value[String(task.id)], task.id);
  }
  return days;
}

function selectedId(value: unknown): TaskId {
  return typeof value === 'number' ? clampTaskId(value) : 1;
}

function filterValue(value: unknown): FilterValue {
  return typeof value === 'string' && isFilterValue(value) ? value : 'All';
}

function stateCandidate(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  return 'state' in payload ? payload['state'] : payload;
}

export function parseStoragePayload(payload: unknown): StorageParseResult {
  const candidate = stateCandidate(payload);
  if (!isRecord(candidate)) return err({ kind: 'invalid_state', message: 'Invalid state' });
  const startDate = candidate['startDate'];
  if (typeof startDate !== 'string' || !isLocalISO(startDate)) {
    return err({ kind: 'invalid_start_date', message: 'Invalid startDate' });
  }
  const days = candidate['days'];
  if (!isRecord(days)) return err({ kind: 'invalid_days', message: 'Invalid days' });
  return ok({
    version: 2,
    startDate,
    selectedId: selectedId(candidate['selectedId']),
    filter: filterValue(candidate['filter']),
    days: normalizeDays(days),
  });
}

export function parseStorageJson(raw: string): StorageParseResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseStoragePayload(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) return err({ kind: 'invalid_json', message: 'Invalid JSON' });
    throw error;
  }
}
