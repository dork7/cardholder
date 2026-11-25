# Android can back up automatically to the user's own Google Drive

A lost or replaced phone without a recent backup means lost documents (ADR-0002), and an
automatic backup to a folder on the same phone doesn't survive losing the phone. Android users can
now switch on **Google Drive backup**. After a one-tap Google account choice, the existing
automatic backup also uploads its passphrase-encrypted `.cardholder` file to a visible
"Doc Keeper Backups" folder in the user's own Drive, in the background, on the same daily or weekly
schedule. A new phone can restore from that folder during setup.

This amends ADR-0005: after the user switches Drive backup on, the app goes online on its own to
upload backups to the user's own Drive. Nothing else changes. There are still no accounts of ours,
no servers of ours and no analytics, and the developer never receives any data.

## Decision details

- **Access:** Google's Authorization API from Play services (`AuthorizationClient`, not the
  retired Google Sign-In library), asking only for `drive.file`: the files this app creates. The
  app can't read anything else in the user's Drive. A small Expo module in `modules/` wraps it,
  both interactively (account chooser and consent) and silently for the background task.
  Drive calls are plain REST requests from JavaScript. There is no Drive SDK.
- **What is uploaded:** the same `.cardholder` file the folder backup writes: snapshot encrypted
  with the backup passphrase (PBKDF2-SHA256, AES-GCM). The data key never leaves the phone
  (ADR-0002 holds). Google sees that the user uses Doc Keeper, file sizes and times, not contents.
- **Passphrase:** stored on the phone with device-only SecureStore protection, exactly as the
  folder auto-backup does today. Because the file now sits in a cloud account an attacker could
  reach, Drive backup requires a longer passphrase than manual export (12 characters minimum).
- **Folder and retention:** a visible "Doc Keeper Backups" folder, so users can see and download
  their backups. The app keeps its last 3 Drive backups and only ever deletes files it created.
  If the folder is deleted, the app creates it again.
- **Network:** Wi-Fi only by default, with a switch to allow mobile data. Uploads are resumable,
  because a full backup can be hundreds of MB and a background run has a time limit.
- **Failures never stay silent:** one failed run retries next time without a notification. After
  7 days without a successful Drive backup, a notification opens the backup screen. Revoked
  access shows "Reconnect Google Drive"; a full Drive says so.
- **Turning it off** asks whether to keep or delete the backups in Drive.
- **Fallback:** phones without Google Play services (Huawei, de-Googled ROMs) keep the local
  folder backup and manual export. iOS is unchanged.

## Considered Options

- **Our own server or object storage (S3, Firebase):** reliable, but storage and transfer cost
  grows with every user, we would run servers, and we would hold everyone's encrypted backups.
  Rejected.
- **Point the folder auto-backup at a Drive folder:** Drive doesn't offer its folders in Android's
  folder picker (`ACTION_OPEN_DOCUMENT_TREE`), so this can't be set up once.
- **Guide users to a third-party sync app** (FolderSync, Autosync): no Google code in the app,
  but users must set up a second app correctly, so many backups would never reach Drive. Kept only
  as help text for phones without Play services.
- **Drive's hidden app-data folder (`drive.appdata`):** same cost, but users can't see or
  download their backups, which undermines trust. Rejected in favour of a visible folder.

## Consequences

- The Google Cloud OAuth client is tied to the package name and signing-key SHA-1. Debug and
  release keys each need registering. Losing the release key (already fatal, ADR-0004) or moving
  to Play App Signing needs the new SHA-1 registered, or Drive backup stops for every user.
- The OAuth consent screen must be published **In production**. In Testing, only 100 listed
  users can authorise and their grants expire after 7 days, so backups would stop silently.
- A privacy policy page is required, and the privacy policy, store listings and Play data safety
  form must describe the Drive upload. `docs/design.md` lists it with the other network uses.
- Android decides when background work runs. "Daily" means roughly daily; some OEM battery
  savers delay it by days. Changes since the last backup are lost if the phone is lost.
- Each backup is a full copy, so it uses Drive space (about 3× the backup size) and data.
  Incremental upload is a possible later step.
- A forgotten passphrase still makes every backup useless. Drive doesn't change that.
- Family sharing through a shared Drive folder can build on this later; it is not part of it.
