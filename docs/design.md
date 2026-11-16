# Doc Keeper — v1 Design

Status: agreed 2026-10-19 (design grilling session). This is the source of truth for v1 scope; the implementation plan in `docs/superpowers/plans/` argues from it.

## What it is

A public iOS + Android app (Expo) that stores **image-based** cards — ID, insurance, membership, loyalty — and gets one on screen fast at a counter.

- No barcodes. Cards are photos (front, optional back).
- No accounts. **The app never touches the internet on its own**; the only network traffic is the app stores' own purchase flow and, on Android, an update check and download the user starts in Settings (see App updates below). A crash report is mail or a share the user sends from Settings (see Problems below).
- Target gap: physical cards with no barcode (ID, insurance, membership) that Apple/Google Wallet don't cover.

## Cards

| Field | Rules |
|---|---|
| Name | required, trimmed, 1–60 chars |
| Front image | required |
| Back image | optional |
| Tags | The groups a card is in: optional, up to 8 per card, each up to 24 characters; repeats ignoring case are dropped. There are no separate categories — a card saved (or backed up) with one has it as its first tag; the old "Other" becomes no tag. ID, Insurance and Membership are offered to start with; any other is typed. On the edit screen the tags in use and the starters are chips, any number can be on, and **+ New** types another (a name matching an existing tag, ignoring case, picks it); reading the photo suggests one (the document's type, e.g. Residency, else ID / Insurance / Membership). On the card's screen they are pills under the name: **+ Tag** there, or **Add tags** on a gallery selection, opens a sheet to pick any number and type new ones, then adds them all at once (if any card would go over 8, nothing changes and the sheet says so). Holding a tag pill for 2 seconds fills it red and then asks before removing that tag from that card. **Settings → Tags** lists every tag in use with its card count; deleting one takes it off those cards, after asking. A card with no name goes by its first tag ("Document" without one). A card tagged ID asks before it is shared. Tags are not searched. |
| Card number | optional, typed (e.g. to read out over the phone) |
| Expiry date | optional, a calendar date |

- Images come from the photo library or the **phone's own camera app**. There is no in-app camera or viewfinder, so the app never asks for camera permission (`android.permission.CAMERA` stays blocked). Ways in:
  - **Pick from the library** on the add/edit screen.
  - **Take photo** (Android) on the add/edit screen, for the Front and the Back: it opens the phone's camera app through the system image-capture intent (`modules/photo-capture`), which needs no permission while the app declares none. The photo is written to the app's cache through a file provider, goes through the same crop and reading as a library or shared photo, and the plaintext file is deleted as soon as it is used. Cancelling the camera or the crop leaves the form as it was. Not on iPhone (the camera there needs a permission prompt), so the button is hidden; it is also hidden when no camera app is installed.
  - **Use a PDF** on the add/edit screen, for documents issued as PDFs (digital insurance cards, e-IDs, policies). The whole PDF is kept, encrypted like the photos; nothing is cropped or extracted from it. One page, the **thumbnail page** (page 1 unless the user picks another from a row of page previews), is rendered on the device (PDFKit on iOS, `PdfRenderer` on Android, in `modules/card-pdf`) and stands in as the card's front picture on the home screen and for reading the card. The PDF's second page, when it has one, becomes the card's back (the side the home stack flips to); a cross over it on the edit screen removes it, and "Use page 2 as the back" puts it back. The card view shows every page, swiped sideways and pinch-zoomable; Share sends the PDF itself; backups carry it. Sending to another phone over QR codes carries only the thumbnail page, as a photo card. A photo chosen for the front turns the card back into a photo card. Password-protected PDFs and PDFs over 10 MB are refused with a short message.
  - **Share to Doc Keeper** from Photos, Files or any app via the system share sheet (Android; not yet on iPhone, where it needs a share extension). One shared image opens the add-card screen with it as the front; two images become front and back, in the order shared; one shared PDF becomes a PDF document; anything else (three or more images, several PDFs, other files) is refused with a short message. With app lock on, the share waits until the phone's lock says yes. The shared copies are plaintext in the cache folder and are deleted as soon as they are used (`src/share/`). If the user is at the free limit, the upgrade screen shows instead (the shared images are discarded).
- Every image goes through a **freeform crop** before it is saved.
- Every field and image is editable after saving.
- Leaving the add/edit screen with unsaved changes (Close, back, or swiping it down) asks **Discard changes?** first; saving or deleting leaves without asking. A Save blocked by an error scrolls the form to the first one.
- Delete moves the card to **Recently deleted** and frees a slot toward the free limit. This holds for every way to delete: the card's screen, its edit screen and a gallery selection. From the card's screen and its edit screen there is no dialog: the card goes at once, the app returns home, and an **Undo** bar above the action bar says "Deleted <name> · Undo" for 5 seconds; Undo restores the card exactly as it was. One removal is offered at a time (a second replaces the first), and leaving the app ends the offer; the card is still in Recently deleted either way (`src/app/undo.ts`, `src/ui/UndoBar.tsx`). The bar's message is a live region and Undo is a labelled button. A deleted card stays encrypted, photos and PDF included, and is left out of home, search, the pinned strip, the widget, reminders, quick actions, the duplicate check, the free-limit count and backups. **Settings → Recently deleted (N)** lists them, most recently deleted first, each with its thumbnail, name and days left, and **Restore** puts one back exactly as it was (photos or PDF, Document text, tags, pin, folder, expiry and reminder); at the free limit Restore opens the upgrade screen instead and the card stays where it is. A card is erased, files and all, once 30 days have passed since it was deleted: checked when the app starts and when it comes back to the foreground, never in the background. Restoring a backup leaves Recently deleted alone, except that **Replace** empties it. The deletion time is a plaintext column beside the pin and the dates (ADR 0003).
- Expiry reminders: **a local notification every day at 09:00**, from a per-card number of days before the expiry date (**14 by default**, 1–365, set under the expiry date on the edit screen) through the expiry day itself. They stop once the card expires, or move when its date is changed (renewed). Notification permission is requested **only the first time the user saves a card with an expiry date**, never at launch.

## Notes

Standalone notes live in **Notes**, reached from the home screen. Each has an optional title and a
plain-text body; either can stand alone. Text saves automatically on the device, encrypted with the
existing vault. Leaving the editor flushes pending changes; a failed save keeps the editor open with
its text and a retry action. Blank notes are discarded on exit, allowing content to be replaced while
editing without losing the note's identity.

Pinned notes appear first; each group is ordered by its most recent content edit. Pinning does not
change that timestamp. Search matches titles and bodies ignoring case. Permanent deletion asks for
confirmation. Notes use the existing app lock and have no product count limit or effect on document
slots. They have no attachments, formatting, sharing, tags, folders or reminders.

The passphrase-encrypted backup includes notes and their pin status and timestamps. Merge skips
existing note IDs; replace replaces all notes, including clearing them when restoring an older backup
without notes. The replace confirmation explains this. Historical per-document notes are not restored.
The complete feature specification and delivery tickets are in GitHub issue #2.

## Speed at the counter (≤ 2 taps from an unlocked home screen)

**Home screen** (the app opens straight to it):

1. **Pinned cards** at the top as large thumbnails, manually ordered via drag to reorder. New cards are pinned by default (appended to the end).
2. Search field and tag filter (All, then every tag some card has; a card shows under each of its tags). Search matches the name and the text read off the card's photos (kept sealed with the card, carried in backups; numbers match whatever spaces or dashes are typed). Cards saved before the text was kept are read once, in the background, after the app opens; so is any card saved before one of its photos had been read, so no side is left unsearchable and no old photo's text outlives it.
3. All other cards, alphabetical.

A floating bottom bar groups **Add image**, **Notes**, and **Gallery**, above the home indicator with space reserved so it does not cover content. Add image opens the existing document creation flow, Notes opens the standalone notes section, and Gallery swaps the card stack for a two-column grid of every card (picture, name and tags); the choice is remembered. Chips above the grid sort it by name, expiry (soonest first, no date last) or newest, the sort is remembered, and **Expiring soon** narrows it to cards that are expired or due within the reminder window. In the grid, a long-press starts selecting, taps then add or remove cards, and a bar at the bottom shows the count with Cancel, **Pin** (Unpin when every selected card is pinned), **Add tags**, **Quick share** and **Delete**. Quick share sends the selected cards as one PDF in the order shown (each photo card's sides, every page of a PDF card), asking first when an ID is among them. Delete asks once for all of them. Only cards still shown by the search and filters are acted on.

Tap a card → **counter view**:

- Full-screen.
- Brightness to maximum; restored on exit and when the app is backgrounded. A **Full brightness** switch in Settings (on by default) turns this off.
- Screen kept awake.
- Front and back shown together, one above the other, when a back exists.
- Pinch to zoom.
- Landscape when the image is wider than tall, so the card fills the screen.

## Security & privacy

- **No app lock.** The phone's own lock is the protection.
- Card images and all card fields are **AES-256-GCM encrypted at rest**. The key is random, **device-only**, and stored in the Keychain/Keystore via `expo-secure-store`.
- Card data is **excluded from iCloud/Google device backups** (see Implementation notes for how this is achieved per platform).
- The app is **blurred in the app switcher**. Screenshots are allowed.
- **Quick share** on the card view sends the whole card through the system share sheet — AirDrop on iPhone, Quick Share on Android (Bluetooth and Wi-Fi, no internet), or any other app — as one file: a PDF card as its PDF, a card with a back as a two-page PDF made on the phone, a front-only card as its photo. For cards in the ID category, a one-line confirmation first: "This shares an unencrypted copy of the card." Sending a card over QR codes was removed, along with the camera permission (`android.permission.CAMERA` is blocked).
- **Recreate .md.** In a document's Details, **Recreate .md** reads the text on its pictures again and rebuilds its Details; in the gallery, the same on every selected document, counting through them.
- **Details (.md)** on the card view (portrait, not while shown to staff) swaps the photos for the card as a Markdown document: its details (expiry and reminders, tags, folder, source, added and updated dates, and the card id as its reference), then the text read off each side in code blocks. The text is selectable, and **Save .md file** shares it through the share sheet as `<card name>.md`, with the same ID confirmation as Quick share; the copy is deleted when the sheet closes.
- **Home screen widget (Android).** "Pinned cards" lists up to four pinned cards by name, with their first tag or, once close, the expiry date written out (the widget only changes when the app next runs, so no countdowns). Tapping a row opens that card through the app's own link, so app lock still asks first; **+** opens New card. It never shows a card's picture, and while app lock is on it shows only "Locked. Tap to open." What it keeps to draw from (names and notes) is sealed with its own Android Keystore key, never written in plaintext. The app updates it whenever the pinned cards or app lock change (`modules/home-widget`, `src/widget/homeWidget.ts`).
- **App updates (Android).** Copies installed from GitHub Releases can update themselves: **Settings → App updates → Check for updates** fetches the latest release's `version.json` and, if its version is newer, shows the version and release notes. **Download update** fetches the APK into the cache with progress (it can be stopped), checks it against the SHA-256 in `version.json` (releases without one are never offered), and **Install update** hands it to Android's installer through `modules/app-update`. The first time, Android asks the user to allow installs from Doc Keeper (`REQUEST_INSTALL_PACKAGES`). Nothing is checked or downloaded unless the user taps; the APK must come from this repository's releases and be signed with the same key, so cards survive the update. Not offered on iOS.
- **Problems (crash reports).** No crash-reporting or analytics SDKs; store privacy label: **Data Not Collected**. The app keeps its own log and a record of its last unexpected close on the phone (`src/diagnostics/`, `modules/crash-log`, ADR 0007): fatal JavaScript errors, native exceptions, Android's exit reasons (crash, native crash, not responding) and, on iOS, a launch that follows a run which never went to the background. A render error shows a **Something went wrong** screen with **Try again** instead of a blank crash. On the next launch, once unlocked, one prompt offers to send a report; **Not now** leaves it in **Settings → Problems**, which shows what happened and offers **Email report to the developer** (when the build has an address), **Share report** (a text file through the share sheet) and **Dismiss**. The report holds the error, phone model and OS, app version and recent log lines; never a card. Nothing is sent without one of those taps. The stores' own opt-in crash reports still cover what the app can't see.

## Backup

The **passphrase-encrypted export file** (`.cardholder`) is the **only** backup.

- Export: user picks a passphrase (minimum 3 characters, numbers allowed, typed twice). The app states plainly that **a forgotten passphrase cannot be recovered**. File is shared via the system share sheet (Files, AirDrop, Drive, email…).
- Import: pick the file, enter the passphrase, then choose:
  - **Merge** — cards already on the device (same internal ID) are skipped, the rest are added.
  - **Replace** — wipes the device's cards first, behind a confirmation.
- Imported cards are never locked by the free limit.
- No backup reminder on the home screen. Settings shows "Last backup: <relative time>".

## Monetization

- Freemium: **10 documents free**. One document is front + optional back + details, or one PDF.
- **Unlimited**: one-time non-consumable purchase, about **$2.99 / AED 10.99**, via `expo-iap`. The unlock is cached on device and works offline from then on. **Restore Purchases** button (Apple requires it).
- **Existing cards are never locked.** Over the limit (import from a paid install, refund), all cards stay viewable and editable; only *adding* a new card is blocked until purchase.
- The purchase screen connects only after **See purchase price** or **Restore purchases**. It shows the store's localized price before **Unlock for …** opens the native payment sheet. Setup and sandbox checks: `docs/payments.md`.

## Platform & UX baseline

- Expo, built as an **EAS dev build** (not Expo Go) because it uses native modules.
- **Phones only** (no tablet layout). **iOS 16+**, **Android 10+ (API 29)**.
- **English only**, with all user-facing strings in one file (`src/strings.ts`).
- Follows system light/dark theme. Text scales with the system font size. Screen-reader labels on every control and card.
- No onboarding carousel: the empty state *is* the onboarding — "Add your first card" plus the promise "Your cards stay on this phone. No account, no internet."

## Visual design

Revised 2026-11-15: the visual language is **Swiss style** (full rules in the project skill `.claude/skills/swiss-design`), replacing the Spotify-inspired look of 2026-10-23. White paper and off-black ink, square corners, hairline rules and a strict type scale; the card photos are the only strong colour. Actions are ink rather than a hue; taupe tints the pixel icons and nothing else. Tokens live in `src/ui/theme.ts`.

| Token | Light | Dark | Role |
|---|---|---|---|
| Page | `#FFFFFF` | `#111111` | background |
| Surface | `#F7F6F3` | `#1A1A1A` | panels, title and action bars |
| Raised | `#F5F1E8` (beige) | `#242424` | sheets, chips, tag pills, tooltips |
| Text / muted | `#111111` / `#5C5C5C` | `#F5F5F5` / `#A8A8A8` | primary and secondary text (4.5:1) |
| Ink accent | `#111111`, white label | `#F5F1E8`, ink label | filled primary buttons, chosen chips, the add button, switch tracks |
| Taupe | `#B38B6D` | `#B38B6D` | the tint inside pixel icons and the logo seal — decoration only, never an action or a state |
| Outline grey | `#808080` | `#808080` | secondary button outlines (3:1) |
| Selection blue | `#1F6FD0` | `#539DF5` | selection, focus, the card being dragged — nothing else |
| Negative red | `#C2283A` | `#F3727F` | destructive actions, "can't be recovered" |
| Counter black | `#000000` | `#000000` | counter view only |

Depth is shown by shade and a hairline rule (12% black/white), not by shadow; only what floats (the add button, tooltips) carries a sharp, light shadow (16% black, 4 blur, 2 down). Ink is never pure black. Card thumbnails get a 12% black veil in dark mode so white plastic doesn't glare; the counter view is never dimmed. A toggle in the home title bar cycles System → Light → Dark; System follows the phone, and the choice is saved in settings and applied app-wide (native alerts and pickers included) before the first screen draws. Contrast tests check text and secondary text at 4.5:1 on every opaque surface in both palettes.

- **Type:** Public Sans (OFL, bundled; a neutral grotesque) for all text; 400 body, 600 labels, 700 headings. Scale 12 / 14 / **16 body** / 18 / 24, 32 for display. Headings are tracked tight (−0.4); small section labels are uppercase 12 semibold, tracked 1.2. Button labels are sentence case, 16 semibold. Card numbers use tabular figures.
- **Shape:** square. Panels, bars and sheets have no radius; anything pressed or typed into (buttons, icon buttons, chips, tag pills, search and tag fields, the add button, the toggles) takes a 2 pt corner. No pills or circles; the stack's dots and the grid's checkboxes are squares. Card photos are the card — no box or border — with the true ID-1 corner radius (3.18 mm on 85.6 mm ≈ 3.7% of width). Text fields a bottom rule only.
- **Icons:** one pixel-art set (`src/ui/RetroIcon.tsx`), each drawn on a 12 × 12 grid of 2 px cells so edges stay whole at any density; section and field icons use outline + taupe + paper, action buttons the one outline colour. No line icons or icon fonts.
- **One bold element:** a guilloche rosette (SVG), shown only on the empty state and the app-switcher cover.
- **Two motions:** a 3D card flip (on the home stack's front card, via the flip button shown on two-sided cards: a spring turn with a slight lift and shading, interruptible mid-turn), and the home screen's wallet-style card stack (cards behind fan out to the right; swipe left sends the front card to the back, swipe right brings the previous one back, tapping a peeking card brings it straight to the front). A Settings switch, **Swipe cards up and down** (off by default), fans the stack out below the front card instead, with swipe up for the next card and swipe down for the previous one. On release the stack finishes on a spring that starts at the finger's speed, so a flick keeps its momentum. Both motions are instant when Reduce Motion is on. Small fades also smooth fields appearing on the edit screen, and the expiry alert sign pops in once.
- **Surfaces** (glass removed 2026-10-21): every screen sits on the plain page colour (`bg`), with solid panels (`surface`, a hairline `border`) for the chrome: home's title bar, card caption and Add card bar; the card view's header (with Close) and Show / Share / Pin / More bar; the edit form's three groups and its Close / Save bar; the boot panel. No blur, translucency or backdrop blobs. Card photos stay unframed on the page.
- Content left-aligned; only the empty state centres its single call to action.
- Avoid: pills and circles, gradients and glows, coloured buttons other than destructive ones, extra hues, uppercase button labels.

## Stack

- `expo-router` (navigation)
- `expo-sqlite` (card rows + settings)
- `react-native-quick-crypto` (AES-256-GCM, PBKDF2, random bytes), `buffer` (byte/string conversion)
- `expo-secure-store` (device-only key)
- `expo-file-system` (encrypted image blobs, temp files)
- `react-native-image-crop-picker` (library picker, freeform crop — also crops shared-in images), `expo-image-manipulator` (list thumbnails)
- `expo-document-picker` (pick a PDF from Files)
- `expo-share-intent` (receive images and PDFs shared to the app: Android `SEND` for images and PDFs, `SEND_MULTIPLE` for images; its iOS share extension is turned off in `app.json` for now)
- `expo-brightness`, `expo-keep-awake`, `expo-screen-orientation` (counter view)
- `react-native-gesture-handler`, `react-native-reanimated` (pinch zoom), `react-native-draggable-flatlist` (pinned reorder)
- `expo-notifications` (expiry reminders)
- `@react-native-community/datetimepicker` (expiry date)
- `react-native-share` (share card front + back; share export file), `expo-document-picker` (import)
- `expo-iap` (unlock)
- `expo-font` (bundled Public Sans), `react-native-svg` (rosette)

## Quality & release

- **Jest** unit tests for encryption round trips, export/import (wrong passphrase, merge, replace), the card limit and unlock state, reminder scheduling.
- One **Maestro** E2E flow: add a card → it appears pinned → open it full-screen → flip it.
- Manual checks on real devices: library pick, share-in from Photos (1 and 2 images, and while at the free limit), crop, brightness, purchases (store sandboxes).
- Release: TestFlight + Play internal testing with friends and family, then public. Needs a one-page privacy policy (both stores require one) and the "Doc Keeper" store name checked for availability.

## Implementation notes (decided while planning)

These follow from the agreed design; they're recorded so nobody re-derives them.

- **Everything about a card is encrypted, not just "sensitive" fields.** SQLite holds only `id`, `pinned`, `position`, timestamps and an encrypted JSON payload. Search and tag filtering happen in memory after decryption — datasets are tiny.
- **Backup exclusion.** Android: `android.allowBackup: false`. iOS: files in the app container can still be swept into an iCloud device backup, but they are useless there because the key is `…ThisDeviceOnly` and never leaves the original phone. On launch, if card data exists but the key is missing or doesn't match (a "key-check" value fails to decrypt), the app shows a recovery screen: "Cards from a previous device can't be opened — import your Doc Keeper backup file" with **Import backup** and **Start fresh**. It never crashes or shows garbage.
- **Plaintext never sits on disk in the app's storage** except transiently: picker/crop temp files, picked PDFs, their rendered pages and the decrypted copy a stored PDF is drawn from (`pdf/` cache, deleted as soon as its pages are drawn), and images received through share-in are deleted right after encryption (or when the add is cancelled), and decrypted share files go to a `share/` cache folder that is emptied at every launch and before every share.
- **Thumbnails.** A ~400px encrypted thumbnail of the front is stored per card so the list never decodes full-size images.
- **Reminder cap.** iOS allows 64 pending local notifications per app. Reminders are re-planned from scratch after every change and at launch, scheduling only the soonest 60.
- **Refunds.** The app doesn't contact the store on its own; it only talks to the store when the user taps Buy or Restore. A refunded unlock therefore isn't revoked automatically. Accepted for a one-time utility unlock.
- **Imports are all-or-nothing.** The whole file is validated before anything changes; a bad file leaves the device untouched.
