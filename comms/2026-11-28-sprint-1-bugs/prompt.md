You are working on Doc Keeper (Expo / React Native, Android first) in the worktree `../cardHolder-s1-share`, branch `codex/s1-share-88`. Read `AGENTS.md` and `comms/2026-11-28-sprint-1-bugs/README.md` first.

Task: fix GitHub issue #88, full text in `comms/2026-11-28-sprint-1-bugs/issue-88.md`. Sharing images into Doc Keeper from the Files app fails, and a share whose URI has no rows crashes the app.

What to change:

1. **Native crash** in `node_modules/expo-share-intent/android/src/main/java/expo/modules/shareintent/ExpoShareIntentModule.kt` (`node_modules` is a symlink to the main checkout; edit it there directly). `getFileInfo` does `resolver.query(...)!!` + `moveToFirst()` without checks, and `resolver.getType(uri)!!`. Make it null- and empty-safe: when the cursor is null or empty, or a column is missing, fall back (file name from the URI's last path segment, size null, mime from `getType` or the intent's type or `application/octet-stream`). Also make `getAbsolutePath` failures non-fatal: if no absolute path can be resolved, return the `content://` URI as `filePath` instead of throwing (the "cannot retreive absoluteFilePath … Multiple items" error for `com.android.providers.media.documents` URIs). Look for any other `!!` or unchecked cursor in the module's share-handling path and harden it the same way. Do not change behaviour for URIs that work today. Claude will generate the `patches/expo-share-intent+9.0.0.patch` file from your edit; you do not need to run patch-package.
2. **JS side**: `src/share/sharedFiles.ts` `copyShared` must accept a `content://` path as well as a file path (copy it into app storage via `expo-file-system`'s File API, which can read content URIs on Android). `src/share/ShareInReceiver.tsx`: make sure every rejection from the share library and from copying is caught and ends in the existing `strings.shareIn.failed` alert, never an unhandled rejection or crash.
3. **Tests**: extend `src/share/__tests__/ShareInReceiver.test.tsx` (and add a `sharedFiles` test if useful) for: a shared image whose path is a `content://` URI opens New document; a copy that fails shows the alert; one and two images still fill front and back.

Run `npx jest src/share` and `npx tsc --noEmit` before finishing. Do not touch files outside #88's scope. Don't edit git metadata.

Keep `comms/2026-11-28-sprint-1-bugs/chat.md` updated: append dated entries headed `## Codex` with what you changed, decisions, and anything Claude must check (the native change can only be verified on a device). Finish with a summary of the files changed.
