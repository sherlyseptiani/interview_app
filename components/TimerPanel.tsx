import type { CSSProperties } from "react";

import { TARGET_SECONDS, type InterviewTask } from "../lib/interview-plan";
import { formatTimer, type DayState } from "../lib/tracker-state";
import { TIMER_ADJUSTMENTS } from "./tracker-types";

type TimerPanelProps = Readonly<{
  task: InterviewTask;
  day: DayState;
  elapsed: number;
  checkedCount: number;
  readyToComplete: boolean;
  checksDone: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onAddMinutes: (minutes: number) => void;
  onCompleteToggle: () => void;
}>;

export function TimerPanel({
  task,
  day,
  elapsed,
  checkedCount,
  readyToComplete,
  checksDone,
  onToggleTimer,
  onResetTimer,
  onAddMinutes,
  onCompleteToggle,
}: TimerPanelProps) {
  const progress = Math.min(1, elapsed / TARGET_SECONDS);
  const timerRingStyle = { "--timer-progress": `${progress * 360}deg` } as CSSProperties;
  const remainingLabel = elapsed >= TARGET_SECONDS ? "Minimum reached" : `${Math.ceil((TARGET_SECONDS - elapsed) / 60)} minutes remaining`;
  const completeClass = day.completed || readyToComplete ? "btn success complete-button" : "btn primary complete-button";
  const completeDisabled = !day.completed && !readyToComplete;
  const stateLabel = day.runningSince !== null ? "Running" : elapsed > 0 ? "Paused" : "Ready";
  const toggleText = day.runningSince !== null ? "Pause timer" : elapsed > 0 ? "Resume timer" : "Start timer";
  const completeText = day.completed
    ? "Day complete - Reopen"
    : readyToComplete
      ? "Mark day complete"
      : checksDone
        ? `${Math.ceil((TARGET_SECONDS - elapsed) / 60)} minutes left`
        : "Complete the checklist first";

  return (
    <section className="panel timer-panel glass" aria-labelledby="timerPanelTitle">
      <div className="timer-title">
        <h2 id="timerPanelTitle">60-minute focus timer</h2>
        <span className="badge">{stateLabel}</span>
      </div>
      <div className="timer-ring" style={timerRingStyle}>
        <div className="timer-content">
          <div className="timer-display" aria-live="polite">{formatTimer(elapsed)}</div>
          <div className="timer-label">{remainingLabel}</div>
        </div>
      </div>
      <div className="timer-actions">
        <button className="btn success" type="button" onClick={onToggleTimer}>{toggleText}</button>
        <button className="btn" type="button" onClick={onResetTimer}>Reset timer</button>
      </div>
      <div className="timer-adjust">
        {TIMER_ADJUSTMENTS.map((minutes) => (
          <button className="btn small soft" type="button" key={minutes} onClick={() => onAddMinutes(minutes)}>+{minutes} min</button>
        ))}
      </div>
      <div className="gate">
        <div className="gate-row"><span>Checklist</span><strong>{checkedCount} / {task.checklist.length}</strong></div>
        <div className="gate-row"><span>Focused time</span><strong>{Math.floor(elapsed / 60)} / 60 min</strong></div>
      </div>
      <button className={completeClass} type="button" disabled={completeDisabled} onClick={onCompleteToggle}>
        {completeText}
      </button>
      <p className="completion-note">A day can be completed after all checklist items are checked and at least 60 minutes are recorded.</p>
    </section>
  );
}
