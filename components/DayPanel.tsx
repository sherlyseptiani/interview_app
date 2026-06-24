import { TASKS, type InterviewTask } from "../lib/interview-plan";
import { categoryColor, type DayState } from "../lib/tracker-state";
import { formatDate } from "./tracker-types";

type DayPanelProps = Readonly<{
  task: InterviewTask;
  day: DayState;
  scheduledDate: string;
  checkedCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onCheckChange: (index: number, checked: boolean) => void;
  onNotesChange: (notes: string) => void;
}>;

export function DayPanel({
  task,
  day,
  scheduledDate,
  checkedCount,
  onPrevious,
  onNext,
  onCheckChange,
  onNotesChange,
}: DayPanelProps) {
  return (
    <article className="panel day-panel glass" id="dayPanel">
      <div className="day-top">
        <div>
          <div className="day-kicker">
            <span className="badge">Day {task.id} - Week {task.week}</span>
            <span className="badge category-badge" style={{ background: categoryColor(task.category) }}>{task.category}</span>
            <span className="badge">{formatDate(scheduledDate, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
          <h2 className="day-title">{task.title}</h2>
          <p className="day-goal">{task.goal}</p>
        </div>
        <div className="nav-buttons">
          <button className="icon-btn" type="button" aria-label="Previous day" disabled={task.id === 1} onClick={onPrevious}>&lt;</button>
          <button className="icon-btn" type="button" aria-label="Next day" disabled={task.id === TASKS.length} onClick={onNext}>&gt;</button>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h3>Today&apos;s checklist</h3>
          <span className="mini">{checkedCount} of {task.checklist.length} complete</span>
        </div>
        <div className="checklist">
          {task.checklist.map((item, index) => {
            const checked = day.checks[index] === true;
            return (
              <label className={`check-row ${checked ? "done" : ""}`} key={item.text}>
                <input
                  type="checkbox"
                  checked={checked}
                  aria-label={`Day ${task.id} - Checklist item ${index + 1}: ${item.text}`}
                  onChange={(event) => onCheckChange(index, event.currentTarget.checked)}
                />
                <span className="minutes">{item.minutes} min</span>
                <span className="check-text">{item.text}</span>
              </label>
            );
          })}
        </div>
      </section>

      {task.resources.length > 0 ? (
        <section className="section" id="resourcesSection">
          <div className="section-head">
            <h3>Related learning links</h3>
            <span className="mini">Open in a new tab</span>
          </div>
          <div className="resource-list">
            {task.resources.map((resource) => (
              <a className="resource" href={resource.url} key={resource.url} target="_blank" rel="noopener noreferrer">
                Open {resource.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section tips">
        <h3>Coach tips for this task</h3>
        <ul>{task.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
      </section>

      <section className="section">
        <div className="section-head">
          <h3>Daily notes</h3>
          <span className="mini">Key learnings, answers, mistakes, and follow-ups</span>
        </div>
        <textarea
          aria-label="Daily notes"
          value={day.notes}
          placeholder="Write what you learned, an interview-ready explanation, mistakes to revisit, or questions that remain..."
          onChange={(event) => onNotesChange(event.currentTarget.value)}
        />
        <div className="autosave">Saved automatically in this browser</div>
      </section>
    </article>
  );
}
