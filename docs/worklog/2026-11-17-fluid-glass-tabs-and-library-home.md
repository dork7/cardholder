# Work log: fluid glass tab bar, library home, component details (#25, #26, #27)

- #27: `RADIUS.control` 17 and inset highlight on buttons, title 31, `SHADOW.soft` panels with 1 px edge,
  `ActionFooter` on the editor, shared 0.4 s `ENTRANCE` in `Screen` (skipped under Reduce Motion).
- #25: `TabBar` (Documents/Notes/Folders/Settings) on root screens, round `Fab`, `HomeActionBar` removed,
  gallery toggle became the List/Stack/Gallery control. Test setup mocks safe-area globally.
- #26: List is the default home view (ADR 0008); pinned panels and rows in `src/ui/DocumentList.tsx`;
  tag/folder chips moved under search.
- #24: `card/[id]` and `edit/[id]` are routed `formSheet`s (detents set in `app/_layout.tsx`); Delete uses
  `ConfirmSheet`/`BottomSheet` instead of `Alert`. `Screen` now forwards gap/direction/alignment to its
  entrance wrapper. Not verified on a device: sheet detents, keyboard and large-text behaviour, Android.
