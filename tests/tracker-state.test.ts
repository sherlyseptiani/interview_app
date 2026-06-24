import { describe, expect, it } from "vitest";

import {
  STORAGE_KEY,
  TASKS,
  TARGET_SECONDS,
  taskById,
} from "../lib/interview-plan";
import {
  activityStarted,
  addDays,
  addElapsedMinutes,
  allChecksDone,
  calculateStreaks,
  canComplete,
  categoryColor,
  completeDay,
  currentTaskForToday,
  dayDiff,
  elapsedSeconds,
  ensureDay,
  formatTimer,
  initialState,
  localISO,
  parseISO,
  pauseAllExcept,
  pauseDay,
  reopenDay,
  resetDayTimer,
  scheduledDate,
  setCheck,
  setFilter,
  setNotes,
  setSelectedId,
  setStartDate,
  startDayTimer,
  totalElapsed,
  type DayState,
  type TrackerState,
} from "../lib/tracker-state";

const EMPTY_DAY: DayState = {
  checks: [false, false, false, false, false],
  notes: "",
  elapsed: 0,
  runningSince: null,
  completed: false,
  completedOn: null,
};

describe("interview plan contract", () => {
  it("preserves the legacy task count, order, and storage key", () => {
    // Given
    const firstTask = taskById(1);
    const finalTask = taskById(42);

    // When
    const ids = TASKS.map((task) => task.id);

    // Then
    expect(STORAGE_KEY).toBe("sherlyTechnicalInterviewSprintV2");
    expect(TASKS).toHaveLength(42);
    expect(ids).toEqual(Array.from({ length: 42 }, (_value, index) => index + 1));
    expect(firstTask.title).toBe("Restart JavaScript and solve Two Sum");
    expect(firstTask.resources[1]?.label).toBe("LeetCode \u00b7 Two Sum");
    expect(finalTask.title).toBe("Run the full interview loop and final readiness audit");
  });
});

describe("tracker date and initial state helpers", () => {
  it("creates the exact legacy empty initial state", () => {
    // Given
    const today = "2026-06-23";

    // When
    const state = initialState(today);

    // Then
    expect(state).toEqual({ version: 2, startDate: today, selectedId: 1, filter: "All", days: {} });
  });

  it("matches local ISO date math and timer formatting", () => {
    // Given
    const date = new Date(2026, 0, 31, 23, 30, 0);

    // When
    const parsed = parseISO("2026-02-02");

    // Then
    expect(localISO(date)).toBe("2026-01-31");
    expect(localISO(parsed)).toBe("2026-02-02");
    expect(addDays("2026-01-31", 2)).toBe("2026-02-02");
    expect(dayDiff("2026-02-02", "2026-01-31")).toBe(2);
    expect(formatTimer(3661.9)).toBe("01:01:01");
    expect(formatTimer(-4)).toBe("00:00:00");
  });

  it("clamps today's task inside the 42-day schedule", () => {
    // Given
    const futureState = initialState("2026-07-01");
    const activeState = initialState("2026-06-20");
    const expiredState = initialState("2026-01-01");

    // When / Then
    expect(currentTaskForToday(futureState, "2026-06-23")).toBe(1);
    expect(currentTaskForToday(activeState, "2026-06-23")).toBe(4);
    expect(currentTaskForToday(expiredState, "2026-06-23")).toBe(42);
  });
});

describe("tracker day state updates", () => {
  it("normalizes day state to the task checklist size", () => {
    // Given
    const state: TrackerState = {
      ...initialState("2026-06-23"),
      days: { "1": { ...EMPTY_DAY, checks: [true], elapsed: Number.NaN } },
    };

    // When
    const day = ensureDay(state, 1);

    // Then
    expect(day.checks).toEqual([true, false, false, false, false]);
    expect(day.elapsed).toBe(0);
  });

  it("updates checks, notes, selected id, filter, start date, and category color", () => {
    // Given
    const state = initialState("2026-06-23");

    // When
    const checked = setCheck(state, 1, 0, true);
    const noted = setNotes(checked, 1, "Review map invariants");
    const selected = setSelectedId(noted, 99);
    const filtered = setFilter(selected, "Frontend");
    const rescheduled = setStartDate(filtered, "2026-07-04");

    // Then
    expect(ensureDay(rescheduled, 1).checks[0]).toBe(true);
    expect(ensureDay(rescheduled, 1).notes).toBe("Review map invariants");
    expect(rescheduled.selectedId).toBe(42);
    expect(rescheduled.filter).toBe("Frontend");
    expect(rescheduled.startDate).toBe("2026-07-04");
    expect(scheduledDate(rescheduled, 2)).toBe("2026-07-05");
    expect(setFilter(rescheduled, "Unknown").filter).toBe("All");
    expect(categoryColor("System Design")).toBe("#8658e8");
    expect(categoryColor("Unknown")).toBe("#4f7cff");
  });

  it("gates completion on all checks and the 60-minute target", () => {
    // Given
    const checked = taskById(1).checklist.reduce(
      (state, _item, index) => setCheck(state, 1, index, true),
      initialState("2026-06-23"),
    );
    const almostDone = addElapsedMinutes(checked, 1, 59, 1_000);
    const ready = addElapsedMinutes(almostDone, 1, 1, 1_000);

    // When
    const completed = completeDay(ready, 1, "2026-06-23", 1_000);
    const reopened = reopenDay(completed, 1);

    // Then
    expect(allChecksDone(checked, 1)).toBe(true);
    expect(canComplete(almostDone, 1, 1_000)).toBe(false);
    expect(canComplete(ready, 1, 1_000)).toBe(true);
    expect(ensureDay(completed, 1).completed).toBe(true);
    expect(ensureDay(completed, 1).completedOn).toBe("2026-06-23");
    expect(ensureDay(reopened, 1).completed).toBe(false);
    expect(ensureDay(reopened, 1).completedOn).toBeNull();
  });
});

