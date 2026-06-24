import { TASKS } from "../lib/interview-plan";
import type { ThemeMode } from "../lib/theme";
import { calculateStreaks, ensureDay, scheduledDate, totalElapsed, type TrackerState } from "../lib/tracker-state";
import { formatDate } from "./tracker-types";

type TrackerHeaderProps = Readonly<{
  state: TrackerState;
  nowMs: number;
  onStartDateChange: (value: string) => void;
  onToday: () => void;
  onExport: () => void;
  onImport: () => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onReset: () => void;
}>;

type StatTone = "coral" | "purple" | "teal" | "amber";

type StatCard = Readonly<{
  label: string;
  value: string;
  note: string;
  tone: StatTone;
}>;

function pluralDays(value: number): string {
  return `${value} day${value === 1 ? "" : "s"}`;
}

export function TrackerHeader({ state, nowMs, onStartDateChange, onToday, onExport, onImport, theme, onThemeToggle, onReset }: TrackerHeaderProps) {
  const completed = TASKS.filter((task) => ensureDay(state, task.id).completed).length;
  const streaks = calculateStreaks(state);
  const focusSeconds = totalElapsed(state, nowMs);
  const focusHours = (focusSeconds / 3600).toFixed(focusSeconds >= 36_000 ? 0 : 1);
  const percent = Math.round((completed / TASKS.length) * 100);
  const nextTheme = theme === "dark" ? "light" : "dark";
  const scheduleText = `${formatDate(state.startDate, { month: "short", day: "numeric" })} - ${formatDate(scheduledDate(state, 42), {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
  const stats: readonly StatCard[] = [
    { label: "Current streak", value: pluralDays(streaks.current), note: "Consecutive completion dates", tone: "coral" },
    { label: "Best streak", value: pluralDays(streaks.best), note: "Your longest run so far", tone: "purple" },
    { label: "Completed", value: `${completed} / ${TASKS.length}`, note: "Daily interview artifacts built", tone: "teal" },
    { label: "Focused time", value: `${focusHours}h`, note: "Across all tracked sessions", tone: "amber" },
  ];

  return (
    <>
      <header>
        <section className="hero glass">
          <div className="hero-main">
            <div className="hero-copy">
              <span className="eyebrow">Private interview command room</span>
              <h1>Sherly&apos;s Technical Interview Sprint</h1>
              <p>
                A 42-day operating system for sharpening <strong>Senior Engineering Manager</strong> and{" "}
                <strong>Senior / Lead Technical Program Manager</strong> interviews: coding reps, frontend fluency,
                architecture judgment, leadership stories, and full-loop mocks in one focused hour a day.
              </p>
            </div>
            <aside className="hero-board" aria-label="Sprint architecture">
              <span className="board-label">Sprint architecture</span>
              <div className="board-grid">
                <span className="board-stat"><strong>42</strong><span>days</span></span>
                <span className="board-stat"><strong>60</strong><span>min/day</span></span>
                <span className="board-stat"><strong>5</strong><span>tracks</span></span>
              </div>
            </aside>
          </div>
          <div className="hero-actions">
            <div className="field">
              <label htmlFor="startDate">Program start date</label>
              <input id="startDate" type="date" value={state.startDate} onChange={(event) => onStartDateChange(event.currentTarget.value)} />
            </div>
            <button className="btn primary" type="button" onClick={onToday}>Open today&apos;s task</button>
            <button className="btn" type="button" onClick={onExport}>Export progress</button>
            <button className="btn" type="button" onClick={onImport}>Import progress</button>
            <button className="btn theme-toggle" type="button" aria-label={`Switch to ${nextTheme} theme`} onClick={onThemeToggle}>
              {nextTheme === "light" ? "Light" : "Dark"} theme
            </button>
            <button className="btn danger" type="button" onClick={onReset}>Reset</button>
          </div>
        </section>
      </header>

      <section className="stats" aria-label="Progress summary">
        {stats.map((stat) => (
          <article className={`stat stat-${stat.tone} glass`} key={stat.label}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-note">{stat.note}</div>
          </article>
        ))}
      </section>

      <section className="progress-card glass">
        <div className="progress-row">
          <span>{scheduleText}</span>
          <strong>{percent}% complete</strong>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </section>
    </>
  );
}
