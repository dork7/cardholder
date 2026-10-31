# Doc Keeper — v1 Design

Status: agreed 2026-10-19 (design grilling session). This is the source of truth for v1 scope; the implementation plan in `docs/superpowers/plans/` argues from it.

## What it is

A public iOS + Android app (Expo) that stores **image-based** cards — ID, insurance, membership, loyalty — and gets one on screen fast at a counter.

- No barcodes. Cards are photos (front, optional back).
- No accounts. **The app never touches the internet on its own**; the only network traffic is the app stores' own purchase flow and, if the user turns on AI suggestions in Settings, a one-time download of the AI model (see AI suggestions below).
- Target gap: physical cards with no barcode (ID, insurance, membership) that Apple/Google Wallet don't cover.

## Cards

| Field | Rules |
|---|---|
| Name | required, trimmed, 1–60 chars |
| Front image | required |
| Back image | optional |
| Category | ID / Insurance / Membership / Other to start with, plus any the user types (**+ New** under Category on the edit screen; a name matching an existing category, ignoring case, picks it). The list is saved sealed and managed in **Settings → Categories**: a category can be deleted only while no card uses it — otherwise the error lists those cards. Tags were removed from the app; tags already saved stay in the data but are no longer shown, suggested or searched. |
| Card number | optional, typed (e.g. to read out over the phone) |
| Notes | optional |
| Expiry date | optional, a calendar date |

- Images come from the **photo library only** — no in-app camera in v1, so the app never asks for camera permission. Two ways in:
  - **Pick from the library** on the add/edit screen.
  - **Use a PDF** on the add/edit screen, for documents issued as PDFs (digital insurance cards, e-IDs, policies). The whole PDF is kept, encrypted like the photos; nothing is cropped or extracted from it. One page, the **thumbnail page** (page 1 unless the user picks another from a row of page previews), is rendered on the device (PDFKit on iOS, `PdfRenderer` on Android, in `modules/card-pdf`) and stands in as the card's front picture on the home screen and for reading the card. The PDF's pages take the place of a back photo. The card view shows every page, swiped sideways and pinch-zoomable; Share sends the PDF itself; backups carry it. Sending to another phone over QR codes carries only the thumbnail page, as a photo card. A photo chosen for the front turns the card back into a photo card. Password-protected PDFs and PDFs over 10 MB are refused with a short message.
  - **Share to Doc Keeper** from Photos (or any app) via the system share sheet. One shared image opens the add-card screen with it as the front; two images become front and back, in the order shared; more than two is refused with a short message. If the user is at the free limit, the upgrade screen shows instead (the shared images are discarded).
- Every image goes through a **freeform crop** before it is saved.
- Every field and image is editable after saving.
- Delete asks for confirmation, removes the encrypted image files immediately, and frees a slot toward the free limit.
- Expiry reminders: **local notifications 30 days and 7 days before** the expiry date. Fixed in v1 (no per-card settings). Notification permission is requested **only the first time the user saves a card with an expiry date**, never at launch.

## Speed at the counter (≤ 2 taps from an unlocked home screen)

**Home screen** (the app opens straight to it):

1. **Pinned cards** at the top as large thumbnails, manually ordered via drag to reorder. New cards are pinned by default (appended to the end).
2. Search field (matches the name) and category filter.
3. All other cards, alphabetical.

A **gallery view** button in the header swaps the card stack for a two-column grid of every card (picture, name and category); the choice is remembered. In the grid, a long-press starts selecting, taps then add or remove cards, and a bar at the bottom shows the count with Cancel and Delete. Delete asks once for all of them. Only cards still shown by the search and category filter are deleted.

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
- **Quick share** on the card view sends the whole card through the system share sheet — AirDrop on iPhone, Quick Share on Android (Bluetooth and Wi-Fi, no internet), or any other app — as one file: a PDF card as its PDF, a card with a back as a two-page PDF made on the phone, a front-only card as its photo. For cards in the ID category, a one-line confirmation first: "This shares an unencrypted copy of the card." Sending a card over QR codes was removed, along with the camera permission (`android.permission.CAMERA` is blocked).
- **AI suggestions (optional).** Card reading can also use Gemma 3 270M (`llama.rn`) on the card's text. The model (~290 MB) is not in the app: Settings offers it only on phones that read card text (Vision on iOS, ML Kit's bundled Latin model on Android, which has no Arabic), and downloads it once from Hugging Face after a confirmation that states the size and source. The file is pinned to one revision and checked against its SHA-256 before use; Settings shows progress, can stop the download, and can delete the model. The model only fills fields the rules left empty and never sends anything; card text never leaves the phone.
- No crash-reporting or analytics SDKs. Rely on the stores' own opt-in crash reports. Store privacy label: **Data Not Collected**.

## Backup

The **passphrase-encrypted export file** (`.cardholder`) is the **only** backup.

- Export: user picks a passphrase (minimum 3 characters, numbers allowed, typed twice). The app states plainly that **a forgotten passphrase cannot be recovered**. File is shared via the system share sheet (Files, AirDrop, Drive, email…).
- Import: pick the file, enter the passphrase, then choose:
  - **Merge** — cards already on the device (same internal ID) are skipped, the rest are added.
  - **Replace** — wipes the device's cards first, behind a confirmation.
- Imported cards are never locked by the free limit.
- No backup reminder on the home screen. Settings shows "Last backup: <relative time>".

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

Revised 2026-10-23: the visual language is **Spotify-inspired** (full rules in the project skill `.claude/skills/spotify-design`). Near-black surfaces recede so the card photos are the only colour; one functional amber marks primary actions and active states (Doc Keeper's own accent in place of Spotify's green). Tokens live in `src/ui/theme.ts`.

