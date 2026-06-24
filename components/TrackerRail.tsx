import type { Dispatch, SetStateAction } from "react";

import type { InterviewTask } from "../lib/interview-plan";
import { localISO, type DayState, type TrackerState } from "../lib/tracker-state";
import { CalendarSection } from "./CalendarSection";
import { TimerPanel } from "./TimerPanel";
import {
  addCalendarMonths,
  buildVisibleCalendarMonth,
  calendarMonthStartISO,
  formatCalendarMonthLabel,
} from "./tracker-types";

type TrackerRailProps = Readonly<{
  state: TrackerState;
  task: InterviewTask;
  day: DayState;
  elapsed: number;
  checkedCount: number;
  checksDone: boolean;
  readyToComplete: boolean;
  visibleMonthStart: string;
  nowMs: number;
  onVisibleMonthStartChange: Dispatch<SetStateAction<string>>;
  onSelectDay: (id: number, scroll: boolean) => void;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  onAddMinutes: (minutes: number) => void;
  onCompleteToggle: () => void;
}>;

export function TrackerRail({
  state,
  task,
  day,
  elapsed,
  checkedCount,
  checksDone,
  readyToComplete,
  visibleMonthStart,
  nowMs,
  onVisibleMonthStartChange,
  onSelectDay,
  onTimerToggle,
  onTimerReset,
  onAddMinutes,
  onCompleteToggle,
}: TrackerRailProps) {
  const currentMonthStart = calendarMonthStartISO();
  const previousMonthStart = addCalendarMonths(visibleMonthStart, -1);
  const nextMonthStart = addCalendarMonths(visibleMonthStart, 1);
  const month = buildVisibleCalendarMonth({ state, monthStartISO: visibleMonthStart, today: localISO(), nowMs });

  return (
    <aside className="side-rail" aria-label="Focus timer and calendar">
      <TimerPanel
        task={task}
        day={day}
        elapsed={elapsed}
        checkedCount={checkedCount}
        checksDone={checksDone}
        readyToComplete={readyToComplete}
        onToggleTimer={onTimerToggle}
        onResetTimer={onTimerReset}
        onAddMinutes={onAddMinutes}
        onCompleteToggle={onCompleteToggle}
      />
      <CalendarSection
        state={state}
        month={month}
        previousMonthLabel={`Previous month, ${formatCalendarMonthLabel(previousMonthStart)}`}
        nextMonthLabel={`Next month, ${formatCalendarMonthLabel(nextMonthStart)}`}
        currentMonthLabel={`Show current month, ${formatCalendarMonthLabel(currentMonthStart)}`}
        onPreviousMonth={() => onVisibleMonthStartChange((monthStart) => addCalendarMonths(monthStart, -1))}
        onNextMonth={() => onVisibleMonthStartChange((monthStart) => addCalendarMonths(monthStart, 1))}
        onCurrentMonth={() => onVisibleMonthStartChange(calendarMonthStartISO())}
        onSelectDay={onSelectDay}
      />
    </aside>
  );
}
