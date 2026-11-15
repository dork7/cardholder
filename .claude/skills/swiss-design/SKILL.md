---
name: swiss-design
description: Doc Keeper's visual design system, in the Swiss (International Typographic) style — white paper and off-black ink, square corners, hairline rules, a strict type scale, monochrome actions with taupe kept for icons. Use when styling, adding or reviewing any UI in this app (theme tokens, buttons, chips, panels, typography).
---

# Swiss style for Doc Keeper

Swiss design removes the arbitrary: a grid, a strict type scale, and ink on paper. Decoration is cut until only what helps someone find and show a document is left. The card photos are the only strong colour on screen.

## Where the rules live

- Tokens: `src/ui/theme.ts` — `useTheme()` for colours, `TYPE`, `TRACKING`, `RADIUS`, `SHADOW`. Change a token there; never hardcode a colour, radius or letter spacing in a screen.
- Contrast and style guards: `src/ui/__tests__/theme.test.ts`, `Button.test.tsx`, `Surface.test.tsx`. Every palette must pass 4.5:1 for text and 3:1 for the filled accent and outlines.
- The visual-design section of `docs/design.md` records the agreed values.

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#111111` | the page |
| `surface` | `#F7F6F3` | `#1A1A1A` | panels, title and action bars |
| `bannerBg` | `#F5F1E8` beige | `#242424` | sheets, chips, tag pills, tooltips |
| `text` / `muted` | `#111111` / `#5C5C5C` | `#F5F5F5` / `#A8A8A8` | ink and secondary ink |
| `accent` / `onAccent` | `#111111` / `#FFFFFF` | `#F5F1E8` / `#111111` | filled primary buttons, chosen chips, the add button, switch tracks |
| `ornament` | `#B38B6D` taupe | `#B38B6D` | the tint inside pixel icons and the logo seal — decoration only |
| `rosette` | `#808080` | `#808080` | secondary outlines (3:1) |
| `selection` | `#1F6FD0` | `#539DF5` | focus and selection only |
| `danger` | `#C2283A` | `#F3727F` | destructive actions only |

- Actions are ink, not colour: the primary action is a filled charcoal block on light and a filled paper block on dark.
- Never pure `#000000` for ink (the counter view's black backdrop is the one exception: it frames a photo, it isn't ink).
- Taupe never marks an action or a state. Blue and red keep their single jobs.
- No new hues. If something needs emphasis, use weight, size or position first.

## Type

Public Sans (bundled, a neutral grotesque) for everything; `Text` maps weight to the right file.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display (counter view) | 32 | 700 | `TRACKING.tight` |
| Screen title | 24 | 700 | `TRACKING.tight` |
| Section title | 18 | 700 | `TRACKING.tight` |
| Body, button labels | 16 | 400 / 600 | 0 |
| Secondary | 14 | 400 / 600 | 0 |
| Label caps (section labels) | 12 | 600 uppercase | `TRACKING.caps` |
| Caption | 12 | 400 | 0 |

- Button labels are sentence case, 16 semibold. Capitals are only for small section labels.
- Card numbers keep tabular figures. No emoji in the UI.

## Shape and depth

- `RADIUS.none` (0) for panels, bars, sheets and the grid's selection frame. `RADIUS.sm` (2) for anything pressed or typed into: buttons, icon buttons, chips, tag pills, the search and tag fields, the add button, the appearance and gallery toggles, the stack's flip button.
- No pills and no circles. Stack dots and checkboxes are squares.
- Card photos are the real object, so they keep the true ID-1 corner (`CARD_RADIUS` = 3.7% of width) and no frame.
- Panels are separated from the page by a lighter or warmer shade plus a hairline `border`, not by shadow.
- Shadows are sharp and light: `SHADOW.heavy` (16%, 4 blur, 2 down) only on what floats — the add button and tooltips.
- Text fields: label above, a single bottom rule, error text below in `danger`.

## Layout and motion

- Content left-aligned on a 16 pt column; spacing in multiples of 4, mostly 8 / 12 / 16 / 24. Only the empty state centres.
- Motion is functional: the card flip and the wallet stack stay; fades are 150–250 ms ease-out; everything is instant with Reduce Motion.

## Avoid

- Rounded pills, circles, gradients, glows, blur, glass.
- Coloured buttons for anything but destructive actions.
- Uppercase tracked button labels (that was the earlier Spotify-inspired style).
- Decorative colour outside icons and the logo.
