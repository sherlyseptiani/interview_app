# Design System: Sherly Technical Interview Sprint

This app is a premium, private interview command room for a 42-day senior technical interview sprint. It should feel focused, composed, and executive in both supported themes: deep ink at night, a clean white canvas in light mode, champagne signal accents, precise translucent surfaces, and a luminous focus timer as the signature instrument.

## 1. Visual Theme

The product is for one high-intent user preparing for Senior Engineering Manager and Senior / Lead Technical Program Manager interviews. The interface should feel like a calm cockpit for daily execution, not a generic pastel productivity dashboard.

Core visual traits:

- Background: fixed atmospheric gradients. Dark uses obsidian-to-navy; light uses a white-forward canvas with subtle blue, cyan, and champagne light fields.
- Surface language: translucent glass cards with champagne hairline borders, soft inset highlights, and theme-appropriate shadows.
- Shape language: large rounded command panels, tight pill controls, and precise instrument-like calendar cells.
- Color personality: champagne is the premium primary accent; cyan, blue, purple, rose, and green remain as signal colors for progress, categories, and state.
- Density: dashboard-like and operational. The hero frames the sprint, stats summarize progress, the main grid pairs the day plan with the timer, and the plan/calendar sections handle navigation.
- Signature element: the 60-minute timer is a luminous dial with a conic progress ring and fine tick marks.

Do not return to opaque white cards, pastel-only glassmorphism, or a generic single-color SaaS palette. Light mode should still feel premium and intentional, not like the dark theme was simply inverted.

## 2. Color Tokens

Use the CSS custom properties in `app/globals.css` as the source of truth.

```css
:root {
  --ink: #f6f0df;
  --muted: #b9c1d0;
  --soft: #8790a4;
  --line: rgba(244, 211, 131, .16);
  --glass: rgba(13, 19, 31, .72);
  --shadow: 0 28px 90px rgba(0, 0, 0, .46);
  --teal: #54e1c5;
  --blue: #77a7ff;
  --purple: #b497ff;
  --coral: #ff789a;
  --amber: #f4d383;
  --green: #63d894;
  --red: #ff727f;
  --champagne: #f4d383;
  --obsidian: #070a12;
}
```

Page and PWA colors:

- Dark meta theme color: `#070a12`.
- Light meta theme color: `#fbfcff`.
- Manifest background and theme color: `#070a12` as the installed-shell fallback.
- Body base: theme-specific fixed gradients with radial blue, cyan, and champagne light fields.

Theme behavior:

- The user can toggle themes from the hero actions.
- The preference is stored in local storage under `sherlyInterviewTheme`.
- The early theme script in `app/layout.tsx` applies stored preference before first paint; otherwise it follows `prefers-color-scheme`.
- The client updates `document.documentElement.dataset.theme` and the `theme-color` meta tag when toggled.

Category colors from `lib/interview-plan.ts` remain unchanged to preserve the data contract and existing tests:

- Coding: `#4f7cff`.
- Frontend: `#12b8a6`.
- System Design: `#8658e8`.
- Leadership / TPM: `#f56f91`.
- Mock / Review: `#efa52f`.

## 3. Typography

The UI uses system fonts only. No external font request is required.

```css
--font-display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
--font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-utility: "SF Mono", "Roboto Mono", "Cascadia Code", ui-monospace, monospace;
```

Typography rules:

- Use the display serif for the hero title, day title, and major section titles.
- Use the body sans for task content, controls, and readable paragraphs.
- Use the utility mono for labels, time values, compact metadata, and dashboard markings.
- Maintain negative letter spacing on large headings and numeric values.
- Timer values must use tabular numerals.

## 4. Layout

Global layout:

- `.shell`: `min(1240px, calc(100% - 32px))`, centered.
- Hero: two-column composition on desktop, single column below 900px.
- Hero board: three compact sprint facts: 42 days, 60 min/day, 5 tracks.
- Main grid: day panel plus sticky side rail on desktop; collapses to one column below 900px.
- Major panels: `30px` radius on desktop, `22px` on mobile.
- Mobile controls: hero actions become a two-column grid, then a one-column grid on very narrow screens.

## 5. Components

Glass panels:

- Use transparent borders with a gradient border-box background.
- Keep inset highlights and deep shadows for premium depth.
- Major panels include a subtle champagne top hairline.

Buttons:

- Primary actions use a champagne gradient with dark text.
- Success actions use a cyan-to-green gradient.
- Secondary actions use dark translucent fills and champagne borders on hover.
- Danger actions use red-tinted text and low-opacity red fills.

Timer:

- `.timer-ring` uses `--timer-progress` to drive the conic fill.
- The dial has a dark inner face, champagne glow, and repeating conic tick marks.
- The timer remains the strongest persistent visual anchor.

Calendar and plan:

- Keep the current interaction model and accessible labels.
- Use dark cells with clear completed, in-progress, missed, today, and selected states.
- Preserve exact button labels used by e2e tests.
- Calendar status is activity-led, not schedule-led. A date can be `completed` only when the day has a real `completedOn` date, and `missed` dates should not appear until at least one completed day has started the streak.
- Before the first completed day, unworked scheduled dates remain neutral so the calendar does not look failed before the user starts.
- Calendar previous/today/next controls should stay as one compact segmented row, especially in the side rail.

## 6. Implementation Notes

The Next app is the primary implementation. The root `index.html` is a legacy static artifact and should visually match the current system when it is kept in the repo. If the design system changes, update both `app/globals.css` and the static page overrides together.
