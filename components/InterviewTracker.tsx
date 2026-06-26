"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { TASK_IDS, taskById, type FilterValue } from "../lib/interview-plan";
import { isThemeMode, THEME_COLORS, THEME_STORAGE_KEY, type ThemeMode } from "../lib/theme";
import {
  addElapsedMinutes,
  allChecksDone,
  canComplete,
  completeDay,
  currentTaskForToday,
  elapsedSeconds,
  ensureDay,
  initialState,
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
  type TrackerState,
} from "../lib/tracker-state";
import { DayPanel } from "./DayPanel";
import { PlanSection } from "./PlanSection";
import { TrackerRail } from "./TrackerRail";
import { TrackerHeader } from "./TrackerHeader";
import {
  CONFETTI_COUNT,
  CONFETTI_MS,
  TOAST_MS,
  createConfettiPieces,
  loadProgressState,
  saveProgressState,
  sendProgressBeacon,
  type ConfettiPiece,
} from "./tracker-browser";
import { calendarMonthStartISO, classNames, type ToastState } from "./tracker-types";

function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset["theme"] = theme;
  document.documentElement.style.colorScheme = theme;
  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta === null) {
    themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = THEME_COLORS[theme];
}

function readThemePreference(): ThemeMode {
  const activeTheme = document.documentElement.dataset["theme"];
  if (isThemeMode(activeTheme)) return activeTheme;
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(storedTheme)) return storedTheme;
  } catch {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function persistThemePreference(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for this session even if storage is blocked.
  }
}

