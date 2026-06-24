"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { TASK_IDS, taskById, type FilterValue } from "../lib/interview-plan";
import { parseStorageJson } from "../lib/storage-schema";
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
  downloadStateExport,
  loadStoredState,
  writeStoredState,
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
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ message, visible: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => ({ message: current.message, visible: false }));
    }, TOAST_MS);
  }, []);

  const commitState = useCallback((nextState: TrackerState, message?: string) => {
    stateRef.current = nextState;
    setState(nextState);
    const saved = writeStoredState(nextState);
    if (message !== undefined) showToast(saved ? message : "Progress is in memory; browser storage is unavailable");
  }, [showToast]);

  const triggerConfetti = useCallback(() => {
    const baseId = confettiIdRef.current;
    confettiIdRef.current += CONFETTI_COUNT;
    setConfetti(createConfettiPieces(baseId));
    if (confettiTimerRef.current !== null) window.clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = window.setTimeout(() => setConfetti([]), CONFETTI_MS);
  }, []);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const preferredTheme = readThemePreference();
      const stored = loadStoredState();
      applyTheme(preferredTheme);
      setTheme(preferredTheme);
      stateRef.current = stored;
      setState(stored);
      setNowMs(Date.now());
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      if (TASK_IDS.some((id) => ensureDay(stateRef.current, id).runningSince !== null) && nextNow % 5000 < 1100) {
        writeStoredState(stateRef.current);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const saveBeforeUnload = () => {
      writeStoredState(stateRef.current);
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
    autosaveTimerRef.current = window.setTimeout(() => writeStoredState(stateRef.current), 250);
  }, []);

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

  const handleExport = useCallback(() => {
    const nextState = pauseAllExcept(stateRef.current, null);
    commitState(nextState);
    downloadStateExport(nextState);
    showToast("Progress exported");
  }, [commitState, showToast]);

  const handleThemeToggle = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    persistThemePreference(nextTheme);
    setTheme(nextTheme);
    showToast(`${nextTheme === "dark" ? "Dark" : "Light"} theme enabled`);
  }, [showToast, theme]);

  const handleImportChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files === null ? null : input.files.item(0);
    if (file === null) return;
    try {
      const result = parseStorageJson(await file.text());
      if (result.ok) commitState(result.state, "Progress imported");
      else window.alert("That file is not a valid progress export.");
    } catch (error) {
      if (error instanceof DOMException) window.alert("That file could not be read.");
      else throw error;
    } finally {
      input.value = "";
    }
  }, [commitState]);

  if (!isHydrated) {
    return (
      <div className="shell">
        <header>
          <section className="hero glass" aria-busy="true">
            <span className="eyebrow">Preparing tracker</span>
            <h1>Sherly&apos;s Technical Interview Sprint</h1>
            <p>Loading saved progress, notes, timers, and streaks from this browser.</p>
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
          onExport={handleExport}
          onImport={() => importInputRef.current?.click()}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          onReset={() => {
            if (window.confirm("Reset all progress, notes, timers, and streaks? This cannot be undone unless you exported a backup.")) {
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
      <input ref={importInputRef} type="file" accept="application/json" hidden onChange={handleImportChange} />
      <div className={classNames(["toast", toast.visible ? "show" : ""])} role="status" aria-live="polite">{toast.message}</div>
      <div className="celebrate">
        {confetti.map((piece) => <i className="confetti" key={piece.id} style={{ left: piece.left, background: piece.color, animationDelay: piece.delay }} />)}
      </div>
    </>
  );
}
