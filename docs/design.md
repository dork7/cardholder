# CardHolder — v1 Design

Status: agreed 2026-10-19 (design grilling session). This is the source of truth for v1 scope; the implementation plan in `docs/superpowers/plans/` argues from it.

## What it is

A public iOS + Android app (Expo) that stores **image-based** cards — ID, insurance, membership, loyalty — and gets one on screen fast at a counter.

- No barcodes. Cards are photos (front, optional back).
- No accounts. **The app never touches the internet**; the only network traffic is the app stores' own purchase flow.
- Target gap: physical cards with no barcode (ID, insurance, membership) that Apple/Google Wallet don't cover.

## Cards

| Field | Rules |
|---|---|
| Name | required, trimmed, 1–60 chars |
| Front image | required |
| Back image | optional |
| Category | one of ID / Insurance / Membership / Loyalty / Other |
| Card number | optional, typed (e.g. to read out over the phone) |
| Notes | optional |
| Expiry date | optional, a calendar date |

- Images come from the **photo library only** — no in-app camera in v1, so the app never asks for camera permission. Two ways in:
  - **Pick from the library** on the add/edit screen.
  - **Use a PDF** on the add/edit screen, for cards issued as PDFs (digital insurance cards, e-IDs). One page is rendered on the device (PDFKit on iOS, `PdfRenderer` on Android, in `modules/card-pdf`): page 1 for the front, page 2 for the back (the last page if there is only one). Password-protected PDFs are refused with a short message. The original PDF is not kept; only the cropped image is saved.
  - **Share to CardHolder** from Photos (or any app) via the system share sheet. One shared image opens the add-card screen with it as the front; two images become front and back, in the order shared; more than two is refused with a short message. If the user is at the free limit, the upgrade screen shows instead (the shared images are discarded).
- Every image goes through a **freeform crop** before it is saved.
- Every field and image is editable after saving.
- Delete asks for confirmation, removes the encrypted image files immediately, and frees a slot toward the free limit.
- Expiry reminders: **local notifications 30 days and 7 days before** the expiry date. Fixed in v1 (no per-card settings). Notification permission is requested **only the first time the user saves a card with an expiry date**, never at launch.

## Speed at the counter (≤ 2 taps from an unlocked home screen)

**Home screen** (the app opens straight to it):

1. Backup nudge banner (when due, see Backup).
2. **Pinned cards** at the top as large thumbnails, manually ordered via drag to reorder. New cards are pinned by default (appended to the end).
3. Search field (matches name and card number) and category filter.
4. All other cards, alphabetical.

Tap a card → **counter view**:

- Full-screen.
- Brightness to maximum; restored on exit and when the app is backgrounded.
- Screen kept awake.
- Front and back shown together, one above the other, when a back exists.
- Pinch to zoom.
- Landscape when the image is wider than tall, so the card fills the screen.

## Security & privacy

- **No app lock.** The phone's own lock is the protection.
- Card images and all card fields are **AES-256-GCM encrypted at rest**. The key is random, **device-only**, and stored in the Keychain/Keystore via `expo-secure-store`.
- Card data is **excluded from iCloud/Google device backups** (see Implementation notes for how this is achieved per platform).
- The app is **blurred in the app switcher**. Screenshots are allowed.
- **Share** on the counter view sends the card's front and back images through the system share sheet. For cards in the ID category, a one-line confirmation first: "This shares an unencrypted copy."
- No crash-reporting or analytics SDKs. Rely on the stores' own opt-in crash reports. Store privacy label: **Data Not Collected**.

## Backup

The **passphrase-encrypted export file** (`.cardholder`) is the **only** backup.

- Export: user picks a passphrase (minimum 8 characters, typed twice). The app states plainly that **a forgotten passphrase cannot be recovered**. File is shared via the system share sheet (Files, AirDrop, Drive, email…).
- Import: pick the file, enter the passphrase, then choose:
  - **Merge** — cards already on the device (same internal ID) are skipped, the rest are added.
  - **Replace** — wipes the device's cards first, behind a confirmation.
- Imported cards are never locked by the free limit.
- Nudge: a banner on the home screen after the first card is saved if the user has never exported, and again when there are changes since the last export and that export is more than 30 days old. Dismissing snoozes it for 7 days. Settings shows "Last backup: <relative time>".

## Monetization

- Freemium: **4 cards free**. One card = front + back + details.
- **Unlimited**: one-time non-consumable purchase, about **$2.99 / AED 10.99**, via `expo-iap`. The unlock is cached on device and works offline from then on. **Restore Purchases** button (Apple requires it).
- **Existing cards are never locked.** Over the limit (import from a paid install, refund), all cards stay viewable and editable; only *adding* a new card is blocked until purchase.

## Platform & UX baseline

- Expo, built as an **EAS dev build** (not Expo Go) because it uses native modules.
- **Phones only** (no tablet layout). **iOS 16+**, **Android 10+ (API 29)**.
- **English only**, with all user-facing strings in one file (`src/strings.ts`).
- Follows system light/dark theme. Text scales with the system font size. Screen-reader labels on every control and card.
- No onboarding carousel: the empty state *is* the onboarding — "Add your first card" plus the promise "Your cards stay on this phone. No account, no internet."

## Visual design

Agreed 2026-10-19. The visual language is **security printing**, the vernacular of the documents the app holds: guilloche rosettes, intaglio ink, the ISO ID-1 card shape.

