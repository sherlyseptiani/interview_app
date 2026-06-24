import { describe, expect, it } from "vitest";

import { ensureDay, initialState } from "../lib/tracker-state";
import { parseStorageJson, parseStoragePayload } from "../lib/storage-schema";

describe("storage schema parsing", () => {
  it("accepts wrapped state payloads and normalizes every task day", () => {
    // Given
    const payload = {
      app: "Sherly Technical Interview Sprint",
      exportedAt: "2026-06-23T00:00:00.000Z",
      state: {
        version: 2,
        startDate: "2026-06-01",
        selectedId: 99,
        filter: "Frontend",
        days: {
          "1": {
            checks: [true],
            notes: "legacy note",
            elapsed: "120",
            runningSince: 1000,
            completed: true,
            completedOn: "2026-06-02",
          },
        },
      },
    };

    // When
    const result = parseStoragePayload(payload);

    // Then
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.startDate).toBe("2026-06-01");
      expect(result.state.selectedId).toBe(42);
      expect(result.state.filter).toBe("Frontend");
      expect(Object.keys(result.state.days)).toHaveLength(42);
      expect(ensureDay(result.state, 1).checks).toEqual([true, false, false, false, false]);
      expect(ensureDay(result.state, 1).elapsed).toBe(120);
      expect(ensureDay(result.state, 1).notes).toBe("legacy note");
      expect(ensureDay(result.state, 2).checks).toHaveLength(5);
    }
  });

  it("accepts raw state JSON payloads", () => {
    // Given
    const rawState = {
      ...initialState("2026-06-10"),
      filter: "Coding",
      days: { "1": { checks: [true, true, true, true, true], notes: "done", elapsed: 3600 } },
    };

    // When
    const result = parseStorageJson(JSON.stringify(rawState));

    // Then
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.startDate).toBe("2026-06-10");
      expect(result.state.filter).toBe("Coding");
      expect(ensureDay(result.state, 1).completed).toBe(false);
      expect(ensureDay(result.state, 1).elapsed).toBe(3600);
    }
  });

  it("rejects invalid startDate and days shapes with typed errors", () => {
    // Given
    const invalidDate = { startDate: "2026-02-30", days: {} };
    const invalidDays = { startDate: "2026-06-23", days: [] };
    const invalidJson = "{";

    // When
    const dateResult = parseStoragePayload(invalidDate);
    const daysResult = parseStoragePayload(invalidDays);
    const jsonResult = parseStorageJson(invalidJson);

    // Then
    expect(dateResult).toEqual({ ok: false, error: { kind: "invalid_start_date", message: "Invalid startDate" } });
    expect(daysResult).toEqual({ ok: false, error: { kind: "invalid_days", message: "Invalid days" } });
    expect(jsonResult).toEqual({ ok: false, error: { kind: "invalid_json", message: "Invalid JSON" } });
  });
});
