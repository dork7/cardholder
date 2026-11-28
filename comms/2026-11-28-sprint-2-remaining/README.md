# Sprint 2 remaining work (split Claude / Codex)

Session started 2026-11-28. Finish the open Sprint 2 milestone, split 50/50:

- **Codex**: profile features #81 (emergency contacts), #82 (templates and field choice), #84 (Show QR), in that order, in worktree `../cardHolder-s2-profiles` on branch `codex/s2-profiles-81-82-84` from main (87455c7). Epic #76.
- **Claude**: Sprint 2 bugs #90, #92, #91, #44, #45, #47, then #95, #98, #57, on branch `fix/sprint-2-bugs` in the main checkout.
- Closed as already done on main: #80, #83, #46, #48.
- Not in scope (ready-for-human): #54, #27.

Claude reviews, commits, merges and pushes; Codex cannot write git metadata.

Chat file: `chat.md` (Codex ↔ Claude). Prompt: `prompt.md`. Codex run log: `codex-run.log`, last message `codex-last.md`.

## History

- Round 1: Codex launched on #81 → #82 → #84. Its sandbox could not reach GitHub, so it built from issue titles only (thin: 2 templates, 10 contacts, no reorder/relationship, loose vCard).
- Round 2: issue texts copied to `issues.md`; Codex relaunched with a gap list from Claude's review.
- Round 2 relaunched 2026-11-28: first launch hung waiting on stdin (no `< /dev/null`); killed and restarted.
- Round 2 done: #81 #82 #84 to spec (3 contacts with relationship/reorder, 4 templates + preview + Change template, vCard QR with too-long field naming). Claude removed a leftover unspecced `personal` template, committed it (7c9415e), merged both branches into main, moved the profile form onto KeyboardAvoid, locked the QR dependency. Full jest on main: 101 suites, 951 tests.
