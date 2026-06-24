import { categoryColor, type TrackerState } from "../lib/tracker-state";
import { classNames, statusClass, WEEKDAY_LABELS, type CalendarCell, type CalendarMonth } from "./tracker-types";

type CalendarSectionProps = Readonly<{
  state: TrackerState;
  month: CalendarMonth;
  previousMonthLabel: string;
  nextMonthLabel: string;
  currentMonthLabel: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onSelectDay: (id: number, scroll: boolean) => void;
}>;

function taskDayClass(cell: Extract<CalendarCell, { readonly kind: "task" }>): string {
  const hasSignal = cell.status !== "idle";
  return classNames([
    "cal-day",
    hasSignal ? statusClass(cell.status) : "idle",
    hasSignal && cell.today ? "today" : "",
    hasSignal && cell.selected ? "selected" : "",
  ]);
}

export function CalendarSection({
  state,
  month,
  previousMonthLabel,
  nextMonthLabel,
  currentMonthLabel,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onSelectDay,
}: CalendarSectionProps) {
  const hasCalendarSignals = month.cells.some((cell) => cell.kind === "task" && cell.status !== "idle");

  return (
    <section className="calendar-section glass" id="calendarSection">
      <div className="section-title-row calendar-title-row">
        <div>
          <h2>Calendar &amp; streaks</h2>
          <p>Move one month at a time, or return to the current month.</p>
        </div>
        <div className="calendar-controls" aria-label="Calendar month controls">
          <button className="icon-btn" type="button" aria-label={previousMonthLabel} title={previousMonthLabel} onClick={onPreviousMonth}>&lt;</button>
          <button className="btn small soft calendar-current" type="button" aria-label={currentMonthLabel} onClick={onCurrentMonth}>Today</button>
          <button className="icon-btn" type="button" aria-label={nextMonthLabel} title={nextMonthLabel} onClick={onNextMonth}>&gt;</button>
        </div>
      </div>
      {hasCalendarSignals ? (
        <div className="legend calendar-legend">
          <span><i className="dot dot-green" />Complete</span>
          <span><i className="dot dot-amber" />In progress</span>
          <span><i className="dot dot-red" />Missed</span>
          <span><i className="dot dot-blue" />Today</span>
        </div>
      ) : null}
      <div className="months single-months">
        <article className="month" aria-label={`Calendar month ${month.label}`}>
          <h3>{month.label}</h3>
          <div className="weekdays">{WEEKDAY_LABELS.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
          <div className="month-grid">
            {month.cells.map((cell, index) => {
              if (cell.kind === "blank") return <span className="cal-day blank" key={`${month.monthStartISO}-blank-${index}`} />;
              if (cell.kind === "outside") {
                return <span className="cal-day" key={`${month.monthStartISO}-outside-${cell.dayNumber}`}><span className="cal-num">{cell.dayNumber}</span></span>;
              }
              const hasSignal = cell.status !== "idle";
              const showCategoryDot = cell.status === "completed" || cell.status === "inprogress";
              return (
                <button
                  className={taskDayClass(cell)}
                  type="button"
                  title={`Day ${cell.id}: ${cell.title}`}
                  aria-label={`Open day ${cell.id}: ${cell.title}`}
                  key={cell.iso}
                  onClick={() => onSelectDay(cell.id, true)}
                >
                  <span className="cal-num">{cell.dayNumber}</span>
                  {hasSignal ? <span className="cal-task">Day {cell.id}</span> : null}
                  {showCategoryDot ? <i className="cal-cat" style={{ background: categoryColor(cell.category) }} /> : null}
                </button>
              );
            })}
          </div>
        </article>
      </div>
      <span className="sr-only" aria-live="polite">Selected day {state.selectedId}</span>
    </section>
  );
}