describe("tracker timer and aggregate helpers", () => {
  it("adds, pauses, resets, and totals elapsed focus time", () => {
    // Given
    const running: TrackerState = {
      ...initialState("2026-06-23"),
      days: {
        "1": { ...EMPTY_DAY, elapsed: 30, runningSince: 1_000 },
        "2": { ...EMPTY_DAY, elapsed: 120, runningSince: 2_000 },
      },
    };

    // When
    const pausedOne = pauseDay(running, 1, 4_500);
    const pausedOthers = pauseAllExcept(running, 1, 6_000);
    const withAddedMinutes = addElapsedMinutes(pausedOne, 1, 5, 4_500);
    const reset = resetDayTimer(withAddedMinutes, 1);

    // Then
    expect(elapsedSeconds(running, 1, 4_500)).toBe(33);
    expect(ensureDay(pausedOne, 1).runningSince).toBeNull();
    expect(ensureDay(pausedOne, 1).elapsed).toBe(33);
    expect(ensureDay(pausedOthers, 1).runningSince).toBe(1_000);
    expect(ensureDay(pausedOthers, 2).runningSince).toBeNull();
    expect(ensureDay(withAddedMinutes, 1).elapsed).toBe(333);
    expect(ensureDay(reset, 1).elapsed).toBe(0);
    expect(totalElapsed(withAddedMinutes, 4_500)).toBe(455);
    expect(activityStarted(withAddedMinutes, 1, 4_500)).toBe(true);
  });

  it("starts one running timer and pauses other days", () => {
    // Given
    const running: TrackerState = {
      ...initialState("2026-06-23"),
      days: {
        "1": { ...EMPTY_DAY, elapsed: 30, runningSince: 1_000 },
        "2": { ...EMPTY_DAY, elapsed: 120, runningSince: 2_000 },
      },
    };

    // When
    const state = startDayTimer(running, 2, 6_000);

    // Then
    expect(ensureDay(state, 1).runningSince).toBeNull();
    expect(ensureDay(state, 1).elapsed).toBe(35);
    expect(ensureDay(state, 2).runningSince).toBe(2_000);
  });

  it("calculates current and best streaks from unique completion dates", () => {
    // Given
    const state: TrackerState = {
      ...initialState("2026-06-20"),
      days: {
        "1": { ...EMPTY_DAY, completed: true, completedOn: "2026-06-20" },
        "2": { ...EMPTY_DAY, completed: true, completedOn: "2026-06-21" },
        "3": { ...EMPTY_DAY, completed: true, completedOn: "2026-06-21" },
        "999": { ...EMPTY_DAY, completed: true, completedOn: "2026-06-22" },
        "4": { ...EMPTY_DAY, completed: true, completedOn: "2026-06-23" },
        "5": { ...EMPTY_DAY, completed: true, completedOn: "2026-06-24" },
      },
    };

    // When
    const streaks = calculateStreaks(state, "2026-06-24");

    // Then
    expect(streaks).toEqual({ current: 2, best: 2 });
  });

  it("keeps the completion gate tied to the exported target seconds", () => {
    // Given
    const state = initialState("2026-06-23");

    // When
    const elapsedState = addElapsedMinutes(state, 1, 60, 1_000);

    // Then
    expect(TARGET_SECONDS).toBe(3600);
    expect(elapsedSeconds(elapsedState, 1, 1_000)).toBe(TARGET_SECONDS);
  });
});
