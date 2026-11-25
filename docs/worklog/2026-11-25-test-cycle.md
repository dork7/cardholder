# Test cycle: changes since v1.25.0

2026-11-25, branch `codex/test-cycle`. Scope from `git log v1.25.0..main`. Read `AGENTS.md`, `GLOSSARY.md`, root ADRs, and the feature worklogs before testing. GitHub issue bodies were unavailable, so the acceptance behaviors below come from local worklogs, code, and tests. No product code was changed.

## Acceptance behaviors and coverage

| Feature | Acceptance behaviors from local worklogs | Code-level coverage |
| --- | --- | --- |
| Basic profile (#99) | One profile per Person; name, date of birth and blood group draw a front; create and edit through People and Add; counts toward document limit; sealed details and front. | Existing `profileScreens`, `profileStore`, `cardView`, `capture` tests cover create/edit, entry points, duplicate owner, seal and limit. Added maximum and empty field round trip and form length checks. |
| Medical/contact details (#79) | Optional lists and notes/mobile/email/address reopen unchanged, can be edited and removed, appear in preview, accessible summary, Details and search. | Existing `profileScreens` and `profileStore` tests cover editing, summary, store and search. Added empty and maximum length boundaries and oversized backup field rejection. A marked failing test exposes the 101st list entry defect. |
| Encrypted profile backups (#78) | Export carries profile payload and drawn image; replace restores; merge maps People by ID or name and skips a second profile; older/malformed profile data leaves ordinary document. | Existing `backupService` and `backupFile` tests cover export, replace, merge, older and malformed data. Added empty encrypted replace, malformed optional photo and duplicate profile parser tests. |
| Profile photo (#80) | Library and camera use square crop; circle preview/card; replace/remove; separate sealed blob deleted with document; backup export/merge/replace; malformed photo degrades to ordinary document. | Existing `profileScreens`, `capture`, `profileStore`, `backupService` tests cover picker paths, redraw independence, encrypted blob and backup modes. Added malformed photo and empty replace cleanup tests. |
| Profiles as documents (#83) | Person removal moves profile to Recently deleted and unassigns other documents; restore revives Person and profile; no expiry/reminder; share warning; batch pin/tag/share/delete. | Existing `profileStore`, `peopleScreen`, `cardView`, `homeScreen` tests cover these paths, including restore and batch actions. |
| Graphite dark mode | Dark colors match Graphite palette while light colors remain; text/actions stay legible. | Existing theme contrast, appearance, Button and Surface tests cover both themes. Added exact dark and light token regression checks. Device rendering remains open. |
| Wallet fan app icon | Six generated PNGs, near-black full-bleed icon, adaptive safe area/background, transparent monochrome mark, splash plate. | Added PNG dimension, RGBA/transparency and adaptive background checks. Visual appearance and launcher masks remain device checks. |
| #93 installed version | Settings shows native installed application version. | Existing settings screen regression test. |
| #94 purchase restore | Restore errors show restore-specific retry wording. | Existing paywall/store regression tests. |
| #96 backup sharing | Closing share sheet never claims successful delivery or records a completed backup. | Existing backup screen regression test. Actual destination delivery is device-only. |
| #59 long tag name | Full typed name remains visible; validation reports 24-character limit. | Existing edit screen regression test. |
| #60 ninth tag | Creating a ninth tag is rejected without losing typed name. | Existing edit screen regression test. |
| #46 pinned-only library | All documents count includes pinned documents and avoids empty-results copy. | Existing home screen regression test. |
| #48 Notes layout | Search has one visible label, accessible name, tighter editor spacing, Notes detail header. | Existing Notes screen test covers search label; spacing and native header need device inspection. |

## Bug found

- **Medium — adding a 101st medical list entry loses that list on reopen.** `app/profile/[id].tsx` `ListField` appends without a 100-entry guard; `src/profiles/profile.ts` `toProfile` rejects lists longer than 100. Repro: edit a profile with 100 Conditions, add one more, save, then reopen. The Conditions list disappears. Test: `src/profiles/__tests__/profileScreens.test.tsx`, `it.failing` with `// BUG:`. The same path applies to Allergies and Medications. No product fix made.

## Manual device checklist

- [ ] On iOS and Android, create/edit a profile, confirm date picker, age, blood group, long medical text, keyboard scrolling, accessible labels, and captured card image.
- [ ] Choose, crop, replace and remove a library photo; repeat with camera; confirm circle display and card capture, then delete and restore the profile.
- [ ] Export an encrypted backup with profile, photo and medical details; import on another device with Replace and Merge; check Person mapping, duplicates and photo. Verify a wrong passphrase and an older backup.
- [ ] Lock the app while a profile is open and after backgrounding; verify profile/front/preview stay hidden until successful device authentication. The existing `AppLockGate` tests cover gate state, not OS screenshot surfaces.
- [ ] Check profile sharing warnings and batch actions through native share sheets; confirm closing backup share sheet does not claim delivery.
- [ ] Inspect Graphite and light on a real display: contrast, glass, Showcase tiles, buttons, status/navigation bars and dark/light switching.
- [ ] Inspect icon on iOS home screen and Android launchers with round/squircle masks and Material You themed icon; check splash and small sizes.
- [ ] Check installed version, purchase restore error wording, tag validation, pinned-only library count, Notes search spacing and native Notes header on device.

No adb or emulator was available for this cycle.

## Validation

- `npm run typecheck`: passed.
- `npx jest --runInBand`: 99 suites passed, 922 tests passed, 0 snapshots. This includes the marked expected failure above.
- `git diff --check`: passed.
- Added 10 tests in test files only. No commit or push. The existing `node_modules` symlink was left untouched.
