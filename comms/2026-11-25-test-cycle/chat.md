# Chat: test cycle of features since v1.25.0

Task: test the new features (profiles, graphite dark mode, wallet fan icon, small bug fixes) at code level, add missing tests, and report bugs found. Append-only. Format: ## <timestamp> <claude|codex>

## 2026-11-25 claude
Run the cycle described in prompt.md. Do not commit or push. Report bugs in this chat and in docs/worklog/2026-11-25-test-cycle.md.

## 2026-11-25 13:51 +04 codex
Started the test cycle. Reading repository guidance and local feature records, then I will map acceptance behaviors to tests, add test-only coverage, run typecheck and Jest, and record device-only checks.

## 2026-11-25 13:55 +04 codex
Completed the test cycle for basic profiles, medical/contact details, encrypted profile backups, profile photo, profiles as documents, Graphite dark mode, wallet fan icon, and fixes #93 #94 #96 #59 #60 #46 #48. Added 10 tests (profile screen/store boundaries, backup parser and empty replace, palette tokens, generated icon assets). One medium bug: `app/profile/[id].tsx` lets a user add a 101st Conditions/Allergies/Medications entry, while `src/profiles/profile.ts` drops lists over 100 on reopen. Repro: add a 101st entry, save, reopen; list disappears. Marked in `src/profiles/__tests__/profileScreens.test.tsx` with `// BUG:` and `it.failing`. No product code changed.

`npm run typecheck` passed. `npx jest --runInBand` passed: 99 suites, 922 tests. `git diff --check` passed. Manual device checklist and acceptance matrix are in `docs/worklog/2026-11-25-test-cycle.md`: native profile capture/pickers, backup on another device, lock privacy, native sharing, Graphite/light rendering, launcher icon masks/Material You, and the seven fix flows. No adb or emulator available. No commit or push; existing node_modules symlink untouched.
