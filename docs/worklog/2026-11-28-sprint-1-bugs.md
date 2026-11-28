# Sprint 1 open bugs

2026-11-28, after v1.26.0. Claude on `fix/sprint-1-bugs`, Codex on `codex/s1-share-88`; see `comms/2026-11-28-sprint-1-bugs/`.

Closed as already fixed on main: #93, #94, #96, #59, #60 (c085878), #77 (#99).

| Issue | Change | Proof |
|---|---|---|
| #97 Deleting a tag skips Recently deleted | `CardStore.removeTagFromRecentlyDeleted(tag)` reseals deleted documents without the tag; `removeTagEverywhere` calls it, so a restore doesn't bring the tag back. Notes have no Recently deleted. | `cardStore.test.ts`, `batch.test.ts` |
| #89 Lock content readable by Android accessibility | No code change needed: the content wrapper already has `importantForAccessibility="no-hide-descendants"` while locked, and Fabric never flattens a view with that prop (`ViewShadowNode.cpp`). The e2e evidence was a plain `uiautomator dump`, which includes not-important views; TalkBack does not. A test now pins the Android prop (the old tests passed through the iOS-only modal flag). Needs a TalkBack or `uiautomator dump --compressed` check. | `AppLockGate.test.tsx` |
| #88 Sharing images crashes or fails (Codex) | `patch-package` patch for `expo-share-intent` 9.0.0: null/empty-cursor-safe `getFileInfo`, `content://` fallback when no absolute path resolves, JS promise rejections caught. `copyShared` copies `content://` URIs directly; share-library errors show the failed alert. Needs a device check: one and two images from Files and Photos, and an unreadable URI. | `ShareInReceiver.test.tsx`, `sharedFiles.test.ts` |
| #61 Fabric view-mount error on save | Not changed. Seen once; the document saved. Can't reproduce without a device and a blind change to the save/dismiss path risks more than it fixes. Left open for a repro. | — |

`patch-package` added (`postinstall`); patches live in `patches/`. Generate them with `--include` for the source files only, or Gradle build output under `node_modules/*/android/build` gets swept in.
