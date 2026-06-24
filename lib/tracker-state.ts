import {
  DEFAULT_CATEGORY_COLOR,
  TASK_IDS,
  TARGET_SECONDS,
  clampTaskId,
  getCategoryColor,
  isCategory,
  isFilterValue,
  taskById,
  type Category,
  type FilterValue,
  type TaskId,
} from './interview-plan';

export type DayState = {
  readonly checks: readonly boolean[];
  readonly notes: string;
  readonly elapsed: number;
  readonly runningSince: number | null;
  readonly completed: boolean;
  readonly completedOn: string | null;
};

export type TrackerState = {
  readonly version: 2;
  readonly startDate: string;
  readonly selectedId: TaskId;
  readonly filter: FilterValue;
  readonly days: Readonly<Record<string, DayState>>;
};

export type Streaks = {
  readonly current: number;
  readonly best: number;
};

export function localISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISO(iso: string): Date {
  const [yearText, monthText, dayText] = iso.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso);
  date.setDate(date.getDate() + days);
  return localISO(date);
}

export function dayDiff(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86_400_000);
}

export function formatTimer(total: number): string {
  const safeTotal = Math.max(0, Math.floor(total));
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function initialState(today = localISO()): TrackerState {
  return { version: 2, startDate: today, selectedId: 1, filter: 'All', days: {} };
}

function dayKey(id: TaskId): string {
  return String(id);
}

function emptyDay(id: TaskId): DayState {
  const task = taskById(id);
  return {
    checks: Array.from({ length: task.checklist.length }, () => false),
    notes: '',
    elapsed: 0,
    runningSince: null,
    completed: false,
    completedOn: null,
  };
}

function normalizeElapsed(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function normalizeDay(id: TaskId, day: DayState): DayState {
  const task = taskById(id);
  return {
    checks: Array.from({ length: task.checklist.length }, (_value, index) => Boolean(day.checks[index])),
    notes: day.notes,
    elapsed: normalizeElapsed(day.elapsed),
    runningSince: day.runningSince,
    completed: day.completed,
    completedOn: day.completedOn,
  };
}

export function ensureDay(state: TrackerState, id: TaskId): DayState {
  const day = state.days[dayKey(id)];
  return day === undefined ? emptyDay(id) : normalizeDay(id, day);
}

function withDay(state: TrackerState, id: TaskId, day: DayState): TrackerState {
  return { ...state, days: { ...state.days, [dayKey(id)]: day } };
}

export function scheduledDate(state: TrackerState, id: TaskId): string {
  return addDays(state.startDate, id - 1);
}

export function elapsedSeconds(state: TrackerState, id: TaskId, nowMs = Date.now()): number {
  const day = ensureDay(state, id);
  const runningSeconds =
    day.runningSince === null ? 0 : Math.max(0, Math.floor((nowMs - day.runningSince) / 1000));
  return day.elapsed + runningSeconds;
}

export function pauseDay(state: TrackerState, id: TaskId, nowMs = Date.now()): TrackerState {
  const day = ensureDay(state, id);
  const paused = day.runningSince === null ? day : { ...day, elapsed: elapsedSeconds(state, id, nowMs), runningSince: null };
  return withDay(state, id, paused);
}

export function pauseAllExcept(state: TrackerState, id: TaskId | null, nowMs = Date.now()): TrackerState {
  return TASK_IDS.reduce((nextState, taskId) => (taskId === id ? nextState : pauseDay(nextState, taskId, nowMs)), state);
}

export function startDayTimer(state: TrackerState, id: TaskId, nowMs = Date.now()): TrackerState {
  const pausedState = pauseAllExcept(state, id, nowMs);
  const day = ensureDay(pausedState, id);
  return day.runningSince === null ? withDay(pausedState, id, { ...day, runningSince: nowMs }) : pausedState;
}

export function allChecksDone(state: TrackerState, id: TaskId): boolean {
  return ensureDay(state, id).checks.every(Boolean);
}

export function canComplete(state: TrackerState, id: TaskId, nowMs = Date.now()): boolean {
  return allChecksDone(state, id) && elapsedSeconds(state, id, nowMs) >= TARGET_SECONDS;
}

export function activityStarted(state: TrackerState, id: TaskId, nowMs = Date.now()): boolean {
  const day = ensureDay(state, id);
  return day.checks.some(Boolean) || elapsedSeconds(state, id, nowMs) > 0 || day.notes.trim().length > 0;
}

export function calculateStreaks(state: TrackerState, today = localISO()): Streaks {
  const dates = [
    ...new Set(
      TASK_IDS.map((id) => ensureDay(state, id).completedOn).filter((date) => date !== null),
    ),
  ].sort();
  const [firstDate, ...remainingDates] = dates;
  if (firstDate === undefined) return { current: 0, best: 0 };
  let previousDate = firstDate;
  let run = 1;
  let best = 1;
  for (const date of remainingDates) {
    run = dayDiff(date, previousDate) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previousDate = date;
  }
  const completedDates = new Set(dates);
  let cursor: string | null = completedDates.has(today) ? today : completedDates.has(addDays(today, -1)) ? addDays(today, -1) : null;
  let current = 0;
  while (cursor !== null && completedDates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

export function totalElapsed(state: TrackerState, nowMs = Date.now()): number {
  return TASK_IDS.reduce((sum, id) => sum + elapsedSeconds(state, id, nowMs), 0);
}

export function currentTaskForToday(state: TrackerState, today = localISO()): TaskId {
  return clampTaskId(dayDiff(today, state.startDate) + 1);
}

export function categoryColor(category: Category | string): string {
  return isCategory(category) ? getCategoryColor(category) : DEFAULT_CATEGORY_COLOR;
}

export function setCheck(state: TrackerState, id: TaskId, index: number, checked: boolean): TrackerState {
  const day = ensureDay(state, id);
  return withDay(state, id, { ...day, checks: day.checks.map((value, itemIndex) => (itemIndex === index ? checked : value)) });
}

export function setNotes(state: TrackerState, id: TaskId, notes: string): TrackerState {
  return withDay(state, id, { ...ensureDay(state, id), notes });
}

export function addElapsedMinutes(state: TrackerState, id: TaskId, minutes: number, nowMs = Date.now()): TrackerState {
  const pausedState = pauseDay(state, id, nowMs);
  const day = ensureDay(pausedState, id);
  return withDay(pausedState, id, { ...day, elapsed: day.elapsed + minutes * 60 });
}

export function resetDayTimer(state: TrackerState, id: TaskId): TrackerState {
  return withDay(state, id, { ...ensureDay(state, id), elapsed: 0, runningSince: null });
}

export function completeDay(state: TrackerState, id: TaskId, completedOn = localISO(), nowMs = Date.now()): TrackerState {
  if (!canComplete(state, id, nowMs)) return withDay(state, id, ensureDay(state, id));
  const pausedState = pauseDay(state, id, nowMs);
  const day = ensureDay(pausedState, id);
  return withDay(pausedState, id, { ...day, completed: true, completedOn });
}

export function reopenDay(state: TrackerState, id: TaskId): TrackerState {
  return withDay(state, id, { ...ensureDay(state, id), completed: false, completedOn: null });
}

export function setStartDate(state: TrackerState, startDate: string): TrackerState {
  return { ...state, startDate };
}

export function setSelectedId(state: TrackerState, selectedId: number): TrackerState {
  return { ...state, selectedId: clampTaskId(selectedId) };
}

export function setFilter(state: TrackerState, filter: string): TrackerState {
  return { ...state, filter: isFilterValue(filter) ? filter : 'All' };
}