| Token | Light | Dark | Role |
|---|---|---|---|
| Page | `#FFFFFF` | `#121212` | background |
| Surface | `#F4F4F4` | `#181818` | panels, card tiles |
| Raised | `#EEEEEE` | `#1F1F1F` | banners, sheets, unselected chips |
| Text / muted | `#121212` / `#5E5E5E` | `#FDFDFD` / `#B3B3B3` | primary and secondary text (4.5:1) |
| Amber | `#8A5A00` | `#F5B83D` | filled primary buttons, active chips, the add button — never decoration. Light uses a deeper amber with white labels: `#F5B83D` doesn't reach 3:1 on white |
| Outline grey | `#7C7C7C` | `#7C7C7C` | secondary button outlines, field underlines (3:1) |
| Selection blue | `#1F6FD0` | `#539DF5` | selection, focus, the card being dragged — nothing else |
| Negative red | `#C2283A` | `#F3727F` | destructive actions, "can't be recovered" |
| Counter black | `#000000` | `#000000` | counter view only |

Depth is shown by shade (`#121212` → `#181818` → `#1F1F1F`), and floating elements (the add button) carry a heavy shadow (50% black, 24 blur, 8 down) so it reads on near-black. Hairlines are 10% white/black. Card thumbnails get a 12% black veil in dark mode so white plastic doesn't glare; the counter view is never dimmed. A toggle in the home title bar cycles System → Light → Dark; System follows the phone, and the choice is saved in settings and applied app-wide (native alerts and pickers included) before the first screen draws. Contrast tests check text and secondary text at 4.5:1 on every opaque surface in both palettes.

- **Type:** Public Sans (OFL, bundled; Spotify's own faces are proprietary) for all text; 400 body, 700 emphasis, 600 sparingly. Compact scale 12 / 14 / **16 body** / 18 / 24, 32 for display. Button labels are uppercase, 14 bold, tracked 1.4. Card numbers use tabular figures.
- **Shape:** pill everything you press — buttons, chips and icon buttons are full pills, the add and appearance buttons are circles. Panels radius 8 (title and action bars keep their larger rounded ends). Card photos are the card — no box or border — with the true ID-1 corner radius (3.18 mm on 85.6 mm ≈ 3.7% of width). Text fields a bottom hairline only.
- **One bold element:** a guilloche rosette (SVG), shown only on the empty state and the app-switcher cover.
- **Two motions:** a 3D card flip (on the home stack's front card, via the flip button shown on two-sided cards: a spring turn with a slight lift and shading, interruptible mid-turn), and the home screen's wallet-style card stack (cards behind fan out to the right; swipe left sends the front card to the back, swipe right brings the previous one back, tapping a peeking card brings it straight to the front). Both are instant when Reduce Motion is on. No other animation.
- **Surfaces** (glass removed 2026-10-21): every screen sits on the plain page colour (`bg`), with solid panels (`surface`, a hairline `border`) for the chrome: home's title bar, card caption and Add card bar; the card view's header and Share / Edit / Close bar; the edit form's three groups and its Close / Save bar; the boot panel. No blur, translucency or backdrop blobs. Card photos stay unframed on the page.
- Content left-aligned; only the empty state centres its single call to action.
- Avoid: green as decoration or a background, square buttons, extra brand colours, relaxed line heights, monospace faces.

## Stack

- `expo-router` (navigation)
- `expo-sqlite` (card rows + settings)
- `react-native-quick-crypto` (AES-256-GCM, PBKDF2, random bytes), `buffer` (byte/string conversion)
- `expo-secure-store` (device-only key)
- `expo-file-system` (encrypted image blobs, temp files)
- `react-native-image-crop-picker` (library picker, freeform crop — also crops shared-in images), `expo-image-manipulator` (list thumbnails)
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
- Release: TestFlight + Play internal testing with friends and family, then public. Needs a one-page privacy policy (both stores require one) and the "Doc Keeper" store name checked for availability.

## Implementation notes (decided while planning)

These follow from the agreed design; they're recorded so nobody re-derives them.

- **Everything about a card is encrypted, not just "sensitive" fields.** SQLite holds only `id`, `pinned`, `position`, timestamps and an encrypted JSON payload. Search and category filtering happen in memory after decryption — datasets are tiny.
- **Backup exclusion.** Android: `android.allowBackup: false`. iOS: files in the app container can still be swept into an iCloud device backup, but they are useless there because the key is `…ThisDeviceOnly` and never leaves the original phone. On launch, if card data exists but the key is missing or doesn't match (a "key-check" value fails to decrypt), the app shows a recovery screen: "Cards from a previous device can't be opened — import your Doc Keeper backup file" with **Import backup** and **Start fresh**. It never crashes or shows garbage.
- **Plaintext never sits on disk in the app's storage** except transiently: picker/crop temp files, picked PDFs, their rendered pages and the decrypted copy a stored PDF is drawn from (`pdf/` cache, deleted as soon as its pages are drawn), and images received through share-in are deleted right after encryption (or when the add is cancelled), and decrypted share files go to a `share/` cache folder that is emptied at every launch and before every share.
- **Thumbnails.** A ~400px encrypted thumbnail of the front is stored per card so the list never decodes full-size images.
- **Reminder cap.** iOS allows 64 pending local notifications per app. Reminders are re-planned from scratch after every change and at launch, scheduling only the soonest 60.
- **Refunds.** The app doesn't contact the store on its own; it only talks to the store when the user taps Buy or Restore. A refunded unlock therefore isn't revoked automatically. Accepted for a one-time utility unlock.
- **Imports are all-or-nothing.** The whole file is validated before anything changes; a bad file leaves the device untouched.
