# Design System: Sherly Technical Interview Sprint

The current visual system follows the `/Users/bytedance/Downloads/revamp` reference: a minimal-futuristic interview sprint dashboard with a light default theme and a matching dark variant.

## Direction

- The primary feel is clean, airy, technical, and focused.
- Light mode is the default: white/translucent cards on a pale blue-lilac atmospheric background.
- Dark mode keeps the same structure and gradient language with deep navy surfaces.
- The main signature is the purple-to-cyan gradient system across primary actions, progress, stat numerals, and the focus timer ring.

## Palette

- Light page shell: `#f7f8fc` / `#fbfbfe` / `#f5f6fb`.
- Dark page shell: `#07070f` / `#07080f` / `#0b0d1a`.
- Brand gradient: `#6366f1` to `#8b5cf6` to `#22d3ee`.
- Accent: `#5b50c4` in light mode, `#b3a8ff` in dark mode.
- Signals: teal `#0d9488`, amber `#f59e0b`, red `#e11d48`, pink `#ec4899`.
- Category colors remain defined in `lib/interview-plan.ts` and are applied inline by the app.

## Typography

The app imports the reference Google fonts from `app/globals.css`:

- Display: `Space Grotesk`.
- Body: `Manrope`.
- Utility/data: `Space Mono`.

Use `Space Grotesk` for large headings, stat values, section headings, and timer numerals. Use `Space Mono` for labels, metadata, calendar captions, and compact status text.

## Layout

- Shell width: `min(1180px, calc(100% - 36px))`.
- Hero: two-column layout with a compact sprint architecture board.
- Main grid: day plan and sticky rail on desktop; single column below 900px.
- Cards use translucent surfaces, soft blur, and reduced shadows.
- Controls use pill shapes and tight interaction states.

## Theme Behavior

- Theme preference is stored under `sherlyInterviewTheme`.
- The early script in `app/layout.tsx` applies the stored or system-preferred theme before paint.
- `lib/theme.ts` owns the shell theme colors: light `#f7f8fc`, dark `#07070f`.
- The theme toggle remains in the hero action row.

## Calendar Rules

- Calendar state is activity-led, not schedule-led.
- A day is `completed` only with a real `completedOn` value.
- Missed dates appear only after at least one completed day starts the streak.
- Before the first completed day, unworked scheduled dates remain neutral.

## Implementation Notes

- `app/globals.css` is the source of truth for the reference visual system.
- Preserve existing class names unless component markup is intentionally redesigned.
- Keep e2e-visible labels stable unless tests are updated with a deliberate interaction change.
