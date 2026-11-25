# Work log: graphite dark mode

- Dark palette in `src/ui/theme.ts` now uses the Graphite variant from `prototypes/dark-mode/?variant=graphite`: neutral grey `#121214` background, `#1C1C20` surface, `#E8E8ED` text, `#A7A7B2` muted, desaturated accent `#AAB3F2`, softer danger `#F2A0A8`, neutral glass, Showcase hero and Space tiles retinted.
- Colour only: no component, spacing, radius or type changes. The light palette is untouched.
- One judgement call: the prototype used no borders; the app's components draw them, so the border stays but drops to a faint neutral `rgba(255,255,255,0.08)` (was 0.18) to keep the tonal look.
- Prototype gained a fourth "Comfort" variant (not adopted).
- Updated `Button.test.tsx` expectations for the new background and accent.
