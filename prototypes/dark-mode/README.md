# Dark mode prototype (throwaway)

Question: what should Doc Keeper's dark mode look like? Four treatments of the same four screens (Home, Documents, Spaces and notes, full-screen viewer), plus a live WCAG contrast report.

Run `npm run prototypes`, then open http://127.0.0.1:4178/prototypes/dark-mode/?variant=navy. Other keys: `graphite`, `oled`, `comfort`. Use the bottom arrows or the left and right keys.

- **A, Navy glass:** the shipped palette in `src/ui/theme.ts`, refined.
- **B, Graphite:** neutral grey, tonal elevation only, desaturated accent.
- **C, Midnight OLED:** true black, indigo hairline borders, glowing hero, outlined space tiles.

- **D, Comfort (recommended):** soft near-black, tonal elevation with a faint border, off-white text, 44px touch targets, larger small text.

Read-only, no storage. Variants differ in surface strategy (fill, tone or outline), not layout, since the question is the dark look.
