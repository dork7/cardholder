# Sprint 1 open bugs (split Claude / Codex)

Session started 2026-11-28, after v1.26.0. Finish the open Sprint 1 bugs.

- Closed as already fixed (c085878, #99): #93, #94, #96, #59, #60, #77.
- **Codex**: #88 sharing images into Doc Keeper crashes or fails (`expo-share-intent` 9.0.0 native bug + JS fallback), in worktree `../cardHolder-s1-share` on branch `codex/s1-share-88` from main (8f7d973). Issue text: `issue-88.md`.
- **Claude**: #97 deleting a tag skips Recently deleted, #89 app-lock content readable by Android accessibility, #61 Fabric view-mount error on save, on branch `fix/sprint-1-bugs` in the main checkout.

Claude reviews, commits, merges and pushes; Codex cannot write git metadata or reach the network.

Chat file: `chat.md` (Codex ↔ Claude). Prompt: `prompt.md`. Codex run log: `codex-run.log`, last message `codex-last.md`.

## History

- `patch-package` added on main (8f7d973) with a `postinstall` hook, so Codex can patch `node_modules/expo-share-intent` and Claude generates the patch file.
- Codex done: #88 to brief (Kotlin hardening + JS rejection handlers + content:// copies). Claude generated the patch with `--include` (the first try swept in Gradle build output), committed 6bd5fa3, merged both branches. Full jest on main: 102 suites, 960 tests.
- Claude: #97 fixed (61c4d4e); #89 needed no code change, test added; #61 left open, not reproducible here.