| Token | Light | Dark | Role |
|---|---|---|---|
| Security paper | `#EDF1EC` | `#121212` | background (light: cool, faintly green — not cream; dark: neutral near-black) |
| Intaglio | `#1D3B4A` | `#E0E0E0` | text, filled primary buttons (dark fills use `#A4C0CC`, the same ink teal lifted and desaturated) |
| Guilloche | `#7C9893` | `#707070` | rosette lines, field underlines (secondary text uses `#4F6A66` / `#A3A3A3` for 4.5:1) |
| Hologram violet | `#5B44C8` | `#ADA3EE` | selection, focus, the card being dragged — nothing else |
| Stamp red | `#B3261E` | `#F0988F` | destructive actions, "can't be recovered" |
| Counter black | `#000000` | `#000000` | counter view only |

Dark mode is redesigned, not inverted: surfaces step up from `#121212` (page) to `#1E1E1E` (header, card tiles) to `#242424` (banners, sheets), text is off-white `#E0E0E0`, hues desaturated ~25%, hairlines are 12% white over whatever surface they sit on, elevation is shown by lighter surfaces (never shadows), and card thumbnails get a 12% black veil so white plastic doesn't glare. The counter view is never dimmed — it's for scanning. A toggle in the home title bar cycles System → Light → Dark; System follows the phone, and the choice is saved in settings and applied app-wide (native alerts and pickers included) before the first screen draws. Contrast tests check text and secondary text at 4.5:1 on every opaque surface in both palettes.

- **Type:** Public Sans (OFL, bundled) for all text; weights 400 body, 600 card names, 700 titles. Scale 14 / 16 / **18 body** / 21 / 24 / 36. Card numbers use Public Sans with tabular figures.
- **Shape:** card photos are the card — no box, border or shadow around tiles — with the true ID-1 corner radius (3.18 mm on 85.6 mm ≈ 3.7% of width). Buttons radius 8; text fields a bottom hairline only; settings are hairline-separated groups, not cards.
- **One bold element:** a guilloche rosette (SVG), shown only on the empty state and the app-switcher cover.
- **Two motions:** a 3D card flip (on the home stack's front card, via the flip button shown on two-sided cards: a spring turn with a slight lift and shading, interruptible mid-turn), and the home screen's wallet-style card stack (cards behind fan out to the right; swipe left sends the front card to the back, swipe right brings the previous one back, tapping a peeking card brings it straight to the front). Both are instant when Reduce Motion is on. No other animation.
- **Surfaces** (glass removed 2026-10-21): every screen sits on the plain page colour (`bg`), with solid panels (`surface`, a hairline `border`) for the chrome: home's title bar, card caption and Add card bar; the card view's header and Share / Edit / Close bar; the edit form's three groups and its Close / Save bar; the boot panel. No blur, translucency or backdrop blobs. Card photos stay unframed on the page.
- Content left-aligned; only the empty state centres its single call to action.
- Avoid: stock iOS blue, uniform rounded card kits, all-caps labels, monospace faces.

## Stack

- `expo-router` (navigation)
- `expo-sqlite` (card rows + settings)
- `react-native-quick-crypto` (AES-256-GCM, PBKDF2, random bytes), `buffer` (byte/string conversion)
- `expo-secure-store` (device-only key)
- `expo-file-system` (encrypted image blobs, temp files)
- `react-native-image-crop-picker` (library picker, freeform crop — also crops shared-in images and rendered PDF pages), `expo-image-manipulator` (list thumbnails)
- `expo-document-picker` (pick a PDF from Files)
- `expo-share-intent` (receive images shared to the app: iOS Share Extension + Android `SEND`/`SEND_MULTIPLE` image intents)
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
- Release: TestFlight + Play internal testing with friends and family, then public. Needs a one-page privacy policy (both stores require one) and the "CardHolder" store name checked for availability.

## Implementation notes (decided while planning)

These follow from the agreed design; they're recorded so nobody re-derives them.

- **Everything about a card is encrypted, not just "sensitive" fields.** SQLite holds only `id`, `pinned`, `position`, timestamps and an encrypted JSON payload. Search and category filtering happen in memory after decryption — datasets are tiny.
- **Backup exclusion.** Android: `android.allowBackup: false`. iOS: files in the app container can still be swept into an iCloud device backup, but they are useless there because the key is `…ThisDeviceOnly` and never leaves the original phone. On launch, if card data exists but the key is missing or doesn't match (a "key-check" value fails to decrypt), the app shows a recovery screen: "Cards from a previous device can't be opened — import your CardHolder backup file" with **Import backup** and **Start fresh**. It never crashes or shows garbage.
- **Plaintext never sits on disk in the app's storage** except transiently: picker/crop temp files, picked PDFs and their rendered pages, and images received through share-in are deleted right after encryption (or when the add is cancelled), and decrypted share files go to a `share/` cache folder that is emptied at every launch and before every share.
- **Thumbnails.** A ~400px encrypted thumbnail of the front is stored per card so the list never decodes full-size images.
- **Reminder cap.** iOS allows 64 pending local notifications per app. Reminders are re-planned from scratch after every change and at launch, scheduling only the soonest 60.
- **Refunds.** The app doesn't contact the store on its own; it only talks to the store when the user taps Buy or Restore. A refunded unlock therefore isn't revoked automatically. Accepted for a one-time utility unlock.
- **Imports are all-or-nothing.** The whole file is validated before anything changes; a bad file leaves the device untouched.
