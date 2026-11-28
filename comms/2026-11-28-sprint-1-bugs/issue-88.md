# #88 Android: sharing images into Doc Keeper crashes or fails

Found in the 2026-11-22 emulator e2e run (cases X-02, X-03; P-05 blocked by this). Commit 70a8bf0 + working tree, Pixel_9_Pro API debug build.

## Steps
1. In the Files app, open Images → DocKeeperTest, select `plain-03.jpg` (or `id-front.jpg` + `id-back.jpg`).
2. Share → Doc Keeper.

## Expected
The crop UI, then New document with the shared photo(s) as front/back.

## Actual
- Files-app share: alert **"Couldn't open what was shared. Try sharing it again."** plus uncaught promise rejections from `ExpoShareIntentModule.getShareIntent`. Log:
  `Receiving a share failed: cannot retreive absoluteFilePath for content://com.android.providers.media.documents/document/image%3A38: java.io.FileNotFoundException: Multiple items at content://media/external/images/media`, then `Opening the shared file failed: Call to function 'FileSystemFile.copy' has been rejected`.
- `adb shell am start -a android.intent.action.SEND -t image/jpeg --eu android.intent.extra.STREAM content://media/external/images/media/38 com.hamza.cardholder` (with or without `--grant-read-uri-permission`): **the app crashes**. `CursorIndexOutOfBoundsException: Index 0 requested, with a size of 0` at `expo.modules.shareintent.ExpoShareIntentModule$Companion.getFileInfo(ExpoShareIntentModule.kt:71)`. The next launch shows "Doc Keeper closed unexpectedly".

Sharing a PDF and sharing text both work (X-04, X-06, X-07).

## Likely source
- `expo-share-intent@9.0.0` `getFileInfo` calls `query(...)!!` + `moveToFirst()` without checking the result, so any provider that returns no rows crashes the process.
- Its absolute-path lookup fails for `media.documents` image URIs; `src/share/ShareInReceiver.tsx:38,73` then tries `FileSystemFile.copy` on the bad path.

## Done when
- Sharing 1 or 2 images from Files and from Photos opens New document with front (and back) filled.
- A share whose URI can't be read shows the alert instead of crashing.
- The `getShareIntent` rejections are caught.
