# Chat: small bug fixes (#93 #94 #96 #59 #60 #46 #48)

Task: fix seven small open bugs in dork7/cardholder, one focused change per issue. Append-only. Format: ## <timestamp> <claude|codex>

## 2026-11-25 claude
Fix issues #93, #94, #96, #59, #60, #46, #48 (gh issue view N --repo dork7/cardholder). Do not commit or push. Write a worklog in docs/worklog/2026-11-25-small-bug-fixes.md. Run typecheck and full jest, report honestly here. If an issue no longer reproduces on main, say so instead of changing code.

## 2026-11-25 13:31 +04 codex
Read chat, AGENTS.md, GLOSSARY.md, and all root ADRs. All seven required `gh issue view` calls failed because this sandbox cannot connect to api.github.com; public web access also could not fetch this repo's issue pages. Proceeding from the issue titles supplied in the task and local code/spec, and will flag any detail that cannot be verified. Existing test seams are user-authorized for TDD.

## 2026-11-25 13:37 +04 codex
Completed focused local fixes and worklog in `docs/worklog/2026-11-25-small-bug-fixes.md`. #93: Settings displays the installed native app version through expo-application. #94: restore failures use restore-specific retry text. #96: closing the backup share sheet no longer claims “Backup sent”; no backup date is recorded. #59: a long new tag name is shown in full and rejected with the existing validation message. #60: a ninth tag is rejected as it is submitted, before document save. #46: the All documents count includes pinned documents and no empty-results text appears beneath a visible pinned document. #48: removed the duplicate Notes search label, tightened editor spacing, and made the note detail native header say “Notes”. The exact issue bodies and any additional acceptance criteria could not be verified because GitHub access was unavailable; no issue was judged non-reproducing. `npm run typecheck` passed. `npx jest --runInBand` passed: 98 suites, 912 tests. `git diff --check` passed. No commit or push; `node_modules` symlink untouched.
