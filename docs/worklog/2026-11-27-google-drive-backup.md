# Google Drive backup — 2026-11-27

Implements the code for epic #125 (ADR-0010): #128, #129, #130, #131, #132 and #133. Device verification waits on the Google Cloud setup (#126) and the device test pass (#134).

| Issue | Change |
| --- | --- |
| #128 | New Expo module `modules/google-drive-auth` (Kotlin, Android only). Wraps Play services' `AuthorizationClient` with the `drive.file` scope: `authorize(interactive)` resolves `ok` with a token, `needs-consent`, or `cancelled`; also `isAvailable()` (Play services), `isOnUnmeteredNetwork()` and `clearToken()`. Adds `ACCESS_NETWORK_STATE`. JS binding in `src/backup/drive/googleAuth.ts`. |
| #129 | `src/backup/drive/driveApi.ts`: Drive REST v3 client with no SDK. Covers the folder find/create, a resumable upload in 8 MiB chunks that resumes from Drive's acknowledged byte after a dropped connection (up to 3 times), and one retry with a fresh token after a 401. Errors map to `auth`, `quota`, `not-found`, `network` and `other`. `src/backup/drive/driveBackup.ts` adds `enable`, which needs a 12+ character passphrase, shows the account chooser, finds or creates "Doc Keeper Backups" and saves the first backup before reporting success. New screen `app/drive-backup.tsx` and a Settings entry when Play services are present. |
| #130 | Scheduled runs share the folder backup's background task. `reschedule()` registers it at the shorter interval of the two and removes it only when both are off. Wi-Fi only unless mobile data is allowed. Keeps the latest 3 uploads and deletes only files this setup recorded. |
| #131 | A failed run records `problem` (`reconnect`, `full` or `failed`) shown in Settings and on the Drive screen. After 7 days without success, including waiting for Wi-Fi, one notification per streak opens `/drive-backup` (`useLaunchLinks`). Lost access shows **Reconnect Google Drive**. A deleted folder is created again. |
| #132 | Import → **Restore from Google Drive**: account chooser → list of `.cardholder` files in the folder, newest first → download through the file system → existing passphrase and merge/replace steps. |
| #133 | **Stop backing up to Drive** asks to keep or delete the Drive copies. Delete removes only recorded files, then the folder if it is empty. The token is revoked, and the setup and passphrase are cleared. |

## Verification

- `npx tsc --noEmit` is clean. `npx jest`: all suites pass, with new tests in `src/backup/drive/__tests__/` (logic against an in-memory Drive, `test/fakeDrive.ts`; the REST client against a fake server), `src/backup/__tests__/driveScreens.test.tsx` and the shared-task case in `androidAutoBackup.test.ts`.
- `./gradlew :google-drive-auth:compileDebugKotlin` succeeds.
- Not verified yet, because it needs #126: a real authorisation, upload and restore on a device. Also unconfirmed: that `drive.file` still sees earlier backups after a reinstall (#132 asks to record this).
