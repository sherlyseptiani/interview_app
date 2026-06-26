import { type ReactNode, useRef } from "react";

import { TASKS, type InterviewTask } from "../lib/interview-plan";
import { categoryColor, type DayState } from "../lib/tracker-state";
import { formatDate } from "./tracker-types";

type NotesFormat = "bold" | "bullet" | "number" | "heading";

type FormatResult = Readonly<{
  notes: string;
  selectionStart: number;
  selectionEnd: number;
}>;

const NOTES_FORMATS: readonly Readonly<{
  format: NotesFormat;
  label: string;
  marker: string;
}>[] = [
  { format: "bold", label: "Bold", marker: "B" },
  { format: "heading", label: "Heading", marker: "#" },
  { format: "bullet", label: "Bullets", marker: "-" },
  { format: "number", label: "Numbers", marker: "1." },
];

function applyBoldFormat(notes: string, selectionStart: number, selectionEnd: number): FormatResult {
  const selectedText = notes.slice(selectionStart, selectionEnd);
  const replacementText = selectedText.length > 0 ? selectedText : "bold text";
  const replacement = `**${replacementText}**`;
  return {
    notes: `${notes.slice(0, selectionStart)}${replacement}${notes.slice(selectionEnd)}`,
    selectionStart: selectedText.length > 0 ? selectionStart : selectionStart + 2,
    selectionEnd: selectedText.length > 0 ? selectionStart + replacement.length : selectionStart + 2 + replacementText.length,
  };
}

