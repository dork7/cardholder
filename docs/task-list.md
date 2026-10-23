# CardHolder v1 — Task List

Status as of 2026-10-23. Plan: [`docs/superpowers/plans/2026-10-19-cardholder-v1.md`](superpowers/plans/2026-10-19-cardholder-v1.md) · Spec: [`docs/design.md`](design.md) · Branch: `cardholder-v1`

Each task is built by a fresh agent from its brief, then reviewed independently (spec + quality) before the next starts.

| # | Task | Status |
|---|---|---|
| 1 | Scaffold the Expo project, test runner and constants | ✅ Complete — review clean |
| 2 | Byte helpers and AES-256-GCM | ✅ Complete — review clean |
| 3 | SQL storage, settings and the blob-store interface | ✅ Complete — 1 fix round (migrations made atomic) |
| 4 | Device key, key-check and orphan detection | ✅ Complete — 1 fix round (unusable key replaced when no data exists) |
| 5 | Card types, validation, dates and listing | ✅ Complete — review clean |
| 6 | Encrypted card store | ✅ Complete — 2 fix rounds (failed import leaves existing images and committed blobs intact) |
| 7 | Free limit, unlock flag and backup nudge | ✅ Complete — review clean |
| 8 | Backup file format and passphrase rules | ✅ Complete — 1 fix round (NFC test locks composed/decomposed passphrases; case-colliding ids rejected) |
| 9 | Build and apply backup snapshots | ✅ Complete — review clean |
| 10 | Expiry reminders | ✅ Complete — 1 fix round (added Android channel) |
| 11 | App shell — native adapters, boot, recovery screen, theme & fonts | ✅ Complete — 1 fix round (stable refresh/reminders, scrollable retry UI, atomic blob writes) |
| 12 | Add and edit a card (photo library + freeform crop) | ✅ Complete — 1 fix round (successful saves cannot duplicate; failed deletes stay visible) |
| 13 | Counter view (zoom, flip, brightness, share) | ✅ Complete — now the card view, with icon buttons for delete, share and edit |
| 14 | Home screen (pinned cards, search, filters, rosette) | ✅ Complete — the swipeable wallet stack replaces pinned tiles and drag-to-reorder; search, type filter, backup banner, rosette empty state, free-limit check and settings link added |
| 15 | Settings, export, import and privacy screens | ✅ Complete — screen tests added for export, import and settings; closing the share sheet counts as an export |
| 16 | One-time Unlimited purchase | ⏸️ Skipped for now — no paywall; the card limit is switched off with `CARD_LIMIT_ENABLED` in `src/config.ts` |
| 17 | App-switcher privacy | ⏳ Pending |
| 18 | Share to CardHolder | ⏳ Pending |
| 19 | End-to-end test with Maestro | ⏳ Pending |
| 20 | Release preparation | ⏳ Pending |

## Steps left for you

This machine has no Xcode, Android SDK or Maestro, so these are recorded in each task's report instead of being run:

- **Tasks 11–18:** the "Try it" checks on a simulator or device.
- **Task 19:** installing and running Maestro (the flow file is still written).
- **Task 20:** `eas login` / `init` / `build` / `submit`, store listings and the beta. Only `eas.json`, the privacy policy and the no-network check are done here.

## Deferred minor findings

These go to the final whole-branch review: 47 so far, from Tasks 1–12.
