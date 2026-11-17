# Home is a document library; the card stack is an alternative view

Status: accepted, 2026-11-17. Resolves the open question in issue #26.

The fluid glass prototype's home is a scrolling library (pinned panels, then rows), while
`docs/design.md` had made the wallet-style card stack the home screen's signature motion.

**Decision:** the library list is the **default** home view. The card stack stays as an alternative
view, next to the existing gallery grid, chosen with a List / Stack / Gallery control and remembered
in the `homeView` setting. People who already chose Stack or Gallery keep their choice; only people
with no saved choice see the list first.

**Why:** the list scans faster once a person has more than a few documents, shows expiry at a glance,
and matches the prototype. Keeping the stack costs little (it is unchanged) and preserves the motion
that sets the app apart.

**Consequences:** selection mode and sort stay gallery-only. Pinned documents show in the list as
panels and, in Stack and Gallery, as the existing pinned strip. Screen titles are 31 pt.
