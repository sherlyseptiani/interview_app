import { describe, expect, it } from "vitest";

import { initialState } from "../lib/tracker-state";
import {
  addCalendarMonths,
  buildVisibleCalendarMonth,
  calendarMonthStartISO,
  type CalendarCell,
} from "../components/tracker-types";

type TaskCell = Extract<CalendarCell, { readonly kind: "task" }>;

function isTaskCell(cell: CalendarCell): cell is TaskCell {
  return cell.kind === "task";
}

describe("calendar month helpers", () => {
  it("normalizes local month starts and navigates whole calendar months", () => {
    // Given
    const juneDate = new Date(2026, 5, 23);

    // When
    const june = calendarMonthStartISO(juneDate);
    const july = addCalendarMonths(june, 1);
    const previousYear = addCalendarMonths("2026-01-01", -1);

    // Then
    expect(june).toBe("2026-06-01");
    expect(july).toBe("2026-07-01");
    expect(previousYear).toBe("2025-12-01");
  });

  it("builds only the requested visible month with task and outside cells", () => {
    // Given
    const state = initialState("2026-06-10");

    // When
    const month = buildVisibleCalendarMonth({
      state,
      monthStartISO: "2026-06-01",
      today: "2026-06-23",
      nowMs: 0,
    });
    const taskCells = month.cells.filter(isTaskCell);

    // Then
    expect(month.label).toBe("June 2026");
    expect(month.cells).toHaveLength(30);
    expect(month.cells.filter((cell) => cell.kind === "outside")).toHaveLength(9);
    expect(taskCells).toHaveLength(21);
    expect(taskCells[0]?.id).toBe(1);
    expect(taskCells.some((cell) => cell.id === 14 && cell.today)).toBe(true);
    expect(taskCells.some((cell) => cell.id === 1 && cell.selected)).toBe(true);
    expect(taskCells.every((cell) => cell.status !== "missed")).toBe(true);
  });

  it("only marks missed days after the first completed streak day", () => {
    // Given
    const state = {
      ...initialState("2026-06-10"),
      days: {
        "1": {
          checks: [true, true, true, true, true],
          notes: "",
          elapsed: 3600,
          runningSince: null,
          completed: true,
          completedOn: "2026-06-10",
        },
      },
    };

    // When
    const month = buildVisibleCalendarMonth({
      state,
      monthStartISO: "2026-06-01",
      today: "2026-06-23",
      nowMs: 0,
    });
    const taskCells = month.cells.filter(isTaskCell);

    // Then
    expect(taskCells.find((cell) => cell.id === 1)?.status).toBe("completed");
    expect(taskCells.find((cell) => cell.id === 2)?.status).toBe("missed");
  });
});
