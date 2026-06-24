import { FILTER_VALUES, tasksForWeek, weekTheme, type FilterValue } from "../lib/interview-plan";
import { categoryColor, elapsedSeconds, ensureDay, scheduledDate, type TrackerState } from "../lib/tracker-state";
import { classNames, formatDate, WEEK_NUMBERS } from "./tracker-types";

type PlanSectionProps = Readonly<{
  state: TrackerState;
  nowMs: number;
  onFilterChange: (filter: FilterValue) => void;
  onSelectDay: (id: number, scroll: boolean) => void;
}>;

export function PlanSection({ state, nowMs, onFilterChange, onSelectDay }: PlanSectionProps) {
  return (
    <section className="plan-section glass" id="planSection">
      <div className="section-title-row">
        <div>
          <h2>All 42 days</h2>
          <p>Five primarily technical days most weeks, with targeted leadership and mock practice.</p>
        </div>
      </div>
      <div className="filters">
        {FILTER_VALUES.map((filter) => (
          <button
            className={classNames(["filter-btn", state.filter === filter ? "active" : ""])}
            type="button"
            key={filter}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
      <div>
        {WEEK_NUMBERS.map((week) => {
          const tasks = tasksForWeek(week, state.filter);
          if (tasks.length === 0) return null;
          const completed = tasks.filter((task) => ensureDay(state, task.id).completed).length;
          return (
            <section className="week-block" key={week}>
              <div className="week-head">
                <div>
                  <h3>Week {week}</h3>
                  <p>{weekTheme(week)}</p>
                </div>
                <span className="badge">{completed} / {tasks.length} complete</span>
              </div>
              <div className="day-list">
                {tasks.map((task) => {
                  const day = ensureDay(state, task.id);
                  const checks = day.checks.filter(Boolean).length;
                  const minutes = Math.floor(elapsedSeconds(state, task.id, nowMs) / 60);
                  return (
                    <button
                      className={classNames(["day-card", task.id === state.selectedId ? "selected" : "", day.completed ? "complete" : ""])}
                      type="button"
                      key={task.id}
                      onClick={() => onSelectDay(task.id, true)}
                    >
                      <span className="day-index" style={{ background: categoryColor(task.category) }}>{task.id}</span>
                      <span>
                        <span className="day-card-title">{task.title}</span>
                        <span className="day-card-meta">
                          {formatDate(scheduledDate(state, task.id), { month: "short", day: "numeric" })} - {task.category} - {checks}/{task.checklist.length} checks - {minutes} min
                        </span>
                      </span>
                      <span className="day-status">{day.completed ? "Done" : "Open"}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <p className="data-note">Progress is stored locally in this browser. Export a backup weekly, especially before moving to another device.</p>
    </section>
  );
}
