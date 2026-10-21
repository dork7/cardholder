---
name: button-placement
description: Rules for where buttons go and how much weight each gets — primary vs secondary vs destructive, dialog and form order, mobile thumb zone, touch targets, keyboard, and RTL mirroring. Use when adding or moving buttons, laying out a form, dialog or screen's actions, or reviewing a UI's action hierarchy.
---
# Button Placement

Rules for placing buttons so the UI reads clearly and is easy to use.

## Core principles

1. **One primary action per view.** Give it the strongest visual weight (filled, high contrast). Secondary actions get outline or ghost styles, and tertiary ones get text links.
2. **Place buttons where the eye ends.** Users scan in an F or Z pattern, so the action goes at the end of the content it affects: the bottom of a form, the bottom-right of a dialog, the end of a card.
3. **Keep actions close to their object.** An "Edit" button belongs on the item it edits, not in a distant toolbar (Gestalt proximity).
4. **Be consistent.** The same action goes in the same place on every screen. Predictability beats cleverness.
5. **Follow Fitts's law.** Frequent or important actions should be large and easy to reach. Rare actions can be smaller.

## Dialogs and forms

- **Primary action on the right, secondary (Cancel) on the left** in LTR layouts. That is the convention on the web and Windows. macOS reverses the order, but pick one and stick to it.
- **Align the buttons with the form fields.** Left-align on long forms, right-align in modals.
- **Put the primary button last in the reading and tab order.** The flow should be natural: fields, then submit.
- **Use specific labels.** "Save changes" and "Delete account" beat "OK" and "Submit".
- **Don't put Cancel and Submit at the same visual weight.** That invites mistakes.

## Destructive actions

- Separate them physically from the primary action, with space or a different section.
- Don't make them the default or the most prominent button unless the whole screen is about deletion.
- Use red or a warning style, plus a confirmation step or undo for anything irreversible.

## Mobile

- **Use the thumb zone.** Put primary actions in the bottom third of the screen, within one-handed reach.
- **Use sticky bottom bars or FABs** for the main action on long scrolling screens.
- **Keep touch targets at least 44×44 pt (iOS) or 48×48 dp (Android)**, with at least 8px between them.
- **Avoid top corners for key actions.** They're the hardest to reach on large phones.
- Account for the keyboard: the button should stay visible above it, not hidden behind it.

## Layout and hierarchy

- **Order buttons by importance and frequency**, with the primary one most prominent.
- **Don't scatter actions.** Group related ones together, and use an overflow (⋯) menu for rare ones.
- **Use full-width buttons on mobile forms** and auto-width buttons on desktop. Full-width on desktop looks clumsy.
- **Keep the primary button above the fold** when the form is short. For long pages, repeat it or make it sticky.
- **Disabled vs. enabled:** prefer keeping the button enabled and showing validation on click. A disabled button with no explanation frustrates users.

## RTL (Arabic) support

If the product supports Arabic, **mirror the layout**. The primary action moves to the left, back/next flip, and icons with direction (arrows, chevrons) mirror too. In CSS, use logical properties (`margin-inline-start`, `justify-content: flex-end`) instead of `left`/`right` so this works automatically. In React Native, use `start`/`end` style props instead of `left`/`right`.

## Quick checklist

- [ ] Is there exactly one clear primary action?
- [ ] Does the button sit next to the thing it acts on?
- [ ] Is it reachable by thumb on mobile?
- [ ] Is it far enough from destructive actions?
- [ ] Is it consistent across the app?
- [ ] Does the label say what will happen?
- [ ] Does it work in RTL and with keyboard/tab order?

## How to apply

Work out the context first (modal, form, mobile screen, dashboard), then walk the checklist for each screen and fix what fails. When a rule conflicts with the project's own documented design decisions, follow the project and point out the conflict.