export function InterviewTracker() {
  const [state, setState] = useState<TrackerState>(() => initialState());
  const [isHydrated, setIsHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [visibleMonthStart, setVisibleMonthStart] = useState(() => calendarMonthStartISO());
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });
  const [confetti, setConfetti] = useState<readonly ConfettiPiece[]>([]);
  const stateRef = useRef(state);
  const toastTimerRef = useRef<number | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const confettiIdRef = useRef(1);
  const persistenceConfiguredRef = useRef(true);
  const pendingSaveRef = useRef<TrackerState | null>(null);
  const saveInFlightRef = useRef(false);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ message, visible: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => ({ message: current.message, visible: false }));
    }, TOAST_MS);
  }, []);

  const queueProgressSave = useCallback((nextState: TrackerState) => {
    if (!persistenceConfiguredRef.current) return;
    pendingSaveRef.current = nextState;
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    void (async () => {
      while (pendingSaveRef.current !== null) {
        const stateToSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        await saveProgressState(stateToSave);
      }
      saveInFlightRef.current = false;
    })();
  }, []);

  const commitState = useCallback((nextState: TrackerState, message?: string) => {
    stateRef.current = nextState;
    setState(nextState);
    queueProgressSave(nextState);
    if (message !== undefined) showToast(message);
  }, [queueProgressSave, showToast]);

  const triggerConfetti = useCallback(() => {
    const baseId = confettiIdRef.current;
    confettiIdRef.current += CONFETTI_COUNT;
    setConfetti(createConfettiPieces(baseId));
    if (confettiTimerRef.current !== null) window.clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = window.setTimeout(() => setConfetti([]), CONFETTI_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrationTimer = window.setTimeout(() => {
      const preferredTheme = readThemePreference();
      applyTheme(preferredTheme);
      setTheme(preferredTheme);
      void (async () => {
        const stored = await loadProgressState();
        if (cancelled) return;
        persistenceConfiguredRef.current = stored.configured;
        stateRef.current = stored.state;
        setState(stored.state);
        setNowMs(Date.now());
        setIsHydrated(true);
        if (!stored.configured) showToast("Supabase is not configured; progress is in memory for this session.");
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(hydrationTimer);
    };
  }, [showToast]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      if (TASK_IDS.some((id) => ensureDay(stateRef.current, id).runningSince !== null) && nextNow % 5000 < 1100) {
        queueProgressSave(stateRef.current);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [queueProgressSave]);

  useEffect(() => {
    const saveBeforeUnload = () => {
      if (!persistenceConfiguredRef.current) return;
      if (!sendProgressBeacon(stateRef.current)) void saveProgressState(stateRef.current);
    };
    window.addEventListener("beforeunload", saveBeforeUnload);
    return () => window.removeEventListener("beforeunload", saveBeforeUnload);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    if (confettiTimerRef.current !== null) window.clearTimeout(confettiTimerRef.current);
  }, []);

  const selectedTask = taskById(state.selectedId);
  const selectedDay = ensureDay(state, selectedTask.id);
  const checkedCount = selectedDay.checks.filter(Boolean).length;
  const elapsed = elapsedSeconds(state, selectedTask.id, nowMs);
  const checksDone = allChecksDone(state, selectedTask.id);
  const readyToComplete = canComplete(state, selectedTask.id, nowMs);

  const selectDay = useCallback((id: number, scroll: boolean) => {
    commitState(setSelectedId(stateRef.current, id));
    if (scroll) {
      window.requestAnimationFrame(() => document.getElementById("dayPanel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [commitState]);

  const handleNotesChange = useCallback((notes: string) => {
    const nextState = setNotes(stateRef.current, stateRef.current.selectedId, notes);
    stateRef.current = nextState;
    setState(nextState);
    if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => queueProgressSave(stateRef.current), 250);
  }, [queueProgressSave]);

  const handleTimerToggle = useCallback(() => {
    const id = stateRef.current.selectedId;
    const day = ensureDay(stateRef.current, id);
    const nextState = day.runningSince === null ? startDayTimer(stateRef.current, id) : pauseDay(stateRef.current, id);
    commitState(nextState, day.runningSince === null ? "Focus timer started" : "Timer paused");
  }, [commitState]);

  const handleCompleteToggle = useCallback(() => {
    const id = stateRef.current.selectedId;
    const day = ensureDay(stateRef.current, id);
    if (day.completed) {
      if (!window.confirm("Reopen this day? Its checklist, notes, and timer will stay.")) return;
      commitState(reopenDay(stateRef.current, id), "Day reopened");
      return;
    }
    if (!canComplete(stateRef.current, id)) return;
    commitState(completeDay(stateRef.current, id), `Day ${id} complete - streak protected!`);
    triggerConfetti();
  }, [commitState, triggerConfetti]);

  const handleThemeToggle = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    persistThemePreference(nextTheme);
    setTheme(nextTheme);
    showToast(`${nextTheme === "dark" ? "Dark" : "Light"} theme enabled`);
  }, [showToast, theme]);

  if (!isHydrated) {
    return (
      <div className="shell">
        <header>
          <section className="hero glass" aria-busy="true">
            <span className="eyebrow">Preparing tracker</span>
            <h1>Sherly&apos;s Technical Interview Sprint</h1>
            <p>Loading saved progress, notes, timers, and streaks from Supabase.</p>
          </section>
        </header>
      </div>
    );
  }

  return (
    <>
      <div className="shell">
        <TrackerHeader
          state={state}
          nowMs={nowMs}
          onStartDateChange={(value) => {
            if (value.length > 0) commitState(setStartDate(stateRef.current, value), "Schedule updated");
          }}
          onToday={() => {
            setVisibleMonthStart(calendarMonthStartISO());
            selectDay(currentTaskForToday(stateRef.current), true);
          }}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          onReset={() => {
            if (window.confirm("Reset all progress, notes, timers, and streaks? This cannot be undone.")) {
              commitState(initialState(), "Tracker reset");
            }
          }}
        />
        <main className="main-grid">
          <DayPanel
            task={selectedTask}
            day={selectedDay}
            scheduledDate={scheduledDate(state, selectedTask.id)}
            checkedCount={checkedCount}
            onPrevious={() => selectDay(selectedTask.id - 1, false)}
            onNext={() => selectDay(selectedTask.id + 1, false)}
            onCheckChange={(index, checked) => commitState(setCheck(stateRef.current, stateRef.current.selectedId, index, checked))}
            onNotesChange={handleNotesChange}
          />
          <TrackerRail
            state={state}
            task={selectedTask}
            day={selectedDay}
            elapsed={elapsed}
            checkedCount={checkedCount}
            checksDone={checksDone}
            readyToComplete={readyToComplete}
            visibleMonthStart={visibleMonthStart}
            nowMs={nowMs}
            onVisibleMonthStartChange={setVisibleMonthStart}
            onSelectDay={selectDay}
            onTimerToggle={handleTimerToggle}
            onTimerReset={() => {
              if (window.confirm("Reset the timer for this day? Checklist and notes will stay.")) commitState(resetDayTimer(stateRef.current, stateRef.current.selectedId), "Timer reset");
            }}
            onAddMinutes={(minutes) => commitState(addElapsedMinutes(stateRef.current, stateRef.current.selectedId, minutes), `${minutes} minutes added`)}
            onCompleteToggle={handleCompleteToggle}
          />
        </main>
        <PlanSection state={state} nowMs={nowMs} onFilterChange={(filter: FilterValue) => commitState(setFilter(stateRef.current, filter))} onSelectDay={selectDay} />
        <footer>Built for one focused hour a day. Consistency beats cramming.</footer>
      </div>
      <div className={classNames(["toast", toast.visible ? "show" : ""])} role="status" aria-live="polite">{toast.message}</div>
      <div className="celebrate">
        {confetti.map((piece) => <i className="confetti" key={piece.id} style={{ left: piece.left, background: piece.color, animationDelay: piece.delay }} />)}
      </div>
    </>
  );
}
