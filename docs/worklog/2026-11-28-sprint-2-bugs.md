# Sprint 2 bugs

2026-11-28, branch `fix/sprint-2-bugs` (Claude). Profile features #81 #82 #84 ran in parallel with Codex; see `comms/2026-11-28-sprint-2-remaining/`.

Closed as already done on main: #80, #83, #46, #48.

| Issue | Change | Proof |
|---|---|---|
| #90 Linking a note from a document | Not reproducible at code level: a note added from a document is preselected and saved linked. Added a regression test. Needs a device re-check of both flows (D-06). | `notesScreens.test.tsx` |
| #92 OCR suggestions | Each suggestion remembers the picture it was read from. Replacing or removing that picture blanks the fields it filled (unless the user changed them), so PDF → photo and photo → photo start afresh. Case 1 (a late tag replacing the user's tag) does not reproduce in tests; a regression test now covers it. | `editForm.ts`, `editScreen.test.tsx` |
| #91 Keyboard on Android | New `KeyboardAvoid` wrapper (padding on iOS, height on Android, measured window offset) on edit, import, export, auto-backup, verify-backup. `Sheet` with `avoidKeyboard` moves up by the keyboard height on Android. Person names: `autoCorrect={false}`, `autoCapitalize="words"`. The profile form still uses the old wrapper until the profiles branch merges. | `Sheet.test.tsx` |
| #44 Status bar in Full screen | Android: Full screen fills the headerless card screen instead of a separate Modal window, so `StatusBar hidden` applies. iOS keeps the Modal. Navigation bar is not hidden (needs `expo-navigation-bar`). | `cardView.test.tsx` |
| #95 Landscape | Page wash Svg is drawn at the measured page size. Full screen in landscape puts the owner label and buttons in a column beside the card; the label is padded. | `Surface.test.tsx`, `cardView.test.tsx` |
| #47 + ignores first tap | Screen entrance on Android only fades (no rise), so the button takes touches where it is drawn. Needs a device check. | — |
| #45 Checklists | A ticked box draws a check mark. The note editor shows a checklist once: as rows while not typing, as text while typing (tap to edit). | `notesScreens.test.tsx` |
| #98 Polish (part) | Empty hint names the + button; import summary plurals; reminder label without seconds; automatic backups named `DocKeeper-auto-YYYY-MM-DD-HHMM`; undo 8 s; Import with nothing to pop goes home; Import rejects a non-backup before the passphrase; `edit/new` at the free limit goes to the paywall up front. | several |
| #57 Smart crop | In a photo shaped like an ID or passport page, a find under 30 % of the photo is treated as a part (portrait) and the crop starts from the whole photo. | `smartCrop.test.ts` |

## Left open in #98

- Layout: FAB over the third Space card and two + buttons on Home; rotated PDF thumbnails in pinned/favorite cards; Document/Details switch under the sticky footer; Set reminder below the fold.
- Sort chip with Expiring soon on; release build asking for ACCESS_LOCAL_NETWORK.
- Pinned section ignoring the tag filter is deliberate (code comment in `app/documents.tsx`); needs a product decision.

## Device checks needed

No emulator on this machine. Re-check on Android: D-06 (#90), A-19/A-20 (#92), A-10/H-14/B-09 (#91), Full screen status bar (#44), D-14 landscape (#95), first tap on + after switching tabs (#47), A-03 crop on `dataSet/id-front.jpg` and `passport.jpg` (#57).