function selectedLineRange(notes: string, selectionStart: number, selectionEnd: number): Readonly<{ start: number; end: number }> {
  const effectiveEnd = selectionEnd > selectionStart && notes[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
  const start = notes.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextLineBreak = notes.indexOf("\n", effectiveEnd);
  return { start, end: nextLineBreak === -1 ? notes.length : nextLineBreak };
}

function removeLineMarker(line: string): string {
  return line.replace(/^(\s*)(?:#{1,6}\s+|[-*]\s+|\d+[.)]\s+)/, "$1");
}

function applyHeadingFormat(notes: string, selectionStart: number, selectionEnd: number): FormatResult {
  const range = selectedLineRange(notes, selectionStart, selectionEnd);
  const block = notes.slice(range.start, range.end);
  const formattedLines = block.split("\n").map((line) => {
    const cleanedLine = removeLineMarker(line);
    const indentation = cleanedLine.match(/^\s*/)?.[0] ?? "";
    const content = cleanedLine.slice(indentation.length);
    return `${indentation}# ${content.length > 0 ? content : "Heading"}`;
  });
  const replacement = formattedLines.join("\n");
  const isPlaceholder = block.length === 0;
  return {
    notes: `${notes.slice(0, range.start)}${replacement}${notes.slice(range.end)}`,
    selectionStart: isPlaceholder ? range.start + 2 : range.start,
    selectionEnd: isPlaceholder ? range.start + replacement.length : range.start + replacement.length,
  };
}

function applyListFormat(notes: string, selectionStart: number, selectionEnd: number, format: "bullet" | "number"): FormatResult {
  const range = selectedLineRange(notes, selectionStart, selectionEnd);
  const block = notes.slice(range.start, range.end);
  const formattedLines = block.split("\n").map((line, index) => {
    const cleanedLine = removeLineMarker(line);
    const indentation = cleanedLine.match(/^\s*/)?.[0] ?? "";
    const content = cleanedLine.slice(indentation.length);
    const marker = format === "bullet" ? "-" : `${index + 1}.`;
    return `${indentation}${marker} ${content}`;
  });
  const replacement = formattedLines.join("\n");
  return {
    notes: `${notes.slice(0, range.start)}${replacement}${notes.slice(range.end)}`,
    selectionStart: range.start,
    selectionEnd: range.start + replacement.length,
  };
}

function applyNotesFormat(notes: string, selectionStart: number, selectionEnd: number, format: NotesFormat): FormatResult {
  if (format === "bold") return applyBoldFormat(notes, selectionStart, selectionEnd);
  if (format === "heading") return applyHeadingFormat(notes, selectionStart, selectionEnd);
  return applyListFormat(notes, selectionStart, selectionEnd, format);
}

function renderInlineMarkdown(text: string, keyPrefix: string): readonly ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match = boldPattern.exec(text);
  while (match !== null) {
    const matchText = match[0];
    const boldText = match[1] ?? "";
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    nodes.push(<strong key={`${keyPrefix}-bold-${match.index}`}>{boldText}</strong>);
    cursor = match.index + matchText.length;
    match = boldPattern.exec(text);
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderParagraph(lines: readonly string[], key: string): ReactNode {
  const children: ReactNode[] = [];
  lines.forEach((line, index) => {
    if (index > 0) children.push(<br key={`${key}-break-${index}`} />);
    children.push(...renderInlineMarkdown(line, `${key}-line-${index}`));
  });
  return <p key={key}>{children}</p>;
}

function listItem(line: string): Readonly<{ kind: "ul" | "ol"; text: string }> | null {
  const bullet = line.match(/^\s*[-*]\s+(.*)$/);
  if (bullet !== null) return { kind: "ul", text: bullet[1] ?? "" };
  const number = line.match(/^\s*\d+[.)]\s+(.*)$/);
  return number === null ? null : { kind: "ol", text: number[1] ?? "" };
}

function headingText(line: string): string | null {
  const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
  return heading === null ? null : heading[1] ?? "";
}

function NotesPreview({ notes }: Readonly<{ notes: string }>) {
  if (notes.trim().length === 0) {
    return (
      <div className="notes-preview" aria-label="Formatted notes preview">
        <p className="notes-empty">Formatted preview appears here as you write.</p>
      </div>
    );
  }

  const blocks: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let currentList: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push(renderParagraph(paragraphLines, `notes-paragraph-${blocks.length}`));
    paragraphLines = [];
  };

  const flushList = () => {
    if (currentList === null) return;
    const listKey = `notes-list-${blocks.length}`;
    const items = currentList.items.map((item, index) => <li key={`${listKey}-item-${index}`}>{renderInlineMarkdown(item, `${listKey}-item-${index}`)}</li>);
    blocks.push(currentList.kind === "ul" ? <ul key={listKey}>{items}</ul> : <ol key={listKey}>{items}</ol>);
    currentList = null;
  };

  for (const line of notes.split("\n")) {
    if (line.trim().length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = headingText(line);
    if (heading !== null) {
      flushParagraph();
      flushList();
      blocks.push(<h4 key={`notes-heading-${blocks.length}`}>{renderInlineMarkdown(heading, `notes-heading-${blocks.length}`)}</h4>);
      continue;
    }

    const item = listItem(line);
    if (item === null) {
      flushList();
      paragraphLines.push(line);
      continue;
    }

    flushParagraph();
    if (currentList !== null && currentList.kind !== item.kind) flushList();
    currentList = currentList ?? { kind: item.kind, items: [] };
    currentList.items.push(item.text);
  }

  flushParagraph();
  flushList();

  return <div className="notes-preview" aria-label="Formatted notes preview">{blocks}</div>;
}

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
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const handleNotesFormat = (format: NotesFormat) => {
    const textarea = notesRef.current;
    const selectionStart = textarea?.selectionStart ?? day.notes.length;
    const selectionEnd = textarea?.selectionEnd ?? day.notes.length;
    const result = applyNotesFormat(day.notes, selectionStart, selectionEnd, format);
    onNotesChange(result.notes);
    window.requestAnimationFrame(() => {
      notesRef.current?.focus();
      notesRef.current?.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

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
          <span className="mini">Markdown-style headings, bold, bullets, and numbering</span>
        </div>
        <div className="notes-toolbar" aria-label="Notes formatting toolbar">
          {NOTES_FORMATS.map((control) => (
            <button
              className="format-btn"
              type="button"
              key={control.format}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleNotesFormat(control.format)}
            >
              <span className="format-marker">{control.marker}</span>
              {control.label}
            </button>
          ))}
        </div>
        <textarea
          ref={notesRef}
          aria-label="Daily notes"
          value={day.notes}
          placeholder="Write what you learned, an interview-ready explanation, mistakes to revisit, or questions that remain..."
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
              event.preventDefault();
              handleNotesFormat("bold");
            }
          }}
          onChange={(event) => onNotesChange(event.currentTarget.value)}
        />
        <NotesPreview notes={day.notes} />
        <div className="autosave">Saved automatically in this browser</div>
      </section>
    </article>
  );
}
