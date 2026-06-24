import { TASKS, taskByNumber, type Category, type TaskId, type WeekNumber } from "../lib/interview-plan";
import {
  activityStarted,
  dayDiff,
  ensureDay,
  localISO,
  parseISO,
  scheduledDate,
  type TrackerState,
} from "../lib/tracker-state";

export const WEEK_NUMBERS = [1, 2, 3, 4, 5, 6] as const satisfies readonly WeekNumber[];
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const TIMER_ADJUSTMENTS = [5, 15, 30] as const;

export type CalendarCell =
  | { readonly kind: "blank" }
  | { readonly kind: "outside"; readonly dayNumber: number }
  | {
      readonly kind: "task";
      readonly dayNumber: number;
      readonly iso: string;
      readonly id: TaskId;
      readonly title: string;
      readonly category: Category;
      readonly status: "completed" | "inprogress" | "missed" | "idle";
      readonly today: boolean;
      readonly selected: boolean;
    };

export type CalendarMonth = {
  readonly monthStartISO: string;
  readonly label: string;
  readonly cells: readonly CalendarCell[];
};

export type VisibleCalendarMonthInput = Readonly<{
  state: TrackerState;
  monthStartISO?: string;
  today?: string;
  nowMs?: number;
}>;

export type ToastState = {
  readonly message: string;
  readonly visible: boolean;
};

export type ConfirmFn = (message: string) => boolean;
const FINAL_TASK_ID: TaskId = 42;

export function classNames(values: readonly string[]): string {
  return values.filter((value) => value.length > 0).join(" ");
}

export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
): string {
  return parseISO(iso).toLocaleDateString(undefined, options);
}

function monthStarts(state: TrackerState): readonly Date[] {
  const start = parseISO(state.startDate);
  const end = parseISO(scheduledDate(state, FINAL_TASK_ID));
  const months: Date[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return months;
}

type CalendarBuildContext = Readonly<{
  state: TrackerState;
  streakStarted: boolean;
  today: string;
  nowMs: number;
}>;

export function calendarMonthStartISO(date = new Date()): string {
  return localISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function addCalendarMonths(monthStartISO: string, monthOffset: number): string {
  const monthStart = parseISO(monthStartISO);
  return calendarMonthStartISO(new Date(monthStart.getFullYear(), monthStart.getMonth() + monthOffset, 1));
}

export function formatCalendarMonthLabel(monthStartISO: string): string {
  return parseISO(monthStartISO).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function hasStartedStreak(state: TrackerState): boolean {
  return TASKS.some((task) => {
    const day = ensureDay(state, task.id);
    return day.completed && day.completedOn !== null;
  });
}

function taskCell({ state, streakStarted, today, nowMs }: CalendarBuildContext, date: Date): CalendarCell {
  const iso = localISO(date);
  const diff = dayDiff(iso, state.startDate);
  const task = diff >= 0 && diff < TASKS.length ? taskByNumber(diff + 1) : undefined;
  if (task === undefined) return { kind: "outside", dayNumber: date.getDate() };
  const day = ensureDay(state, task.id);
  const status = day.completed && day.completedOn !== null
    ? "completed"
    : activityStarted(state, task.id, nowMs)
      ? "inprogress"
      : streakStarted && iso < today
        ? "missed"
        : "idle";
  return {
    kind: "task",
    dayNumber: date.getDate(),
    iso,
    id: task.id,
    title: task.title,
    category: task.category,
    status,
    today: iso === today,
    selected: task.id === state.selectedId,
  };
}

function buildCalendarMonth(context: CalendarBuildContext, monthStart: Date): CalendarMonth {
  const cells: CalendarCell[] = [];
  const firstOffset = (monthStart.getDay() + 6) % 7;
  for (let index = 0; index < firstOffset; index += 1) cells.push({ kind: "blank" });
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(taskCell(context, new Date(monthStart.getFullYear(), monthStart.getMonth(), day)));
  }
  const monthStartISO = calendarMonthStartISO(monthStart);
  return {
    monthStartISO,
    label: formatCalendarMonthLabel(monthStartISO),
    cells,
  };
}

export function buildVisibleCalendarMonth({
  state,
  monthStartISO = calendarMonthStartISO(),
  today = localISO(),
  nowMs = Date.now(),
}: VisibleCalendarMonthInput): CalendarMonth {
  return buildCalendarMonth({ state, streakStarted: hasStartedStreak(state), today, nowMs }, parseISO(monthStartISO));
}

export function buildCalendarMonths(state: TrackerState, today = localISO(), nowMs = Date.now()): readonly CalendarMonth[] {
  const context = { state, streakStarted: hasStartedStreak(state), today, nowMs };
  return monthStarts(state).map((monthStart) => buildCalendarMonth(context, monthStart));
}

export function statusClass(status: CalendarCell["kind"] | "completed" | "inprogress" | "missed" | "idle"): string {
  return status === "idle" || status === "blank" || status === "outside" ? "" : status;
}
