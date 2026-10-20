---
name: stacked-journal-cards-mobile
description: Build a dark navy stacked-card journal/feed UI with orange borders for mobile (peeking card stack, frosted image, floating Back/Save/Next bar). Use when asked to recreate or build this style of swipeable cards.
---

# Stacked Journal Cards — Mobile

See `example.html` in this folder for a live demo.

Recreates a dark "journal entry" card stack (near-black navy screen, slate-teal cards, orange borders, charcoal buttons): a front card (avatar, title, date, share button, headline, quote excerpt, blurred hero photo, like/comment/send counts) with 2 cards peeking behind it, media-type chips above, and a floating **Back · Save · Next** action bar below. Designed for phone width.

## Defaults (override if the user says otherwise)
- Stack: React + TypeScript + plain CSS variables; gestures via pointer events (no heavy library needed). If the user wants native, keep the tokens/structure and map to React Native + `react-media-gesture-handler` + `react-native-reanimated` + `expo-blur`.
- Mock data only. Use generic placeholder photos (gradient or a soft flower-like blurred image); do not use real people's photos.
- Phone device frame in the reference is presentation only — do NOT build it. The screen itself is the deliverable.

## Design tokens
```css
:root {
  color-scheme: dark;
  --bg: #001219;            /* screen background */
  --card: #233d4d;          /* card layout */
  --card-back: #1c3443;     /* peeking back cards */
  --border: #fe7f2d;        /* borders (cards, chips, buttons) */
  --button: #343a40;        /* card & action-bar buttons */
  --ink: #f1f5f7;           /* headings */
  --label: #c5d3dc;         /* body text (~7:1 on --card) */
  --muted: #9fb3bf;         /* meta: date, stats (~5:1 on --card) */
  --accent: #fe7f2d;        /* selected chip, liked heart */
  --accent-ink: #001219;    /* text on --accent */
  --on-button: #ffffff;     /* text/icons on --button */
  --shadow: 0 20px 60px rgba(0,0,0,.5);
  --radius-card: 28px;
  --radius-panel: 24px;
  --radius-pill: 999px;
  --font: 'Inter', system-ui, -apple-system, 's_ui', sans-serif;
}
```

**Token roles** (how the components below use the tokens):

| Role | Token |
|------|-------|
| Screen background | `--bg` |
| Card fill / back cards | `--card` / `--card-back` |
| Card, chip & button borders | 1px `--border` |
| All buttons (Share, Back, Save, Next) | `--button` fill, `--on-button` icons/text |
| Headings · body · meta | `--ink` · `--label` · `--muted` |
| Selected chip, liked heart | `--accent` (`--accent-ink` text on it) |
| Hero art / thumbnails | `--accent` oranges over `--card` teals |

## Visual spec (from the reference)

**Screen background** — solid `--bg` with a faint teal glow behind the card stack (`radial-gradient(60% 40% at 50% 45%, rgba(35,61,77,.55), transparent)`).

**Media chips (top)** — row of 3 translucent pills at the top edge: "Videos", "Photos", "Audio", each with a small line icon on the left. Style: `rgba(255,255,255,.04)` fill, 1px `--border`, `backdrop-filter: blur(12px)`, `--radius-pill`, 12px text, `--label`. Selected chip: `--accent` fill with `--accent-ink` text. They act as a filter (single-select) and may be partially cut by the safe area like in the reference.
**Additional requirement**: add a filter based on the type of card at the top.

**Card stack** — front card plus up to 2 behind it:
- Back card 1: translateY(-14px) scale(.96), opacity .9.
- Back card 2: translateY(-28px) scale(.92), opacity .7.
- Back cards show a header strip only (small 36px thumbnail + title, e.g. "Collage") and are `pointer-events: none`, `aria-hidden`.
- All cards: `--card` fill (back cards `--card-back`), radius `--radius-card`, `--shadow`, 1px `--border` inner border.

**Front card layout** (padding 18px):
1. **Header row:** 44×44 avatar (radius 12, object-fit cover) · text block · share button right.
   - Title "Morning Reflection" 15px, weight 600, `--ink`.
   - Date "December 28, 10:00 AM" 12.5px, `--muted`. Format with `Intl.DateTimeFormat`.
   - Share button: 40px `--button` circle, 1px `--border`, soft shadow, share glyph in `--on-button`.
2. **Headline** "Today's quote" — 22px, weight 700, `--ink`, margin-top 16.
3. **Excerpt** — 14px / 1.45, `--label`, `-webkit-line-clamp: 3` with ellipsis ("…" at end), margin-top 8.
4. **Hero image** — occupies the remaining card height (min 1                80px), no hard edge: a soft-focus flower/abstract photo that fades into the card.
   - Apply a *progressive blur*: stack 3 absolutely positioned layers over the image, each with higher `backdrop-filter: blur()` (4px/10px/18px) masked by `linear-gradient` so the top of the image is blurrier and fades into the card color, plus a final `linear-gradient(to bottom, var(--card), transparent 35%)` overlay.
   - Fallback if no photo: layered blurred radial gradients in oranges (`--accent` → peach) over a dark teal base.
5. **Footer stats** — pinned to the bottom of the card: heart + 5342, comment bubble + 22, paper-plane + 14. 12px, `--muted`, 14px line icons, 16px gap. The heart is a toggle button (`aria-pressed`) that fills `--accent` and increments the count with a small scale pop.

**Floating action bar** — centered below the card (overlapping the card bottom by ~24px), 12px gap:
- **Back:** 52px circle, `--button` fill, 1px `--border`, left-arrow icon in `--on-button`, soft shadow.
- **Save:** pill (`--radius-pill`), height 52, min-width 120, `--button` fill, 1px `--border`, floppy/bookmark icon + "Save" label (15px, 600, `--on-button`), inner highlight `inset 0 1px 0 rgba(255,255,255,.08)`. After tapping, label changes to "Saved" with a check icon and `aria-pressed=true`.
- **Next:** 52px circle, `--button` fill, 1px `--border`, right-arrow icon in `--on-button`.
- Add `padding-bottom: calc(env(safe-area-inset-bottom) + 12px)`.
- **Pin functionality**: include a pin button to select the default card to be opened when the app is opened.

**Sample data**
```ts
export const entries = [
  { id: 1, title: 'Morning Reflection', date: '2026-12-28T10:00:00', headline: "Today's quote",
    excerpt: 'Some moments are fleeting, yet they leave a permanent mark. I soaked in the stunning silence, realizing that peace is not a place, but a state of mind.',
    likes: 5342, comments: 22, shares: 14, media: 'photos' },
  { id: 2, title: 'Collage', date: '2026-12-27T18:30:00', headline: 'Weekend moments',
    excerpt: 'A few frames from the weekend that I want to remember.', likes: 812, comments: 9, shares: 3, media: 'photos' },
  { id: 3, title: 'Voice note', date: '2026-12-26T08:15:00', headline: 'Morning thoughts',
    excerpt: 'Recorded a short note on the walk before work.', likes: 120, comments: 2, shares: 1, media: 'audio' },
];
```

## Interaction
- **Swipe:** horizontal drag on the front card (pointer events, `touch-action: pan-y`). Translate + rotate (`dx * 0.05deg`) while dragging; release past 30% of width or velocity > 0.5px/ms commits (card flies out, next card animates forward to front position); otherwise springs back.
- **Back/Next buttons** do the same as swipe left/right; Back is disabled at index 0, Next wraps or disables at the end (pick one and state it).
- **Stack promotion:** when index changes, back cards animate to the next slot (260ms `cubic-bezier(.2,.8,.2,1)`).
- **Chips** filter entries by `media`; reset index to 0 on change.
- Keyboard: `ArrowLeft/ArrowRight` navigate, `S` toggles save.
- `prefers-reduced-motion`: replace fly-out with a simple cross-fade.

## Components
`App` → `MediaChips`, `CardStack` → `JournalCard` (+ `StackedPeek` for back cards) → `ProgressiveBlurImage`, `ActionBar` (`IconButton`, `SaveButton`). Keep state (`index`, `saved: Set<id>`, `liked: Set<id>`, `filter`) in a small `useEntries` hook.

## Accessibility
- Front card is `<article aria-roledescription="card" aria-label="Entry 1 of N">`; hero image is decorative (`alt=""`) unless it carries meaning.
- All icon buttons have `aria-label` ("Previous entry", "Next entry", "Share", "Like", "Comment"). Min touch target 44×44.
- Text contrast on `--card`: `--label` ~7:1, `--muted` ~5:1, `--accent` ~4.5:1 (liked count). White on `--button` ~11:1; `--accent-ink` on `--accent` ~8:1. Re-check if you change the card or button colors.
- Use `100dvh` and `viewport-fit=cover`.

## Workflow
1. State the assumption (web mobile vs. native) in one line, then scaffold.
2. Build tokens → background → static front card → progressive blur image → stack peeks → action bar → gestures → chips.
3. Verify at 390×844 and 360×740: no horizontal scroll, excerpt clamps to 3 lines, action bar clears the home indicator, blur renders (and the gradient fallback works where `backdrop-filter` is unsupported).
4. Compare against the reference screenshot if attached; fix radii, spacing and blur strength.
5. Final reply: what was built, how to run it, one next step (e.g., persist saved entries with localStorage in try/catch, or wire to an API). 

use to to redesign the app

at the top add filter based on the type of card,

use pin button to select the default card to be opened when app is opened
