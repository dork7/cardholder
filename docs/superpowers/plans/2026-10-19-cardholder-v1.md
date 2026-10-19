# CardHolder v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship CardHolder v1 — an offline, encrypted Expo app (iOS + Android phones) that stores photo-based ID/insurance/membership/loyalty cards and shows one full-screen at a counter in ≤ 2 taps.

**Architecture:** A deep, platform-free core in `src/` (crypto, storage, card store, backup format, policies, reminder planning) behind small interfaces (`SqlDb`, `BlobStore`, `KeyVault`, `IapModule`) so it's fully unit-tested in Jest with real AES/PBKDF2 (Node `crypto`) and real SQLite (`better-sqlite3`). Thin native adapters (expo-sqlite, expo-file-system, expo-secure-store, expo-iap, image picker, share) plug into those interfaces at runtime. UI is `expo-router` screens under `app/` that talk to one `AppProvider` context.

**Tech Stack:** Expo (latest stable SDK at scaffold time, new architecture), TypeScript, expo-router, expo-sqlite, react-native-quick-crypto, expo-secure-store, expo-file-system, react-native-image-crop-picker (library + crop, no camera), expo-image-manipulator, expo-share-intent, expo-font (Public Sans), react-native-svg, expo-notifications, expo-brightness, expo-keep-awake, expo-screen-orientation, react-native-gesture-handler, react-native-reanimated, react-native-draggable-flatlist, @react-native-community/datetimepicker, react-native-share, expo-document-picker, expo-iap. Tests: Jest (jest-expo), @testing-library/react-native, better-sqlite3, Maestro.

**Spec:** `docs/design.md` — read it before starting any task.

## Prerequisites (one-time, on the developer machine)

- **Node 24 LTS.** This machine currently has Node 25 (non-LTS); Expo and `better-sqlite3` prebuilt binaries target LTS. Install with `brew install node@24 && brew link --overwrite --force node@24` (or `nvm install 24 && nvm use 24`). `node -v` must print `v24.x`.
- **Xcode** (App Store) with an iOS Simulator runtime — needed from Task 11 onward (`npx expo run:ios`) and for Maestro (Task 19). Not currently installed. After installing: `sudo xcode-select -s /Applications/Xcode.app && xcodebuild -runFirstLaunch`.
- **Android Studio** with an emulator (API 29+) — optional locally; needed to run Android builds before release.
- **Apple Developer Program** and **Google Play Console** accounts — needed in Task 16 (purchase sandbox) and Task 20 (release).
- **Maestro** — installed in Task 19.

## Global Constraints

- Node 24 LTS; npm is the package manager.
- Install every Expo/native package with `npx expo install <pkg>` so versions match the SDK.
- iOS deployment target `16.0`; Android `minSdkVersion` `29`; phones only (`ios.supportsTablet: false`).
- iOS bundle identifier and Android package: `com.hamza.cardholder` (change in `app.json` before the first EAS build if you want a different one).
- **No network code.** No `fetch`, axios, analytics, crash-reporting or ad SDKs. The only network traffic is `expo-iap` talking to the App Store / Play Store, and only from the paywall and Restore Purchases.
- Every user-facing string lives in `src/strings.ts`. Components never contain string literals shown to users.
- `FREE_CARD_LIMIT = 4`; unlock product id `cardholder.unlimited` (non-consumable); price ≈ $2.99 / AED 10.99 (set in store consoles).
- Card data at rest: AES-256-GCM with a 32-byte random key stored via `expo-secure-store` with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`.
- Backup file: PBKDF2-SHA256, 600,000 iterations, 16-byte salt, AES-256-GCM; passphrase minimum 8 characters, NFC-normalised.
- Reminders: 30 and 7 days before expiry at 09:00 local time; at most 60 scheduled at once.
- Decrypted images are never written to app storage except: picker/crop temp files (deleted immediately after encryption) and the `share/` cache folder (emptied at every launch and before every share).
- Text must scale with the system font size: never set `allowFontScaling={false}` or `maxFontSizeMultiplier`, never give text containers fixed heights.
- Every `Pressable` has `accessibilityRole` and `accessibilityLabel`.
- Relative imports only (no path aliases). Tests live in `__tests__/` next to the code; shared test helpers live in `test/`.
- `android.allowBackup: false` in `app.json`.
- **No camera.** Images come only from the photo library or Share to CardHolder; `android.permission.CAMERA` is listed in `android.blockedPermissions`.
- **Visual design** (see `docs/design.md` → Visual design): palette tokens in `src/ui/theme.ts`; Public Sans for all text through `src/ui/Text.tsx` (from Task 11 on, import `Text` from there, never from `react-native`); card numbers use tabular figures; type scale 14 / 16 / 18 (body) / 21 / 24 / 36; true `#000000` in the counter view.
- Card photos use the ISO ID-1 corner radius (3.7% of their rendered width). Buttons use radius 8. Text fields have a bottom hairline only. No boxes, borders or shadows around card tiles or settings groups.
- Motion: only the counter-view card flip, and it is skipped when the system Reduce Motion setting is on.

## Review Focus

1. **A malicious or corrupted backup file whose card id contains path characters (`../x`)** must be rejected as invalid before anything is written — card ids become blob file names. → test in Task 8 (`parseSnapshot rejects ids that could escape the cards folder`).
2. **A Replace import that fails part-way** must leave the existing cards intact (rows *and* images), never a half-wiped phone. → test in Task 6 (`a failed replace leaves existing cards untouched`).
3. **Card data present but the device key missing or different** (iOS device-backup restore onto a new phone, reinstall quirks) must produce the recovery screen, never a crash or garbage. → tests in Task 4 (`orphaned when key-check exists but the vault is empty` / `… holds a different key`).
4. **More than 30 cards with expiry dates** would exceed iOS's 64 pending local notifications; only the soonest 60 may be scheduled. → test in Task 10 (`caps the plan at the soonest 60 reminders`).
5. **An Android purchase that was pending and completes later** must be acknowledged (finished) when the user taps Restore, or Google auto-refunds it after 3 days. → test in Task 16 (`restore finishes the unlock transaction`).

## File Structure

```
app.json, eas.json, package.json, tsconfig.json, jest.config.js
plugins/
  recentsScreenshotTransform.js     pure string transform for MainActivity.kt
  withRecentsScreenshotDisabled.js  Expo config plugin (Android app-switcher privacy)
app/                                expo-router screens (UI only; logic lives in src/)
  _layout.tsx                       root: providers, boot gate, Stack, privacy shield
  index.tsx                         home: banner, pinned (drag), search/filter, others
  edit/[id].tsx                     add (id = "new") / edit card
  card/[id].tsx                     counter view
  settings.tsx, export.tsx, import.tsx, paywall.tsx, privacy.tsx
src/
  config.ts                         numeric/product constants
  strings.ts                        every user-facing string
  crypto/bytes.ts                   concat, utf8, base64, hex
  crypto/engine.ts                  typed handle on react-native-quick-crypto
  crypto/aead.ts                    AES-256-GCM seal/open, key generation
  crypto/keyring.ts                 KeyVault interface, key-check, orphan detection
  crypto/secureVault.ts             KeyVault on expo-secure-store
  storage/sqlDb.ts                  SqlDb interface + migrations
  storage/settings.ts               key/value settings on SqlDb
  storage/blobStore.ts              BlobStore interface
  storage/fileBlobStore.ts          BlobStore on expo-file-system
  storage/openDatabase.ts           SqlDb on expo-sqlite
  cards/types.ts                    Card, CardFields, images, categories
  cards/validate.ts                 field validation
  cards/listing.ts                  sort / split pinned / filter
  cards/cardStore.ts                encrypted CRUD, pinning, import insert
  cards/editForm.ts                 planSave: draft → create/update/invalid/limit
  time/dates.ts                     ISO dates, formatAgo, formatDate
  purchases/limits.ts               canAddCard
  purchases/entitlement.ts          unlocked flag
  purchases/gateway.ts              PurchaseGateway over an injected IapModule
  purchases/expoIapGateway.ts       binds gateway to expo-iap
  purchases/unlock.ts               purchaseUnlock / restoreUnlock
  purchases/useRestore.ts           shared Restore button behaviour
  backup/backupFile.ts              .cardholder encode/decode + snapshot validation
  backup/passphrase.ts              new-passphrase rules
  backup/backupService.ts           buildSnapshot / applySnapshot
  backup/nudge.ts                   shouldNudgeBackup, snooze, recordExport
  backup/useBackupNudge.ts          hook for the home banner
  reminders/plan.ts                 planReminders (pure)
  reminders/scheduler.ts            expo-notifications side
  images/capture.ts                 library pick / crop a shared image + thumbnail
  share/fileNames.ts                safe share/backup file names
  share/shareFiles.ts               share cache + react-native-share
  share/shareCard.ts                share a card's images
  shareIn/plan.ts                   decideShareIn (pure)
  shareIn/pending.ts                hands shared images to the add-card screen
  shareIn/ShareIntentRouter.tsx     Share to CardHolder → crop → add card
  app/boot.ts                       boot / start-fresh composition
  app/AppProvider.tsx               boot state + app context
  app/BootScreen.tsx                loading / orphaned / error screens
  app/NotificationRouter.tsx        reminder tap → card view
  hooks/useCardImage.ts, useMaxBrightness.ts, useCardOrientation.ts
  ui/theme.ts, Button.tsx, Field.tsx, CategoryChips.tsx, ImageField.tsx,
     ExpiryField.tsx, CardTile.tsx, CardRow.tsx, BackupBanner.tsx,
     ZoomableImage.tsx, PrivacyShield.tsx, Text.tsx, fonts.ts, Rosette.tsx
test/
  nodeCrypto.ts, memoryDb.ts, memoryBlobStore.ts, memoryVault.ts, fixtures.ts
app/+native-intent.tsx              keeps share-extension deep links away from expo-router
e2e/add-and-open-card.yaml
assets/e2e/sample-card.jpg
assets/fonts/                       PublicSans-Regular/SemiBold/Bold.ttf + licence
docs/design.md, docs/privacy-policy.md
```

---

### Task 1: Scaffold the Expo project, test runner and constants

**Files:**
- Create (via template): `package.json`, `app.json`, `tsconfig.json`, `.gitignore`, `assets/*`
- Delete: `App.tsx`, `index.ts`
- Create: `app/_layout.tsx`, `app/index.tsx`, `jest.config.js`, `test/nodeCrypto.ts`, `src/config.ts`, `src/strings.ts`
- Test: `src/__tests__/setup.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/config.ts` constants (`FREE_CARD_LIMIT`, `UNLOCK_PRODUCT_ID`, `NAME_MAX_LENGTH`, `MIN_PASSPHRASE_LENGTH`, `PBKDF2_ITERATIONS`, `REMINDER_DAYS_BEFORE`, `REMINDER_HOUR`, `MAX_SCHEDULED_REMINDERS`, `DAY_MS`, `BACKUP_STALE_MS`, `BACKUP_SNOOZE_MS`, `IMAGE_MAX_EDGE`, `IMAGE_QUALITY`, `THUMB_WIDTH`); `src/strings.ts` `strings` object; Jest maps `react-native-quick-crypto` → Node `crypto`.

- [ ] **Step 1: Confirm Node 24**

Run: `node -v`
Expected: `v24.x.x`. If not, follow Prerequisites before continuing.

- [ ] **Step 2: Scaffold into the repo root**

The repo root already has `.git` and `docs/`, so scaffold into a temp folder and move it up:

```bash
npx create-expo-app@latest cardholder-scaffold --template blank-typescript --no-install
rsync -a --exclude .git cardholder-scaffold/ ./
rm -rf cardholder-scaffold
npm install
```

- [ ] **Step 3: Install router, crypto and test dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-build-properties
npx expo install react-native-quick-crypto react-native-nitro-modules
npm install buffer
npx expo install -- --save-dev jest-expo jest @types/jest @testing-library/react-native
npm install --save-dev better-sqlite3 @types/better-sqlite3 @types/node
rm App.tsx index.ts
```

If npm reports missing peer dependencies for `react-native-quick-crypto`, install each with `npx expo install <name>`. If it warns that `@testing-library/react-native` needs `react-test-renderer`, run `npm install --save-dev react-test-renderer@$(node -p "require('react/package.json').version")`.

- [ ] **Step 4: Point the app at expo-router and add scripts**

In `package.json` set `"main"` and replace `"scripts"`:

```json
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start --dev-client",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
```

- [ ] **Step 5: Configure `app.json`**

Keep the template's `icon`, `splash` and `android.adaptiveIcon` values; make the `expo` object contain these keys (add or overwrite):

```json
{
  "expo": {
    "name": "CardHolder",
    "slug": "cardholder",
    "scheme": "cardholder",
    "version": "1.0.0",
    "orientation": "default",
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.hamza.cardholder"
    },
    "android": {
      "package": "com.hamza.cardholder",
      "allowBackup": false
    },
    "plugins": [
      "expo-router",
      ["expo-build-properties", { "ios": { "deploymentTarget": "16.0" }, "android": { "minSdkVersion": 29 } }]
    ]
  }
}
```

`orientation` is `default` on purpose: the app locks itself to portrait at runtime (Task 11) and unlocks landscape only in the counter view (Task 13). With `portrait` here, iOS would refuse the landscape lock.

- [ ] **Step 6: Ignore generated native folders**

Make sure `.gitignore` contains these lines (add any that are missing):

```
/ios
/android
```

- [ ] **Step 7: Add placeholder screens so the app still boots**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

`app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>CardHolder</Text>
    </View>
  );
}
```

(Both files are replaced in Task 11.)

- [ ] **Step 8: Write the failing setup test**

`src/__tests__/setup.test.ts`:

```ts
import QuickCrypto from 'react-native-quick-crypto';
import { FREE_CARD_LIMIT, PBKDF2_ITERATIONS } from '../config';
import { strings } from '../strings';

test('jest maps react-native-quick-crypto to Node crypto', () => {
  const bytes = (QuickCrypto as unknown as { randomBytes(n: number): Uint8Array }).randomBytes(4);
  expect(bytes).toHaveLength(4);
});

test('constants and strings load', () => {
  expect(FREE_CARD_LIMIT).toBe(4);
  expect(PBKDF2_ITERATIONS).toBe(600_000);
  expect(strings.appName).toBe('CardHolder');
});
```

- [ ] **Step 9: Run it to make sure it fails**

Run: `npx jest src/__tests__/setup.test.ts`
Expected: FAIL — `Cannot find module '../config'` (or a native-module error from `react-native-quick-crypto`).

- [ ] **Step 10: Add the Jest config and crypto mapping**

`jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^react-native-quick-crypto$': '<rootDir>/test/nodeCrypto.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
```

`test/nodeCrypto.ts`:

```ts
// Jest stand-in for react-native-quick-crypto: same Node-style API, real algorithms.
import * as crypto from 'crypto';

export default crypto;
```

- [ ] **Step 11: Add constants**

`src/config.ts`:

```ts
export const DAY_MS = 24 * 60 * 60 * 1000;

export const FREE_CARD_LIMIT = 4;
export const UNLOCK_PRODUCT_ID = 'cardholder.unlimited';

export const NAME_MAX_LENGTH = 60;

export const MIN_PASSPHRASE_LENGTH = 8;
export const PBKDF2_ITERATIONS = 600_000;

export const REMINDER_DAYS_BEFORE = [30, 7] as const;
export const REMINDER_HOUR = 9;
// iOS keeps at most 64 pending local notifications per app.
export const MAX_SCHEDULED_REMINDERS = 60;

export const BACKUP_STALE_MS = 30 * DAY_MS;
export const BACKUP_SNOOZE_MS = 7 * DAY_MS;

export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_QUALITY = 0.8;
export const THUMB_WIDTH = 400;
```

- [ ] **Step 12: Add every user-facing string**

`src/strings.ts`:

```ts
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const strings = {
  appName: 'CardHolder',
  promise: 'Your cards stay on this phone. No account, no internet.',
  common: {
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    close: 'Close',
    error: 'Something went wrong. Please try again.',
  },
  boot: {
    loading: 'Opening your cards…',
    orphanedTitle: "These cards can't be opened",
    orphanedBody:
      'Cards restored from another phone or a device backup stay locked to the phone they came from. Import your CardHolder backup file to get them back.',
    importBackup: 'Import backup',
    startFresh: 'Start fresh',
    startFreshConfirmTitle: 'Remove the locked cards?',
    startFreshConfirmBody: 'The locked cards are permanently removed from this phone.',
    errorTitle: "CardHolder couldn't start",
  },
  home: {
    title: 'CardHolder',
    emptyTitle: 'Add your first card',
    addCard: 'Add card',
    pinned: 'Pinned',
    allCards: 'All cards',
    results: 'Results',
    searchPlaceholder: 'Search cards',
    searchLabel: 'Search cards by name or number',
    allCategories: 'All',
    noResults: 'No cards match.',
    settings: 'Settings',
    openCard: (name: string) => `Open ${name}`,
    reorderHint: 'Long-press and drag to reorder.',
    moveUp: 'Move up',
    moveDown: 'Move down',
  },
  backupBanner: {
    title: 'Back up your cards',
    body: 'If this phone is lost, your cards go with it. Export a backup file and keep it somewhere safe.',
    action: 'Back up now',
    dismiss: 'Not now',
  },
  categories: {
    id: 'ID',
    insurance: 'Insurance',
    membership: 'Membership',
    loyalty: 'Loyalty',
    other: 'Other',
  },
  edit: {
    newTitle: 'New card',
    editTitle: 'Edit card',
    front: 'Front',
    back: 'Back (optional)',
    noImage: 'No photo yet',
    chooseFromLibrary: 'Choose from library',
    removeBack: 'Remove back',
    name: 'Name',
    namePlaceholder: 'e.g. Emirates ID',
    category: 'Category',
    number: 'Card number (optional)',
    notes: 'Notes (optional)',
    expiry: 'Expiry date (optional)',
    addExpiry: 'Add expiry date',
    clearExpiry: 'Clear',
    deleteCard: 'Delete card',
    deleteConfirmTitle: 'Delete this card?',
    deleteConfirmBody: 'Its photos are removed from this phone immediately.',
    captureFailed: "Couldn't open that photo. Check CardHolder's photo access in Settings.",
    notFound: 'This card no longer exists.',
    errors: {
      'name-required': 'Give the card a name.',
      'name-too-long': 'Keep the name to 60 characters or fewer.',
      'bad-category': 'Pick a category.',
      'bad-expiry': "That expiry date isn't valid.",
      'front-required': 'Add a photo of the front.',
    },
  },
  card: {
    front: 'Front',
    back: 'Back',
    flip: 'Flip',
    share: 'Share',
    edit: 'Edit',
    pin: 'Pin',
    unpin: 'Unpin',
    notFound: 'This card no longer exists.',
    shareIdTitle: 'Share this ID?',
    shareIdBody: 'This shares an unencrypted copy of the card images.',
    imageLabel: (name: string, side: string) => `${name}, ${side}`,
    imageHint: 'Tap to flip. Pinch to zoom.',
  },
  settings: {
    title: 'Settings',
    backup: 'Backup',
    lastBackup: (ago: string) => `Last backup: ${ago}`,
    neverBackedUp: 'Never backed up',
    exportBackup: 'Export backup',
    importBackup: 'Import backup',
    purchases: 'Unlimited cards',
    unlocked: 'Unlimited is unlocked. Thank you!',
    freeUsage: (used: number, limit: number) => `${Math.min(used, limit)} of ${limit} free cards used`,
    unlock: 'Unlock unlimited cards',
    restore: 'Restore purchases',
    restoreNone: 'No previous purchase was found for this store account.',
    restored: 'Unlimited restored.',
    about: 'About',
    privacyPolicy: 'Privacy policy',
    version: (v: string) => `Version ${v}`,
  },
  export: {
    title: 'Export backup',
    intro: 'Choose a passphrase to encrypt your backup file. You will need it to restore.',
    warning: "A forgotten passphrase can't be recovered — not by you, not by us. Write it down.",
    passphrase: 'Passphrase',
    confirm: 'Type it again',
    action: 'Export',
    working: 'Encrypting…',
    done: 'Backup exported.',
    tooShort: (min: number) => `Use at least ${min} characters.`,
    mismatch: "The passphrases don't match.",
    failed: "Export failed. Your cards weren't changed.",
  },
  import: {
    title: 'Import backup',
    pickFile: 'Choose backup file',
    fileChosen: (name: string) => `Selected: ${name}`,
    passphrase: 'Passphrase',
    unlock: 'Open backup',
    working: 'Working…',
    summary: (count: number, date: string) =>
      `${count} ${plural(count, 'card', 'cards')} in this backup, exported ${date}.`,
    merge: 'Merge with my cards',
    mergeHint: 'Cards already on this phone are kept; the rest are added.',
    replace: 'Replace my cards',
    replaceHint: 'Removes every card on this phone, then restores the backup.',
    replaceConfirmTitle: 'Replace all cards?',
    replaceConfirmBody: "Every card on this phone is removed and replaced by the backup. This can't be undone.",
    done: (added: number, skipped: number) =>
      `Added ${added} ${plural(added, 'card', 'cards')}` +
      (skipped > 0 ? `, skipped ${skipped} already on this phone.` : '.'),
    errors: {
      'not-a-backup': "That file isn't a CardHolder backup.",
      'unsupported-version': 'This backup was made by a newer version of CardHolder. Update the app and try again.',
      'wrong-passphrase-or-damaged': 'Wrong passphrase, or the file is damaged.',
      'invalid-contents': "This backup file is damaged and can't be imported. Nothing was changed.",
    },
    failed: 'Import failed. Nothing was changed.',
  },
  paywall: {
    title: 'Unlimited cards',
    body: (limit: number) =>
      `Your first ${limit} cards are free, forever. Unlock unlimited cards with a one-time purchase — no subscription.`,
    buy: (price: string | null) => (price ? `Unlock for ${price}` : 'Unlock'),
    loadingPrice: 'Contacting the store…',
    priceUnavailable: "Couldn't reach the store. Check your connection and try again.",
    restore: 'Restore purchases',
    purchased: 'Unlimited unlocked. Thank you!',
    pending: "Your purchase is waiting for approval. Once it's approved, tap Restore purchases.",
    failed: "The purchase didn't go through. You weren't charged.",
  },
  shareIn: {
    tooMany: 'Share one photo for the front, or two for the front and back.',
    failed: "Couldn't open the shared photo. Try sharing it again.",
  },
  reminders: {
    title: (name: string, days: number) => `${name} expires in ${days} days`,
    body: 'Tap to open the card.',
    channelName: 'Expiry reminders',
  },
  ago: {
    today: 'today',
    yesterday: 'yesterday',
    days: (n: number) => `${n} days ago`,
    months: (n: number) => `${n} ${plural(n, 'month', 'months')} ago`,
    years: (n: number) => `${n} ${plural(n, 'year', 'years')} ago`,
  },
  shield: 'CardHolder',
  privacy: {
    title: 'Privacy policy',
    paragraphs: [
      'CardHolder stores your cards only on this phone. There are no accounts and no servers, and the app does not connect to the internet.',
      'Card photos and details are encrypted on the phone with a key that never leaves it.',
      'CardHolder collects no personal data, analytics or crash reports. If you choose to share crash data with Apple or Google, they handle it under their own policies.',
      'Backups you export are encrypted with a passphrase you choose. Where you keep the file is up to you.',
      'Purchases are processed by the App Store or Google Play. CardHolder never sees your payment details.',
      'Questions? Contact the developer through the app’s store listing.',
    ],
  },
};
```

- [ ] **Step 13: Run tests and typecheck**

Run: `npx jest src/__tests__/setup.test.ts && npm run typecheck`
Expected: 2 tests PASS; `tsc` exits 0.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app with router, Jest and constants"
```

---

### Task 2: Byte helpers and AES-256-GCM

**Files:**
- Create: `src/crypto/bytes.ts`, `src/crypto/engine.ts`, `src/crypto/aead.ts`
- Test: `src/crypto/__tests__/aead.test.ts`

**Interfaces:**
- Consumes: `react-native-quick-crypto` (mapped to Node `crypto` in Jest).
- Produces:
  - `concat(...parts: Uint8Array[]): Uint8Array`
  - `utf8.encode(s: string): Uint8Array`, `utf8.decode(b: Uint8Array): string`
  - `base64.encode(b: Uint8Array): string`, `base64.decode(s: string): Uint8Array`
  - `toHex(b: Uint8Array): string`
  - `engine: CryptoEngine` (`randomBytes`, `createCipheriv`, `createDecipheriv`, `pbkdf2`)
  - `interface Aead { seal(plaintext: Uint8Array): Uint8Array; open(sealed: Uint8Array): Uint8Array }`
  - `createAead(key: Uint8Array): Aead` (throws if key ≠ 32 bytes)
  - `generateKey(): Uint8Array` (32 random bytes)
  - `class DecryptError extends Error`
  - Sealed format: `[version=1][iv 12][ciphertext][tag 16]`

- [ ] **Step 1: Write the failing tests**

`src/crypto/__tests__/aead.test.ts`:

```ts
import { createAead, DecryptError, generateKey } from '../aead';
import { base64, concat, toHex, utf8 } from '../bytes';

describe('bytes', () => {
  test('utf8 and base64 round-trip', () => {
    const text = 'Emirates ID — café';
    expect(utf8.decode(utf8.encode(text))).toBe(text);
    expect(utf8.decode(base64.decode(base64.encode(utf8.encode(text))))).toBe(text);
  });

  test('concat joins in order', () => {
    expect(Array.from(concat(Uint8Array.of(1, 2), Uint8Array.of(), Uint8Array.of(3)))).toEqual([1, 2, 3]);
  });

  test('toHex', () => {
    expect(toHex(Uint8Array.of(0, 255, 16))).toBe('00ff10');
  });
});

describe('aead', () => {
  test('generateKey returns 32 bytes', () => {
    expect(generateKey()).toHaveLength(32);
  });

  test('seal then open returns the plaintext', () => {
    const aead = createAead(generateKey());
    const plaintext = utf8.encode('front of my insurance card');
    expect(utf8.decode(aead.open(aead.seal(plaintext)))).toBe('front of my insurance card');
  });

  test('empty plaintext round-trips', () => {
    const aead = createAead(generateKey());
    expect(aead.open(aead.seal(new Uint8Array()))).toHaveLength(0);
  });

  test('sealing the same plaintext twice gives different output (random IV)', () => {
    const aead = createAead(generateKey());
    const plaintext = utf8.encode('same');
    expect(toHex(aead.seal(plaintext))).not.toBe(toHex(aead.seal(plaintext)));
  });

  test('a flipped byte fails authentication', () => {
    const aead = createAead(generateKey());
    const sealed = aead.seal(utf8.encode('secret'));
    sealed[sealed.length - 20] ^= 0x01;
    expect(() => aead.open(sealed)).toThrow(DecryptError);
  });

  test('a different key cannot open it', () => {
    const sealed = createAead(generateKey()).seal(utf8.encode('secret'));
    expect(() => createAead(generateKey()).open(sealed)).toThrow(DecryptError);
  });

  test('truncated or wrong-version input throws DecryptError', () => {
    const aead = createAead(generateKey());
    const sealed = aead.seal(utf8.encode('secret'));
    expect(() => aead.open(sealed.subarray(0, 10))).toThrow(DecryptError);
    const wrongVersion = Uint8Array.from(sealed);
    wrongVersion[0] = 9;
    expect(() => aead.open(wrongVersion)).toThrow(DecryptError);
  });

  test('rejects keys that are not 32 bytes', () => {
    expect(() => createAead(new Uint8Array(16))).toThrow('32 bytes');
  });
});
```

- [ ] **Step 2: Run to make sure they fail**

Run: `npx jest src/crypto`
Expected: FAIL — `Cannot find module '../aead'`.

- [ ] **Step 3: Implement byte helpers**

`src/crypto/bytes.ts`:

```ts
import { Buffer } from 'buffer';

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export const utf8 = {
  encode: (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'utf8')),
  decode: (b: Uint8Array): string => Buffer.from(b).toString('utf8'),
};

export const base64 = {
  encode: (b: Uint8Array): string => Buffer.from(b).toString('base64'),
  decode: (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'base64')),
};

export function toHex(b: Uint8Array): string {
  return Buffer.from(b).toString('hex');
}
```

- [ ] **Step 4: Implement the crypto engine handle**

`src/crypto/engine.ts`:

```ts
import QuickCrypto from 'react-native-quick-crypto';

// The subset of the Node-compatible crypto API this app relies on.
// react-native-quick-crypto implements it natively; Jest maps it to Node's crypto.
export interface Cipher {
  update(data: Uint8Array): Uint8Array;
  final(): Uint8Array;
  getAuthTag(): Uint8Array;
}

export interface Decipher {
  update(data: Uint8Array): Uint8Array;
  final(): Uint8Array;
  setAuthTag(tag: Uint8Array): void;
}

export interface CryptoEngine {
  randomBytes(size: number): Uint8Array;
  createCipheriv(algorithm: 'aes-256-gcm', key: Uint8Array, iv: Uint8Array): Cipher;
  createDecipheriv(algorithm: 'aes-256-gcm', key: Uint8Array, iv: Uint8Array): Decipher;
  pbkdf2(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keylen: number,
    digest: 'sha256',
    callback: (err: Error | null, derivedKey?: Uint8Array) => void,
  ): void;
}

export const engine = QuickCrypto as unknown as CryptoEngine;
```

- [ ] **Step 5: Implement AEAD**

`src/crypto/aead.ts`:

```ts
import { concat } from './bytes';
import { engine } from './engine';

const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class DecryptError extends Error {
  constructor() {
    super('Decryption failed');
    this.name = 'DecryptError';
  }
}

export interface Aead {
  seal(plaintext: Uint8Array): Uint8Array;
  open(sealed: Uint8Array): Uint8Array;
}

export function generateKey(): Uint8Array {
  return new Uint8Array(engine.randomBytes(KEY_LENGTH));
}

export function createAead(key: Uint8Array): Aead {
  if (key.length !== KEY_LENGTH) throw new Error(`AES-256 key must be ${KEY_LENGTH} bytes`);
  return {
    seal(plaintext) {
      const iv = engine.randomBytes(IV_LENGTH);
      const cipher = engine.createCipheriv('aes-256-gcm', key, iv);
      const body = concat(cipher.update(plaintext), cipher.final());
      return concat(Uint8Array.of(VERSION), iv, body, cipher.getAuthTag());
    },
    open(sealed) {
      if (sealed.length < 1 + IV_LENGTH + TAG_LENGTH || sealed[0] !== VERSION) throw new DecryptError();
      const iv = sealed.subarray(1, 1 + IV_LENGTH);
      const body = sealed.subarray(1 + IV_LENGTH, sealed.length - TAG_LENGTH);
      const tag = sealed.subarray(sealed.length - TAG_LENGTH);
      try {
        const decipher = engine.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return concat(decipher.update(body), decipher.final());
      } catch {
        throw new DecryptError();
      }
    },
  };
}
```

- [ ] **Step 6: Run tests**

Run: `npx jest src/crypto`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/crypto
git commit -m "feat: AES-256-GCM seal/open and byte helpers"
```

---

### Task 3: SQL storage, settings and the blob-store interface

**Files:**
- Create: `src/storage/sqlDb.ts`, `src/storage/settings.ts`, `src/storage/blobStore.ts`, `test/memoryDb.ts`, `test/memoryBlobStore.ts`
- Test: `src/storage/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type SqlValue = string | number | null | Uint8Array`
  - `interface SqlDb { execAsync(sql: string): Promise<void>; runAsync(sql: string, params: SqlValue[]): Promise<unknown>; getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>; getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>; withTransactionAsync(fn: () => Promise<void>): Promise<void> }` (shape matches expo-sqlite's `SQLiteDatabase`)
  - `migrate(db: SqlDb): Promise<void>` — creates `cards(id, pinned, position, payload BLOB, created_at, updated_at)` and `settings(key, value)`
  - `type SettingKey = 'keyCheck' | 'unlocked' | 'lastExportAt' | 'backupSnoozedUntil'`
  - `interface Settings { get(key): Promise<string | null>; getNumber(key): Promise<number | null>; set(key, value: string): Promise<void>; remove(key): Promise<void> }`, `createSettings(db: SqlDb): Settings`
  - `interface BlobStore { put(name: string, bytes: Uint8Array): Promise<void>; get(name: string): Promise<Uint8Array | null>; remove(name: string): Promise<void>; list(): Promise<string[]> }`
  - Test helpers: `memoryDb(): SqlDb` (better-sqlite3 in memory), `createMemoryBlobStore(): BlobStore & { raw: Map<string, Uint8Array> }`

- [ ] **Step 1: Write the failing tests**

`src/storage/__tests__/settings.test.ts`:

```ts
import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../settings';
import { migrate } from '../sqlDb';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  return { db, settings: createSettings(db) };
}

test('migrate creates tables and is idempotent', async () => {
  const db = memoryDb();
  await migrate(db);
  await migrate(db);
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  expect(version?.user_version).toBe(1);
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    [],
  );
  expect(tables.map((t) => t.name)).toEqual(['cards', 'settings']);
});

test('missing setting is null', async () => {
  const { settings } = await setup();
  expect(await settings.get('lastExportAt')).toBeNull();
  expect(await settings.getNumber('lastExportAt')).toBeNull();
});

test('set, overwrite and remove', async () => {
  const { settings } = await setup();
  await settings.set('unlocked', '1');
  await settings.set('unlocked', '0');
  expect(await settings.get('unlocked')).toBe('0');
  await settings.remove('unlocked');
  expect(await settings.get('unlocked')).toBeNull();
});

test('getNumber parses numbers and ignores junk', async () => {
  const { settings } = await setup();
  await settings.set('lastExportAt', '1700000000000');
  expect(await settings.getNumber('lastExportAt')).toBe(1_700_000_000_000);
  await settings.set('lastExportAt', 'not a number');
  expect(await settings.getNumber('lastExportAt')).toBeNull();
});
```

- [ ] **Step 2: Run to make sure they fail**

Run: `npx jest src/storage`
Expected: FAIL — `Cannot find module '../../../test/memoryDb'`.

- [ ] **Step 3: Implement the SqlDb interface and migrations**

`src/storage/sqlDb.ts`:

```ts
export type SqlValue = string | number | null | Uint8Array;

// Matches the parts of expo-sqlite's SQLiteDatabase we use, so tests can swap in better-sqlite3.
export interface SqlDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

// Append only. Index i upgrades the schema from user_version i to i + 1.
const MIGRATIONS = [
  `CREATE TABLE cards (
     id TEXT PRIMARY KEY NOT NULL,
     pinned INTEGER NOT NULL,
     position INTEGER NOT NULL,
     payload BLOB NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE settings (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];

export async function migrate(db: SqlDb): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  for (let version = row?.user_version ?? 0; version < MIGRATIONS.length; version++) {
    await db.execAsync(MIGRATIONS[version]);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}
```

- [ ] **Step 4: Implement settings**

`src/storage/settings.ts`:

```ts
import { SqlDb } from './sqlDb';

export type SettingKey = 'keyCheck' | 'unlocked' | 'lastExportAt' | 'backupSnoozedUntil';

export interface Settings {
  get(key: SettingKey): Promise<string | null>;
  getNumber(key: SettingKey): Promise<number | null>;
  set(key: SettingKey, value: string): Promise<void>;
  remove(key: SettingKey): Promise<void>;
}

export function createSettings(db: SqlDb): Settings {
  const get = async (key: SettingKey) =>
    (await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]))?.value ?? null;
  return {
    get,
    async getNumber(key) {
      const value = await get(key);
      if (value === null) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    },
    async set(key, value) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value],
      );
    },
    async remove(key) {
      await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    },
  };
}
```

- [ ] **Step 5: Define the blob-store interface**

`src/storage/blobStore.ts`:

```ts
// Flat namespace of opaque byte blobs (encrypted card images).
export interface BlobStore {
  put(name: string, bytes: Uint8Array): Promise<void>;
  get(name: string): Promise<Uint8Array | null>;
  remove(name: string): Promise<void>;
  list(): Promise<string[]>;
}
```

- [ ] **Step 6: Add the test helpers**

`test/memoryDb.ts`:

```ts
import Database from 'better-sqlite3';
import { SqlDb, SqlValue } from '../src/storage/sqlDb';

// better-sqlite3 only binds Buffers for BLOBs, not plain Uint8Arrays.
const bind = (params: SqlValue[]) =>
  params.map((p) => (p instanceof Uint8Array && !Buffer.isBuffer(p) ? Buffer.from(p) : p));

export function memoryDb(): SqlDb {
  const db = new Database(':memory:');
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params) {
      return db.prepare(sql).run(...bind(params));
    },
    async getAllAsync<T>(sql: string, params: SqlValue[]) {
      return db.prepare(sql).all(...bind(params)) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[]) {
      return (db.prepare(sql).get(...bind(params)) as T | undefined) ?? null;
    },
    async withTransactionAsync(fn) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
```

`test/memoryBlobStore.ts`:

```ts
import { BlobStore } from '../src/storage/blobStore';

export function createMemoryBlobStore(): BlobStore & { raw: Map<string, Uint8Array> } {
  const raw = new Map<string, Uint8Array>();
  return {
    raw,
    async put(name, bytes) {
      raw.set(name, Uint8Array.from(bytes));
    },
    async get(name) {
      return raw.get(name) ?? null;
    },
    async remove(name) {
      raw.delete(name);
    },
    async list() {
      return [...raw.keys()];
    },
  };
}
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npx jest src/storage && npm run typecheck`
Expected: 4 tests PASS; `tsc` exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/storage test/memoryDb.ts test/memoryBlobStore.ts
git commit -m "feat: SQLite schema, settings store and blob-store interface"
```

---

### Task 4: Device key, key-check and orphan detection

**Files:**
- Create: `src/crypto/keyring.ts`, `test/memoryVault.ts`
- Test: `src/crypto/__tests__/keyring.test.ts`

**Interfaces:**
- Consumes: `createAead`, `generateKey`, `Aead` (Task 2); `base64`, `utf8` (Task 2); `Settings`, `SqlDb`, `BlobStore`, `migrate`, `createSettings` (Task 3).
- Produces:
  - `interface KeyVault { get(): Promise<Uint8Array | null>; set(key: Uint8Array): Promise<void> }`
  - `type KeyringResult = { status: 'ready'; aead: Aead } | { status: 'orphaned' }`
  - `openKeyring(vault: KeyVault, settings: Settings): Promise<KeyringResult>`
  - `startFresh(deps: { db: SqlDb; blobs: BlobStore; vault: KeyVault; settings: Settings }): Promise<Aead>` — deletes every card row, setting and blob, installs a new key, returns its `Aead`
  - Test helper: `createMemoryVault(initial?: Uint8Array | null): KeyVault & { key: Uint8Array | null }`

The key-check is a known string sealed with the device key and stored in `settings.keyCheck`. Its presence means "card data was created on this install"; failing to open it means the key in the vault isn't the one that encrypted the data.

| keyCheck | vault key | result |
|---|---|---|
| absent | absent | new key, write keyCheck → ready |
| absent | present | reuse key (iOS keeps Keychain items across reinstalls), write keyCheck → ready |
| present | absent | **orphaned** |
| present | present, opens keyCheck | ready |
| present | present, doesn't open | **orphaned** |

- [ ] **Step 1: Write the failing tests**

`src/crypto/__tests__/keyring.test.ts`:

```ts
import { createMemoryBlobStore } from '../../../test/memoryBlobStore';
import { memoryDb } from '../../../test/memoryDb';
import { createMemoryVault } from '../../../test/memoryVault';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { generateKey } from '../aead';
import { utf8 } from '../bytes';
import { openKeyring, startFresh } from '../keyring';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  return { db, settings: createSettings(db), blobs: createMemoryBlobStore() };
}

test('first launch creates a key and a key-check', async () => {
  const { settings } = await setup();
  const vault = createMemoryVault();
  const result = await openKeyring(vault, settings);
  expect(result.status).toBe('ready');
  expect(vault.key).toHaveLength(32);
  expect(await settings.get('keyCheck')).not.toBeNull();
});

test('second launch reuses the same key', async () => {
  const { settings } = await setup();
  const vault = createMemoryVault();
  const first = await openKeyring(vault, settings);
  if (first.status !== 'ready') throw new Error('expected ready');
  const sealed = first.aead.seal(utf8.encode('hello'));
  const second = await openKeyring(vault, settings);
  if (second.status !== 'ready') throw new Error('expected ready');
  expect(utf8.decode(second.aead.open(sealed))).toBe('hello');
});

test('reinstall with a surviving vault key reuses it', async () => {
  const { settings } = await setup();
  const key = generateKey();
  const vault = createMemoryVault(key);
  expect((await openKeyring(vault, settings)).status).toBe('ready');
  expect(vault.key).toBe(key);
});

test('orphaned when key-check exists but the vault is empty', async () => {
  const { settings } = await setup();
  await openKeyring(createMemoryVault(), settings);
  expect((await openKeyring(createMemoryVault(), settings)).status).toBe('orphaned');
});

test('orphaned when key-check exists but the vault holds a different key', async () => {
  const { settings } = await setup();
  await openKeyring(createMemoryVault(), settings);
  expect((await openKeyring(createMemoryVault(generateKey()), settings)).status).toBe('orphaned');
});

test('orphaned when the stored key is corrupt', async () => {
  const { settings } = await setup();
  await openKeyring(createMemoryVault(), settings);
  expect((await openKeyring(createMemoryVault(new Uint8Array(5)), settings)).status).toBe('orphaned');
});

test('startFresh wipes cards, settings and blobs and installs a new key', async () => {
  const { db, settings, blobs } = await setup();
  const vault = createMemoryVault();
  await openKeyring(vault, settings);
  const oldKey = vault.key;
  await db.runAsync(
    'INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['card1', 1, 0, new Uint8Array([1, 2, 3]), 1, 1],
  );
  await settings.set('unlocked', '1');
  await blobs.put('card1.front', new Uint8Array([9]));

  const aead = await startFresh({ db, blobs, vault, settings });

  expect(await db.getAllAsync('SELECT * FROM cards', [])).toHaveLength(0);
  expect(await settings.get('unlocked')).toBeNull();
  expect(await blobs.list()).toEqual([]);
  expect(vault.key).not.toEqual(oldKey);
  expect((await openKeyring(vault, settings)).status).toBe('ready');
  expect(utf8.decode(aead.open(aead.seal(utf8.encode('ok'))))).toBe('ok');
});
```

- [ ] **Step 2: Run to make sure they fail**

Run: `npx jest src/crypto/__tests__/keyring.test.ts`
Expected: FAIL — `Cannot find module '../../../test/memoryVault'`.

- [ ] **Step 3: Add the memory vault helper**

`test/memoryVault.ts`:

```ts
import { KeyVault } from '../src/crypto/keyring';

export function createMemoryVault(initial: Uint8Array | null = null): KeyVault & { key: Uint8Array | null } {
  const vault = {
    key: initial,
    async get() {
      return vault.key;
    },
    async set(key: Uint8Array) {
      vault.key = key;
    },
  };
  return vault;
}
```

- [ ] **Step 4: Implement the keyring**

`src/crypto/keyring.ts`:

```ts
import { BlobStore } from '../storage/blobStore';
import { Settings } from '../storage/settings';
import { SqlDb } from '../storage/sqlDb';
import { Aead, createAead, generateKey } from './aead';
import { base64, utf8 } from './bytes';

export interface KeyVault {
  get(): Promise<Uint8Array | null>;
  set(key: Uint8Array): Promise<void>;
}

export type KeyringResult = { status: 'ready'; aead: Aead } | { status: 'orphaned' };

const KEY_CHECK_PLAINTEXT = 'cardholder-key-check-v1';

export async function openKeyring(vault: KeyVault, settings: Settings): Promise<KeyringResult> {
  const check = await settings.get('keyCheck');
  let key = await vault.get();

  if (check === null) {
    if (!key) {
      key = generateKey();
      await vault.set(key);
    }
    const aead = createAead(key);
    await settings.set('keyCheck', base64.encode(aead.seal(utf8.encode(KEY_CHECK_PLAINTEXT))));
    return { status: 'ready', aead };
  }

  if (!key) return { status: 'orphaned' };
  try {
    const aead = createAead(key);
    if (utf8.decode(aead.open(base64.decode(check))) === KEY_CHECK_PLAINTEXT) return { status: 'ready', aead };
  } catch {
    // Wrong or corrupt key: fall through to orphaned.
  }
  return { status: 'orphaned' };
}

export async function startFresh(deps: {
  db: SqlDb;
  blobs: BlobStore;
  vault: KeyVault;
  settings: Settings;
}): Promise<Aead> {
  const { db, blobs, vault, settings } = deps;
  await db.execAsync('DELETE FROM cards; DELETE FROM settings;');
  for (const name of await blobs.list()) await blobs.remove(name);
  await vault.set(generateKey());
  const result = await openKeyring(vault, settings);
  if (result.status !== 'ready') throw new Error('Fresh keyring did not open');
  return result.aead;
}
```

- [ ] **Step 5: Run tests**

Run: `npx jest src/crypto`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/crypto/keyring.ts src/crypto/__tests__/keyring.test.ts test/memoryVault.ts
git commit -m "feat: device key with key-check and orphaned-data detection"
```

---

### Task 5: Card types, validation, dates and listing

**Files:**
- Create: `src/cards/types.ts`, `src/cards/validate.ts`, `src/time/dates.ts`, `src/cards/listing.ts`, `test/fixtures.ts`
- Test: `src/cards/__tests__/validate.test.ts`, `src/time/__tests__/dates.test.ts`, `src/cards/__tests__/listing.test.ts`

**Interfaces:**
- Consumes: `NAME_MAX_LENGTH`, `DAY_MS` (Task 1); `strings` (Task 1).
- Produces:
  - `CATEGORIES = ['id', 'insurance', 'membership', 'loyalty', 'other'] as const`, `type Category`
  - `interface CardFields { name: string; category: Category; number: string | null; notes: string | null; expiresOn: string | null /* YYYY-MM-DD */ }`
  - `interface CardImage { jpegBase64: string; aspect: number /* width / height */ }`
  - `interface FrontImage extends CardImage { thumbJpegBase64: string }`
  - `interface NewCardImages { front: FrontImage; back: CardImage | null }`
  - `interface ImageChanges { front?: FrontImage; back?: CardImage | null /* null = remove */ }`
  - `type ImageSide = 'front' | 'back' | 'thumb'`
  - `interface Card extends CardFields { id: string; pinned: boolean; position: number; hasBack: boolean; frontAspect: number; backAspect: number | null; createdAt: number; updatedAt: number }`
  - `type FieldError = 'name-required' | 'name-too-long' | 'bad-category' | 'bad-expiry'`
  - `interface RawCardFields { name?: unknown; category?: unknown; number?: unknown; notes?: unknown; expiresOn?: unknown }`
  - `validateCardFields(raw: RawCardFields): { ok: true; value: CardFields } | { ok: false; errors: FieldError[] }`
  - `parseIsoDate(s: string): { year: number; month: number; day: number } | null`, `isValidIsoDate(s: string): boolean`, `toIsoDate(d: Date): string`, `fromIsoDate(s: string): Date`, `formatAgo(then: number, now: number): string`, `formatDate(ms: number): string`
  - `sortCards(cards: Card[]): Card[]`, `splitPinned(sorted: Card[]): { pinned: Card[]; others: Card[] }`, `filterCards(cards: Card[], f: { query: string; category: Category | null }): Card[]`
  - Test helper: `makeCard(overrides?: Partial<Card>): Card`

- [ ] **Step 1: Write the failing tests**

`src/cards/__tests__/validate.test.ts`:

```ts
import { validateCardFields } from '../validate';

test('accepts a minimal card and normalises blanks to null', () => {
  expect(validateCardFields({ name: '  Gym  ', category: 'membership', number: ' ', notes: '', expiresOn: '' })).toEqual({
    ok: true,
    value: { name: 'Gym', category: 'membership', number: null, notes: null, expiresOn: null },
  });
});

test('keeps trimmed optional fields', () => {
  const result = validateCardFields({
    name: 'Emirates ID',
    category: 'id',
    number: ' 784-1990-1234567-1 ',
    notes: 'Renew at ICP',
    expiresOn: '2027-03-01',
  });
  expect(result).toEqual({
    ok: true,
    value: { name: 'Emirates ID', category: 'id', number: '784-1990-1234567-1', notes: 'Renew at ICP', expiresOn: '2027-03-01' },
  });
});

test('reports every problem at once', () => {
  expect(validateCardFields({ name: '   ', category: 'passport', expiresOn: '2027-02-30' })).toEqual({
    ok: false,
    errors: ['name-required', 'bad-category', 'bad-expiry'],
  });
});

test('name longer than 60 characters is rejected', () => {
  expect(validateCardFields({ name: 'x'.repeat(61), category: 'other' })).toEqual({ ok: false, errors: ['name-too-long'] });
  expect(validateCardFields({ name: 'x'.repeat(60), category: 'other' }).ok).toBe(true);
});

test('non-string input (e.g. from a tampered backup) is handled', () => {
  expect(validateCardFields({ name: 42, category: null, number: 7 })).toEqual({
    ok: false,
    errors: ['name-required', 'bad-category'],
  });
});
```

`src/time/__tests__/dates.test.ts`:

```ts
import { DAY_MS } from '../../config';
import { formatAgo, fromIsoDate, isValidIsoDate, parseIsoDate, toIsoDate } from '../dates';

test('parseIsoDate and isValidIsoDate', () => {
  expect(parseIsoDate('2027-01-05')).toEqual({ year: 2027, month: 1, day: 5 });
  expect(isValidIsoDate('2028-02-29')).toBe(true);
  expect(isValidIsoDate('2027-02-29')).toBe(false);
  expect(isValidIsoDate('2027-1-5')).toBe(false);
  expect(isValidIsoDate('yesterday')).toBe(false);
});

test('toIsoDate and fromIsoDate use local calendar days', () => {
  expect(toIsoDate(new Date(2027, 0, 5, 23, 30))).toBe('2027-01-05');
  const d = fromIsoDate('2027-12-31');
  expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 11, 31, 0]);
  expect(() => fromIsoDate('2027-13-01')).toThrow();
});

test('formatAgo', () => {
  const now = 1_800_000_000_000;
  expect(formatAgo(now - 60_000, now)).toBe('today');
  expect(formatAgo(now + 60_000, now)).toBe('today');
  expect(formatAgo(now - DAY_MS, now)).toBe('yesterday');
  expect(formatAgo(now - 5 * DAY_MS, now)).toBe('5 days ago');
  expect(formatAgo(now - 45 * DAY_MS, now)).toBe('1 month ago');
  expect(formatAgo(now - 95 * DAY_MS, now)).toBe('3 months ago');
  expect(formatAgo(now - 400 * DAY_MS, now)).toBe('1 year ago');
  expect(formatAgo(now - 800 * DAY_MS, now)).toBe('2 years ago');
});
```

`src/cards/__tests__/listing.test.ts`:

```ts
import { makeCard } from '../../../test/fixtures';
import { filterCards, sortCards, splitPinned } from '../listing';

const cards = [
  makeCard({ id: 'a', name: 'zoo pass', pinned: false }),
  makeCard({ id: 'b', name: 'Library', pinned: true, position: 1 }),
  makeCard({ id: 'c', name: 'Emirates ID', category: 'id', pinned: true, position: 0, number: '784 1990' }),
  makeCard({ id: 'd', name: 'Aster insurance', category: 'insurance', pinned: false }),
];

test('pinned by position first, then the rest alphabetically (case-insensitive)', () => {
  expect(sortCards(cards).map((c) => c.id)).toEqual(['c', 'b', 'd', 'a']);
});

test('splitPinned', () => {
  const { pinned, others } = splitPinned(sortCards(cards));
  expect(pinned.map((c) => c.id)).toEqual(['c', 'b']);
  expect(others.map((c) => c.id)).toEqual(['d', 'a']);
});

test('filter by name, case-insensitive', () => {
  expect(filterCards(cards, { query: 'LIB', category: null }).map((c) => c.id)).toEqual(['b']);
});

test('filter by card number ignoring spaces', () => {
  expect(filterCards(cards, { query: '7841990', category: null }).map((c) => c.id)).toEqual(['c']);
});

test('filter by category, combined with query', () => {
  expect(filterCards(cards, { query: '', category: 'insurance' }).map((c) => c.id)).toEqual(['d']);
  expect(filterCards(cards, { query: 'zoo', category: 'insurance' })).toEqual([]);
});

test('blank query and no category returns everything', () => {
  expect(filterCards(cards, { query: '  ', category: null })).toHaveLength(4);
});
```

- [ ] **Step 2: Run to make sure they fail**

Run: `npx jest src/cards src/time`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the card types**

`src/cards/types.ts`:

```ts
export const CATEGORIES = ['id', 'insurance', 'membership', 'loyalty', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CardFields {
  name: string;
  category: Category;
  number: string | null;
  notes: string | null;
  expiresOn: string | null; // YYYY-MM-DD, local calendar day
}

export interface CardImage {
  jpegBase64: string;
  aspect: number; // width / height
}

export interface FrontImage extends CardImage {
  thumbJpegBase64: string;
}

export interface NewCardImages {
  front: FrontImage;
  back: CardImage | null;
}

// Omitted key = unchanged. back: null removes the back image.
export interface ImageChanges {
  front?: FrontImage;
  back?: CardImage | null;
}

export type ImageSide = 'front' | 'back' | 'thumb';

export interface Card extends CardFields {
  id: string;
  pinned: boolean;
  position: number;
  hasBack: boolean;
  frontAspect: number;
  backAspect: number | null;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 4: Implement dates**

`src/time/dates.ts`:

```ts
import { DAY_MS } from '../config';
import { strings } from '../strings';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(s: string): { year: number; month: number; day: number } | null {
  const m = ISO_DATE.exec(s);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function isValidIsoDate(s: string): boolean {
  return parseIsoDate(s) !== null;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIsoDate(s: string): Date {
  const parts = parseIsoDate(s);
  if (!parts) throw new Error(`Invalid date: ${s}`);
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function formatAgo(then: number, now: number): string {
  const days = Math.floor(Math.max(0, now - then) / DAY_MS);
  if (days < 1) return strings.ago.today;
  if (days < 2) return strings.ago.yesterday;
  if (days < 30) return strings.ago.days(days);
  if (days < 365) return strings.ago.months(Math.floor(days / 30));
  return strings.ago.years(Math.floor(days / 365));
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
```

- [ ] **Step 5: Implement validation**

`src/cards/validate.ts`:

```ts
import { NAME_MAX_LENGTH } from '../config';
import { isValidIsoDate } from '../time/dates';
import { CardFields, CATEGORIES } from './types';

export type FieldError = 'name-required' | 'name-too-long' | 'bad-category' | 'bad-expiry';

// Unknown-typed so the same check guards both the edit form and untrusted backup files.
export interface RawCardFields {
  name?: unknown;
  category?: unknown;
  number?: unknown;
  notes?: unknown;
  expiresOn?: unknown;
}

export type CardValidation = { ok: true; value: CardFields } | { ok: false; errors: FieldError[] };

function optionalText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

export function validateCardFields(raw: RawCardFields): CardValidation {
  const errors: FieldError[] = [];

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (name === '') errors.push('name-required');
  else if ([...name].length > NAME_MAX_LENGTH) errors.push('name-too-long');

  const category = CATEGORIES.find((c) => c === raw.category);
  if (!category) errors.push('bad-category');

  const expiresOn = optionalText(raw.expiresOn);
  if (expiresOn !== null && !isValidIsoDate(expiresOn)) errors.push('bad-expiry');

  if (errors.length > 0 || !category) return { ok: false, errors };
  return {
    ok: true,
    value: { name, category, number: optionalText(raw.number), notes: optionalText(raw.notes), expiresOn },
  };
}
```

- [ ] **Step 6: Implement listing**

`src/cards/listing.ts`:

```ts
import { Card, Category } from './types';

const byName = (a: Card, b: Card) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

export function sortCards(cards: Card[]): Card[] {
  const pinned = cards.filter((c) => c.pinned).sort((a, b) => a.position - b.position || byName(a, b));
  const others = cards.filter((c) => !c.pinned).sort(byName);
  return [...pinned, ...others];
}

export function splitPinned(sorted: Card[]): { pinned: Card[]; others: Card[] } {
  return { pinned: sorted.filter((c) => c.pinned), others: sorted.filter((c) => !c.pinned) };
}

const compact = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function filterCards(cards: Card[], filter: { query: string; category: Category | null }): Card[] {
  const query = filter.query.trim().toLowerCase();
  return cards.filter((card) => {
    if (filter.category && card.category !== filter.category) return false;
    if (query === '') return true;
    return card.name.toLowerCase().includes(query) || compact(card.number ?? '').includes(compact(query));
  });
}
```

- [ ] **Step 7: Add the card fixture helper**

`test/fixtures.ts`:

```ts
import { Card } from '../src/cards/types';

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card1',
    name: 'Gym',
    category: 'membership',
    number: null,
    notes: null,
    expiresOn: null,
    pinned: true,
    position: 0,
    hasBack: false,
    frontAspect: 1.586,
    backAspect: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}
```

- [ ] **Step 8: Run tests and typecheck**

Run: `npx jest src/cards src/time && npm run typecheck`
Expected: all PASS; `tsc` exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/cards src/time test/fixtures.ts
git commit -m "feat: card types, field validation, dates and list ordering"
```

---

### Task 6: Encrypted card store

**Files:**
- Create: `src/cards/cardStore.ts`
- Modify: `test/fixtures.ts` (full replacement below)
- Test: `src/cards/__tests__/cardStore.test.ts`

**Interfaces:**
- Consumes: `Aead`, `createAead`, `generateKey` (Task 2); `base64`, `utf8`, `toHex`, `engine` (Task 2); `SqlDb`, `migrate`, `BlobStore` (Task 3); `Card`, `CardFields`, `CardImage`, `FrontImage`, `NewCardImages`, `ImageChanges`, `ImageSide` (Task 5); `sortCards` (Task 5).
- Produces:
  - `class CardNotFoundError extends Error`
  - `interface ImportEntry { card: Card; images: NewCardImages }`
  - `blobName(id: string, side: ImageSide): string` → `"<id>.<side>"`
  - `interface CardStore {`
    - `list(): Promise<Card[]>` — sorted with `sortCards`; rows that fail to decrypt are skipped with a `console.warn`
    - `ids(): Promise<string[]>`
    - `get(id: string): Promise<Card | null>`
    - `count(): Promise<number>`
    - `lastChangeAt(): Promise<number | null>` — max `updatedAt`
    - `loadImage(id: string, side: ImageSide): Promise<string | null>` — decrypted JPEG as base64
    - `create(fields: CardFields, images: NewCardImages): Promise<Card>` — new cards are pinned, appended to the pinned order
    - `update(id: string, fields: CardFields, changes?: ImageChanges): Promise<Card>` — throws `CardNotFoundError`
    - `remove(id: string): Promise<void>` — deletes row and all three blobs
    - `setPinned(id: string, pinned: boolean): Promise<void>` — pinning appends to the end; no-op if unchanged
    - `reorderPinned(orderedIds: string[]): Promise<void>`
    - `insertMany(entries: ImportEntry[], options: { replace: boolean }): Promise<void>` — keeps ids/timestamps; imported pinned cards are appended after existing pinned cards in their original relative order; all row changes happen in one transaction
  - `}`
  - `createCardStore(deps: { db: SqlDb; blobs: BlobStore; aead: Aead; now?: () => number; newId?: () => string }): CardStore`
  - Test helpers in `test/fixtures.ts`: `makeStore()`, `fields()`, `image()`, `frontImage()`, `images()`, `importEntry()`

Storage layout: each row holds `id`, `pinned`, `position`, timestamps and `payload` = AES-GCM-sealed JSON of every other card field. Images are sealed raw JPEG bytes in the blob store under `<id>.front`, `<id>.back`, `<id>.thumb`.

- [ ] **Step 1: Replace the fixtures file**

`test/fixtures.ts`:

```ts
import { createAead, generateKey } from '../src/crypto/aead';
import { base64, utf8 } from '../src/crypto/bytes';
import { createCardStore, ImportEntry } from '../src/cards/cardStore';
import { Card, CardFields, CardImage, FrontImage, NewCardImages } from '../src/cards/types';
import { migrate } from '../src/storage/sqlDb';
import { createMemoryBlobStore } from './memoryBlobStore';
import { memoryDb } from './memoryDb';

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card1',
    name: 'Gym',
    category: 'membership',
    number: null,
    notes: null,
    expiresOn: null,
    pinned: true,
    position: 0,
    hasBack: false,
    frontAspect: 1.586,
    backAspect: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

export function fields(overrides: Partial<CardFields> = {}): CardFields {
  return { name: 'Gym', category: 'membership', number: null, notes: null, expiresOn: null, ...overrides };
}

// Fake "JPEGs": readable markers so tests can check what came back and that nothing leaks.
export function image(marker: string, aspect = 1.586): CardImage {
  return { jpegBase64: base64.encode(utf8.encode(`JPEG:${marker}`)), aspect };
}

export function frontImage(marker: string, aspect = 1.586): FrontImage {
  return { ...image(marker, aspect), thumbJpegBase64: base64.encode(utf8.encode(`THUMB:${marker}`)) };
}

export function images(marker: string, withBack = false): NewCardImages {
  return { front: frontImage(marker), back: withBack ? image(`${marker}-back`) : null };
}

export function importEntry(id: string, overrides: Partial<Card> = {}, withBack = false): ImportEntry {
  return {
    card: makeCard({ id, ...overrides, hasBack: withBack, backAspect: withBack ? 1.586 : null }),
    images: images(id, withBack),
  };
}

export async function makeStore() {
  const db = memoryDb();
  await migrate(db);
  const blobs = createMemoryBlobStore();
  let clock = 1_000_000;
  let nextId = 0;
  const store = createCardStore({
    db,
    blobs,
    aead: createAead(generateKey()),
    now: () => (clock += 1_000),
    newId: () => `card${++nextId}`,
  });
  return { db, blobs, store };
}
```

- [ ] **Step 2: Write the failing tests**

`src/cards/__tests__/cardStore.test.ts`:

```ts
import { fields, frontImage, image, images, importEntry, makeStore } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { CardNotFoundError } from '../cardStore';

const text = (b64: string | null) => (b64 === null ? null : utf8.decode(base64.decode(b64)));
const INSERT =
  'INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';

test('create stores fields, pins the card and appends it to the pinned order', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields({ name: 'Emirates ID', category: 'id' }), images('a'));
  const b = await store.create(fields({ name: 'Gym' }), images('b', true));
  expect(a).toMatchObject({ id: 'card1', name: 'Emirates ID', category: 'id', pinned: true, position: 0, hasBack: false, backAspect: null });
  expect(b).toMatchObject({ id: 'card2', pinned: true, position: 1, hasBack: true, backAspect: 1.586 });
  expect(await store.get('card1')).toEqual(a);
  expect(await store.count()).toBe(2);
  expect((await store.ids()).sort()).toEqual(['card1', 'card2']);
});

test('images round-trip per side', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  expect(text(await store.loadImage(card.id, 'front'))).toBe('JPEG:x');
  expect(text(await store.loadImage(card.id, 'thumb'))).toBe('THUMB:x');
  expect(text(await store.loadImage(card.id, 'back'))).toBe('JPEG:x-back');
});

test('a card without a back has no back image', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('x'));
  expect(await store.loadImage(card.id, 'back')).toBeNull();
});

test('nothing readable is stored in plaintext', async () => {
  const { store, db, blobs } = await makeStore();
  await store.create(fields({ name: 'Emirates ID', number: '784-1990' }), images('secret', true));
  const row = await db.getFirstAsync<{ payload: Uint8Array }>('SELECT payload FROM cards', []);
  const payloadText = utf8.decode(row!.payload);
  expect(payloadText).not.toContain('Emirates');
  expect(payloadText).not.toContain('784-1990');
  expect(blobs.raw.size).toBe(3);
  for (const bytes of blobs.raw.values()) expect(utf8.decode(bytes)).not.toContain('secret');
});

test('update changes fields and images and bumps updatedAt', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('old', true));
  const updated = await store.update(card.id, fields({ name: 'Gold Gym', expiresOn: '2027-05-01' }), {
    front: frontImage('new', 0.7),
  });
  expect(updated).toMatchObject({ name: 'Gold Gym', expiresOn: '2027-05-01', frontAspect: 0.7, hasBack: true });
  expect(updated.updatedAt).toBeGreaterThan(card.updatedAt);
  expect(text(await store.loadImage(card.id, 'front'))).toBe('JPEG:new');
  expect(text(await store.loadImage(card.id, 'thumb'))).toBe('THUMB:new');
  expect(text(await store.loadImage(card.id, 'back'))).toBe('JPEG:old-back');
  expect(await store.get(card.id)).toEqual(updated);
});

test('update with back: null removes the back image', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  const updated = await store.update(card.id, fields(), { back: null });
  expect(updated).toMatchObject({ hasBack: false, backAspect: null });
  expect(blobs.raw.has(`${card.id}.back`)).toBe(false);
});

test('update can add a back image', async () => {
  const { store } = await makeStore();
  const card = await store.create(fields(), images('x'));
  const updated = await store.update(card.id, fields(), { back: image('added', 1.5) });
  expect(updated).toMatchObject({ hasBack: true, backAspect: 1.5 });
  expect(text(await store.loadImage(card.id, 'back'))).toBe('JPEG:added');
});

test('update of a missing card throws CardNotFoundError', async () => {
  const { store } = await makeStore();
  await expect(store.update('nope', fields())).rejects.toBeInstanceOf(CardNotFoundError);
});

test('remove deletes the row and every image immediately', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  await store.remove(card.id);
  expect(await store.get(card.id)).toBeNull();
  expect(await store.count()).toBe(0);
  expect(blobs.raw.size).toBe(0);
});

test('unpinned cards sort alphabetically after pinned; re-pinning appends to the end', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields({ name: 'B card' }), images('a'));
  const b = await store.create(fields({ name: 'A card' }), images('b'));
  const c = await store.create(fields({ name: 'C card' }), images('c'));
  await store.setPinned(a.id, false);
  await store.setPinned(b.id, false);
  expect((await store.list()).map((x) => x.id)).toEqual([c.id, b.id, a.id]);
  await store.setPinned(a.id, true);
  expect((await store.list()).map((x) => x.id)).toEqual([c.id, a.id, b.id]);
});

test('setPinned to the current state does not move the card', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields(), images('a'));
  await store.create(fields(), images('b'));
  await store.setPinned(a.id, true);
  expect((await store.get(a.id))!.position).toBe(0);
});

test('reorderPinned sets the pinned order', async () => {
  const { store } = await makeStore();
  const a = await store.create(fields(), images('a'));
  const b = await store.create(fields(), images('b'));
  const c = await store.create(fields(), images('c'));
  await store.reorderPinned([c.id, a.id, b.id]);
  expect((await store.list()).map((x) => x.id)).toEqual([c.id, a.id, b.id]);
});

test('lastChangeAt follows the latest create or update', async () => {
  const { store } = await makeStore();
  expect(await store.lastChangeAt()).toBeNull();
  const card = await store.create(fields(), images('a'));
  expect(await store.lastChangeAt()).toBe(card.updatedAt);
  const updated = await store.update(card.id, fields({ name: 'New' }));
  expect(await store.lastChangeAt()).toBe(updated.updatedAt);
});

test('list skips rows that cannot be decrypted', async () => {
  const { store, db } = await makeStore();
  const good = await store.create(fields(), images('x'));
  await db.runAsync(INSERT, ['broken', 1, 5, new Uint8Array([1, 2, 3]), 1, 1]);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect((await store.list()).map((c) => c.id)).toEqual([good.id]);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

describe('insertMany', () => {
  test('merge appends imported pinned cards after existing ones, in their own order', async () => {
    const { store } = await makeStore();
    const a = await store.create(fields({ name: 'Mine A' }), images('a'));
    const b = await store.create(fields({ name: 'Mine B' }), images('b'));
    await store.insertMany(
      [
        importEntry('imp1', { name: 'Imported 1', pinned: true, position: 5 }),
        importEntry('imp2', { name: 'Imported 2', pinned: true, position: 2 }, true),
        importEntry('imp3', { name: 'Imported 3', pinned: false, position: 0 }),
      ],
      { replace: false },
    );
    expect((await store.list()).map((c) => c.id)).toEqual([a.id, b.id, 'imp2', 'imp1', 'imp3']);
    expect(text(await store.loadImage('imp2', 'back'))).toBe('JPEG:imp2-back');
    expect((await store.get('imp1'))!.createdAt).toBe(1_000);
  });

  test('replace removes previous cards and their images', async () => {
    const { store, blobs } = await makeStore();
    const old = await store.create(fields(), images('old', true));
    await store.insertMany([importEntry('imp1')], { replace: true });
    expect(await store.ids()).toEqual(['imp1']);
    expect([...blobs.raw.keys()].filter((k) => k.startsWith(old.id))).toEqual([]);
    expect((await store.get('imp1'))!.position).toBe(0);
  });

  test('a failed replace leaves existing cards untouched', async () => {
    const { store } = await makeStore();
    const keep = await store.create(fields({ name: 'Keep me' }), images('keep', true));
    // Duplicate ids make the second INSERT fail inside the transaction.
    await expect(
      store.insertMany([importEntry('dup'), importEntry('dup')], { replace: true }),
    ).rejects.toThrow();
    expect((await store.list()).map((c) => c.name)).toEqual(['Keep me']);
    expect(text(await store.loadImage(keep.id, 'front'))).toBe('JPEG:keep');
    expect(text(await store.loadImage(keep.id, 'back'))).toBe('JPEG:keep-back');
  });
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/cards/__tests__/cardStore.test.ts`
Expected: FAIL — `Cannot find module '../src/cards/cardStore'`.

- [ ] **Step 4: Implement the card store**

`src/cards/cardStore.ts`:

```ts
import { Aead } from '../crypto/aead';
import { base64, toHex, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';
import { BlobStore } from '../storage/blobStore';
import { SqlDb } from '../storage/sqlDb';
import { sortCards } from './listing';
import { Card, CardFields, ImageChanges, ImageSide, NewCardImages } from './types';

export class CardNotFoundError extends Error {
  constructor(id: string) {
    super(`Card ${id} not found`);
    this.name = 'CardNotFoundError';
  }
}

export interface ImportEntry {
  card: Card;
  images: NewCardImages;
}

export interface CardStore {
  list(): Promise<Card[]>;
  ids(): Promise<string[]>;
  get(id: string): Promise<Card | null>;
  count(): Promise<number>;
  lastChangeAt(): Promise<number | null>;
  loadImage(id: string, side: ImageSide): Promise<string | null>;
  create(fields: CardFields, images: NewCardImages): Promise<Card>;
  update(id: string, fields: CardFields, changes?: ImageChanges): Promise<Card>;
  remove(id: string): Promise<void>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  reorderPinned(orderedIds: string[]): Promise<void>;
  insertMany(entries: ImportEntry[], options: { replace: boolean }): Promise<void>;
}

export interface CardStoreDeps {
  db: SqlDb;
  blobs: BlobStore;
  aead: Aead;
  now?: () => number;
  newId?: () => string;
}

interface Row {
  id: string;
  pinned: number;
  position: number;
  payload: Uint8Array;
  created_at: number;
  updated_at: number;
}

// Everything about a card except what SQL needs for ordering is sealed in the payload.
type Payload = Omit<Card, 'id' | 'pinned' | 'position' | 'createdAt' | 'updatedAt'>;

const SIDES: ImageSide[] = ['front', 'back', 'thumb'];
const INSERT_SQL =
  'INSERT INTO cards (id, pinned, position, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';

export const blobName = (id: string, side: ImageSide) => `${id}.${side}`;

export function createCardStore({
  db,
  blobs,
  aead,
  now = Date.now,
  newId = () => toHex(engine.randomBytes(16)),
}: CardStoreDeps): CardStore {
  const seal = (card: Card): Uint8Array => {
    const payload: Payload = {
      name: card.name,
      category: card.category,
      number: card.number,
      notes: card.notes,
      expiresOn: card.expiresOn,
      hasBack: card.hasBack,
      frontAspect: card.frontAspect,
      backAspect: card.backAspect,
    };
    return aead.seal(utf8.encode(JSON.stringify(payload)));
  };

  const toCard = (row: Row): Card => {
    const payload = JSON.parse(utf8.decode(aead.open(row.payload))) as Payload;
    return {
      ...payload,
      id: row.id,
      pinned: row.pinned === 1,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  const getRow = (id: string) => db.getFirstAsync<Row>('SELECT * FROM cards WHERE id = ?', [id]);

  const putImage = (id: string, side: ImageSide, jpegBase64: string) =>
    blobs.put(blobName(id, side), aead.seal(base64.decode(jpegBase64)));

  const removeImages = async (id: string) => {
    for (const side of SIDES) await blobs.remove(blobName(id, side));
  };

  const writeImages = async (id: string, images: NewCardImages) => {
    await putImage(id, 'front', images.front.jpegBase64);
    await putImage(id, 'thumb', images.front.thumbJpegBase64);
    if (images.back) await putImage(id, 'back', images.back.jpegBase64);
    else await blobs.remove(blobName(id, 'back'));
  };

  const nextPinnedPosition = async () =>
    (
      await db.getFirstAsync<{ next: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE pinned = 1',
        [],
      )
    )?.next ?? 0;

  const ids = async () => (await db.getAllAsync<{ id: string }>('SELECT id FROM cards', [])).map((r) => r.id);

  return {
    async list() {
      const rows = await db.getAllAsync<Row>('SELECT * FROM cards', []);
      const cards: Card[] = [];
      for (const row of rows) {
        try {
          cards.push(toCard(row));
        } catch {
          console.warn(`Skipping unreadable card ${row.id}`);
        }
      }
      return sortCards(cards);
    },

    ids,

    async get(id) {
      const row = await getRow(id);
      return row ? toCard(row) : null;
    },

    async count() {
      return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM cards', []))?.n ?? 0;
    },

    async lastChangeAt() {
      return (await db.getFirstAsync<{ t: number | null }>('SELECT MAX(updated_at) AS t FROM cards', []))?.t ?? null;
    },

    async loadImage(id, side) {
      const sealed = await blobs.get(blobName(id, side));
      return sealed ? base64.encode(aead.open(sealed)) : null;
    },

    async create(fields, images) {
      const id = newId();
      const t = now();
      await writeImages(id, images);
      const card: Card = {
        ...fields,
        id,
        pinned: true,
        position: await nextPinnedPosition(),
        hasBack: images.back !== null,
        frontAspect: images.front.aspect,
        backAspect: images.back?.aspect ?? null,
        createdAt: t,
        updatedAt: t,
      };
      await db.runAsync(INSERT_SQL, [card.id, 1, card.position, seal(card), t, t]);
      return card;
    },

    async update(id, fields, changes = {}) {
      const row = await getRow(id);
      if (!row) throw new CardNotFoundError(id);
      const current = toCard(row);
      if (changes.front) {
        await putImage(id, 'front', changes.front.jpegBase64);
        await putImage(id, 'thumb', changes.front.thumbJpegBase64);
      }
      if (changes.back) await putImage(id, 'back', changes.back.jpegBase64);
      else if (changes.back === null) await blobs.remove(blobName(id, 'back'));

      const backChanged = changes.back !== undefined;
      const next: Card = {
        ...current,
        ...fields,
        frontAspect: changes.front?.aspect ?? current.frontAspect,
        hasBack: backChanged ? changes.back !== null : current.hasBack,
        backAspect: backChanged ? (changes.back?.aspect ?? null) : current.backAspect,
        // Strictly increasing so image caches keyed on updatedAt never serve a stale picture.
        updatedAt: Math.max(now(), current.updatedAt + 1),
      };
      await db.runAsync('UPDATE cards SET payload = ?, updated_at = ? WHERE id = ?', [seal(next), next.updatedAt, id]);
      return next;
    },

    async remove(id) {
      await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
      await removeImages(id);
    },

    async setPinned(id, pinned) {
      const row = await getRow(id);
      if (!row) throw new CardNotFoundError(id);
      if ((row.pinned === 1) === pinned) return;
      const position = pinned ? await nextPinnedPosition() : 0;
      await db.runAsync('UPDATE cards SET pinned = ?, position = ? WHERE id = ?', [pinned ? 1 : 0, position, id]);
    },

    async reorderPinned(orderedIds) {
      await db.withTransactionAsync(async () => {
        for (const [index, id] of orderedIds.entries()) {
          await db.runAsync('UPDATE cards SET position = ? WHERE id = ? AND pinned = 1', [index, id]);
        }
      });
    },

    async insertMany(entries, { replace }) {
      const previousIds = replace ? await ids() : [];
      for (const { card, images } of entries) await writeImages(card.id, images);

      let position = replace ? 0 : await nextPinnedPosition();
      const pinnedInOrder = entries.filter((e) => e.card.pinned).sort((a, b) => a.card.position - b.card.position);
      const positions = new Map(pinnedInOrder.map((e) => [e.card.id, position++] as const));

      await db.withTransactionAsync(async () => {
        if (replace) await db.runAsync('DELETE FROM cards', []);
        for (const { card } of entries) {
          const stored: Card = { ...card, position: positions.get(card.id) ?? 0 };
          await db.runAsync(INSERT_SQL, [
            stored.id,
            stored.pinned ? 1 : 0,
            stored.position,
            seal(stored),
            stored.createdAt,
            stored.updatedAt,
          ]);
        }
      });

      if (replace) {
        const kept = new Set(entries.map((e) => e.card.id));
        for (const id of previousIds) if (!kept.has(id)) await removeImages(id);
      }
    },
  };
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx jest src/cards && npm run typecheck`
Expected: all PASS; `tsc` exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/cards/cardStore.ts src/cards/__tests__/cardStore.test.ts test/fixtures.ts
git commit -m "feat: encrypted card store with pinning and atomic bulk import"
```

---

### Task 7: Free limit, unlock flag and backup nudge

**Files:**
- Create: `src/purchases/limits.ts`, `src/purchases/entitlement.ts`, `src/backup/nudge.ts`
- Test: `src/purchases/__tests__/limits.test.ts`, `src/backup/__tests__/nudge.test.ts`

**Interfaces:**
- Consumes: `FREE_CARD_LIMIT`, `BACKUP_STALE_MS`, `BACKUP_SNOOZE_MS` (Task 1); `Settings` (Task 3); `CardStore` (Task 6).
- Produces:
  - `canAddCard(cardCount: number, unlocked: boolean): boolean`
  - `isUnlocked(settings: Settings): Promise<boolean>`, `markUnlocked(settings: Settings): Promise<void>`
  - `interface NudgeInput { cardCount: number; lastChangeAt: number | null; lastExportAt: number | null; snoozedUntil: number | null; now: number }`
  - `shouldNudgeBackup(input: NudgeInput): boolean`
  - `readNudgeInput(store: CardStore, settings: Settings, now: number): Promise<NudgeInput>`
  - `snoozeBackupNudge(settings: Settings, now: number): Promise<void>`
  - `recordExport(settings: Settings, at: number): Promise<void>` — sets `lastExportAt`, clears the snooze

Nudge rule (from the spec): show when there is at least one card and not snoozed, and either the user has never exported, or there are changes since the last export *and* that export is older than 30 days. Dismiss snoozes for 7 days.

- [ ] **Step 1: Write the failing tests**

`src/purchases/__tests__/limits.test.ts`:

```ts
import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { isUnlocked, markUnlocked } from '../entitlement';
import { canAddCard } from '../limits';

test('free users can add until they have 4 cards', () => {
  expect(canAddCard(0, false)).toBe(true);
  expect(canAddCard(3, false)).toBe(true);
  expect(canAddCard(4, false)).toBe(false);
  expect(canAddCard(9, false)).toBe(false); // over the limit after an import: still blocked from adding
});

test('unlocked users can always add', () => {
  expect(canAddCard(500, true)).toBe(true);
});

test('unlock flag defaults to locked and persists', async () => {
  const db = memoryDb();
  await migrate(db);
  const settings = createSettings(db);
  expect(await isUnlocked(settings)).toBe(false);
  await markUnlocked(settings);
  expect(await isUnlocked(createSettings(db))).toBe(true);
});
```

`src/backup/__tests__/nudge.test.ts`:

```ts
import { fields, images, makeStore } from '../../../test/fixtures';
import { BACKUP_SNOOZE_MS, BACKUP_STALE_MS } from '../../config';
import { createSettings } from '../../storage/settings';
import { readNudgeInput, recordExport, shouldNudgeBackup, snoozeBackupNudge } from '../nudge';

const now = 10_000_000_000;
const base = { cardCount: 1, lastChangeAt: now - 1_000, lastExportAt: null, snoozedUntil: null, now };

test('no cards, no nudge', () => {
  expect(shouldNudgeBackup({ ...base, cardCount: 0 })).toBe(false);
});

test('never exported → nudge', () => {
  expect(shouldNudgeBackup(base)).toBe(true);
});

test('snoozed → no nudge until the snooze ends', () => {
  expect(shouldNudgeBackup({ ...base, snoozedUntil: now + 1 })).toBe(false);
  expect(shouldNudgeBackup({ ...base, snoozedUntil: now - 1 })).toBe(true);
});

test('recent export → no nudge even with changes', () => {
  expect(shouldNudgeBackup({ ...base, lastExportAt: now - BACKUP_STALE_MS + 1_000, lastChangeAt: now })).toBe(false);
});

test('old export with changes since → nudge', () => {
  const lastExportAt = now - BACKUP_STALE_MS - 1_000;
  expect(shouldNudgeBackup({ ...base, lastExportAt, lastChangeAt: lastExportAt + 1 })).toBe(true);
});

test('old export with no changes since → no nudge', () => {
  const lastExportAt = now - BACKUP_STALE_MS - 1_000;
  expect(shouldNudgeBackup({ ...base, lastExportAt, lastChangeAt: lastExportAt - 1 })).toBe(false);
});

test('readNudgeInput, snooze and recordExport work against real storage', async () => {
  const { db, store } = await makeStore();
  const settings = createSettings(db);
  const card = await store.create(fields(), images('a'));

  expect(await readNudgeInput(store, settings, now)).toEqual({
    cardCount: 1,
    lastChangeAt: card.updatedAt,
    lastExportAt: null,
    snoozedUntil: null,
    now,
  });

  await snoozeBackupNudge(settings, now);
  expect((await readNudgeInput(store, settings, now)).snoozedUntil).toBe(now + BACKUP_SNOOZE_MS);

  await recordExport(settings, now);
  const after = await readNudgeInput(store, settings, now);
  expect(after.lastExportAt).toBe(now);
  expect(after.snoozedUntil).toBeNull();
});
```

- [ ] **Step 2: Run to make sure they fail**

Run: `npx jest src/purchases src/backup`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement limits and entitlement**

`src/purchases/limits.ts`:

```ts
import { FREE_CARD_LIMIT } from '../config';

// Gates adding only. Existing cards are never locked, even above the limit.
export function canAddCard(cardCount: number, unlocked: boolean): boolean {
  return unlocked || cardCount < FREE_CARD_LIMIT;
}
```

`src/purchases/entitlement.ts`:

```ts
import { Settings } from '../storage/settings';

export async function isUnlocked(settings: Settings): Promise<boolean> {
  return (await settings.get('unlocked')) === '1';
}

export async function markUnlocked(settings: Settings): Promise<void> {
  await settings.set('unlocked', '1');
}
```

- [ ] **Step 4: Implement the nudge**

`src/backup/nudge.ts`:

```ts
import { CardStore } from '../cards/cardStore';
import { BACKUP_SNOOZE_MS, BACKUP_STALE_MS } from '../config';
import { Settings } from '../storage/settings';

export interface NudgeInput {
  cardCount: number;
  lastChangeAt: number | null;
  lastExportAt: number | null;
  snoozedUntil: number | null;
  now: number;
}

export function shouldNudgeBackup(input: NudgeInput): boolean {
  const { cardCount, lastChangeAt, lastExportAt, snoozedUntil, now } = input;
  if (cardCount === 0) return false;
  if (snoozedUntil !== null && now < snoozedUntil) return false;
  if (lastExportAt === null) return true;
  const changedSinceExport = lastChangeAt !== null && lastChangeAt > lastExportAt;
  return changedSinceExport && now - lastExportAt > BACKUP_STALE_MS;
}

export async function readNudgeInput(store: CardStore, settings: Settings, now: number): Promise<NudgeInput> {
  return {
    cardCount: await store.count(),
    lastChangeAt: await store.lastChangeAt(),
    lastExportAt: await settings.getNumber('lastExportAt'),
    snoozedUntil: await settings.getNumber('backupSnoozedUntil'),
    now,
  };
}

export async function snoozeBackupNudge(settings: Settings, now: number): Promise<void> {
  await settings.set('backupSnoozedUntil', String(now + BACKUP_SNOOZE_MS));
}

export async function recordExport(settings: Settings, at: number): Promise<void> {
  await settings.set('lastExportAt', String(at));
  await settings.remove('backupSnoozedUntil');
}
```

- [ ] **Step 5: Run tests**

Run: `npx jest src/purchases src/backup`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/purchases src/backup
git commit -m "feat: free-card limit, unlock flag and backup nudge rules"
```

---

### Task 8: Backup file format and passphrase rules

**Files:**
- Create: `src/backup/backupFile.ts`, `src/backup/passphrase.ts`
- Modify: `test/fixtures.ts` (add `backupSnapshot`, full replacement below)
- Test: `src/backup/__tests__/backupFile.test.ts`, `src/backup/__tests__/passphrase.test.ts`

**Interfaces:**
- Consumes: `engine` (Task 2); `createAead` (Task 2); `concat`, `utf8` (Task 2); `PBKDF2_ITERATIONS`, `MIN_PASSPHRASE_LENGTH` (Task 1); `validateCardFields` (Task 5); `Card`, `CardImage` (Task 5); `ImportEntry` (Task 6).
- Produces:
  - `type BackupCard = ImportEntry`
  - `interface BackupSnapshot { formatVersion: 1; exportedAt: number; cards: BackupCard[] }`
  - `type BackupErrorCode = 'not-a-backup' | 'unsupported-version' | 'wrong-passphrase-or-damaged' | 'invalid-contents'`
  - `class BackupError extends Error { code: BackupErrorCode }`
  - `encodeBackup(snapshot: BackupSnapshot, passphrase: string, options?: { iterations?: number }): Promise<Uint8Array>`
  - `decodeBackup(bytes: Uint8Array, passphrase: string): Promise<BackupSnapshot>` — always validates via `parseSnapshot`
  - `parseSnapshot(value: unknown): BackupSnapshot` — throws `BackupError('invalid-contents')`
  - `type PassphraseProblem = 'too-short' | 'mismatch'`, `validateNewPassphrase(passphrase: string, confirmation: string): PassphraseProblem | null`

File layout (`.cardholder`):

| bytes | content |
|---|---|
| 0–3 | ASCII `CHBK` |
| 4 | format version = 1 |
| 5–8 | PBKDF2 iterations, uint32 big-endian |
| 9–24 | 16-byte salt |
| 25… | AES-256-GCM sealed JSON (`[1][iv 12][ciphertext][tag 16]`, same as Task 2) |

The passphrase is NFC-normalised before key derivation so "café" typed on iOS and Android derive the same key.

- [ ] **Step 1: Replace the fixtures file**

`test/fixtures.ts` — identical to Task 6's version plus `backupSnapshot` and its import. Full file:

```ts
import { BackupSnapshot } from '../src/backup/backupFile';
import { createAead, generateKey } from '../src/crypto/aead';
import { base64, utf8 } from '../src/crypto/bytes';
import { createCardStore, ImportEntry } from '../src/cards/cardStore';
import { Card, CardFields, CardImage, FrontImage, NewCardImages } from '../src/cards/types';
import { migrate } from '../src/storage/sqlDb';
import { createMemoryBlobStore } from './memoryBlobStore';
import { memoryDb } from './memoryDb';

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card1',
    name: 'Gym',
    category: 'membership',
    number: null,
    notes: null,
    expiresOn: null,
    pinned: true,
    position: 0,
    hasBack: false,
    frontAspect: 1.586,
    backAspect: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

export function fields(overrides: Partial<CardFields> = {}): CardFields {
  return { name: 'Gym', category: 'membership', number: null, notes: null, expiresOn: null, ...overrides };
}

// Fake "JPEGs": readable markers so tests can check what came back and that nothing leaks.
export function image(marker: string, aspect = 1.586): CardImage {
  return { jpegBase64: base64.encode(utf8.encode(`JPEG:${marker}`)), aspect };
}

export function frontImage(marker: string, aspect = 1.586): FrontImage {
  return { ...image(marker, aspect), thumbJpegBase64: base64.encode(utf8.encode(`THUMB:${marker}`)) };
}

export function images(marker: string, withBack = false): NewCardImages {
  return { front: frontImage(marker), back: withBack ? image(`${marker}-back`) : null };
}

export function importEntry(id: string, overrides: Partial<Card> = {}, withBack = false): ImportEntry {
  return {
    card: makeCard({ id, ...overrides, hasBack: withBack, backAspect: withBack ? 1.586 : null }),
    images: images(id, withBack),
  };
}

export function backupSnapshot(): BackupSnapshot {
  return {
    formatVersion: 1,
    exportedAt: 1_700_000_000_000,
    cards: [
      importEntry('card1', { name: 'Emirates ID', category: 'id', expiresOn: '2027-03-01', number: '784' }),
      importEntry('card2', { name: 'Gym', pinned: false, position: 0, notes: 'Locker 12' }, true),
    ],
  };
}

export async function makeStore() {
  const db = memoryDb();
  await migrate(db);
  const blobs = createMemoryBlobStore();
  let clock = 1_000_000;
  let nextId = 0;
  const store = createCardStore({
    db,
    blobs,
    aead: createAead(generateKey()),
    now: () => (clock += 1_000),
    newId: () => `card${++nextId}`,
  });
  return { db, blobs, store };
}
```

- [ ] **Step 2: Write the failing tests**

`src/backup/__tests__/passphrase.test.ts`:

```ts
import { validateNewPassphrase } from '../passphrase';

test('passphrase rules', () => {
  expect(validateNewPassphrase('short', 'short')).toBe('too-short');
  expect(validateNewPassphrase('long enough', 'long enoug')).toBe('mismatch');
  expect(validateNewPassphrase('long enough', 'long enough')).toBeNull();
  expect(validateNewPassphrase('🔑🔑🔑🔑🔑🔑🔑🔑', '🔑🔑🔑🔑🔑🔑🔑🔑')).toBeNull(); // 8 characters, 16 UTF-16 units
});
```

`src/backup/__tests__/backupFile.test.ts`:

```ts
import { backupSnapshot } from '../../../test/fixtures';
import { utf8 } from '../../crypto/bytes';
import { BackupError, BackupErrorCode, decodeBackup, encodeBackup, parseSnapshot } from '../backupFile';

const FAST = { iterations: 1_000 };

async function codeOf(promise: Promise<unknown>): Promise<BackupErrorCode | 'resolved' | 'other'> {
  try {
    await promise;
    return 'resolved';
  } catch (e) {
    return e instanceof BackupError ? e.code : 'other';
  }
}

const parseCode = (value: unknown) => codeOf(Promise.resolve().then(() => parseSnapshot(value)));
const rawSnapshot = () => JSON.parse(JSON.stringify(backupSnapshot()));

test('round-trips a snapshot', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'correct horse', FAST);
  expect(await decodeBackup(bytes, 'correct horse')).toEqual(backupSnapshot());
});

test('uses 600,000 PBKDF2 iterations by default', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'correct horse');
  expect(new DataView(bytes.buffer, bytes.byteOffset).getUint32(5)).toBe(600_000);
  expect(await decodeBackup(bytes, 'correct horse')).toEqual(backupSnapshot());
}, 20_000);

test('salt is random: same input, different files', async () => {
  const a = await encodeBackup(backupSnapshot(), 'pass phrase', FAST);
  const b = await encodeBackup(backupSnapshot(), 'pass phrase', FAST);
  expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
});

test('composed and decomposed passphrases are the same passphrase', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'café latte', FAST);
  expect(await decodeBackup(bytes, 'café latte')).toEqual(backupSnapshot());
});

test('wrong passphrase', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  expect(await codeOf(decodeBackup(bytes, 'wrong pass'))).toBe('wrong-passphrase-or-damaged');
});

test('a damaged file is reported like a wrong passphrase', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  bytes[bytes.length - 30] ^= 0xff;
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('wrong-passphrase-or-damaged');
});

test('random files are not backups', async () => {
  expect(await codeOf(decodeBackup(utf8.encode('hello, this is a text file'), 'x'))).toBe('not-a-backup');
  expect(await codeOf(decodeBackup(new Uint8Array(3), 'x'))).toBe('not-a-backup');
});

test('newer format version', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  bytes[4] = 2;
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('unsupported-version');
});

test('absurd iteration counts are rejected before deriving a key', async () => {
  const bytes = await encodeBackup(backupSnapshot(), 'right pass', FAST);
  new DataView(bytes.buffer, bytes.byteOffset).setUint32(5, 0xffffffff);
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('not-a-backup');
});

test('valid encryption around invalid contents is rejected', async () => {
  const bad = { ...backupSnapshot(), formatVersion: 7 } as unknown as Parameters<typeof encodeBackup>[0];
  const bytes = await encodeBackup(bad, 'right pass', FAST);
  expect(await codeOf(decodeBackup(bytes, 'right pass'))).toBe('invalid-contents');
});

describe('parseSnapshot', () => {
  test('accepts a valid snapshot', async () => {
    expect(await parseCode(rawSnapshot())).toBe('resolved');
  });

  test('rejects ids that could escape the cards folder', async () => {
    for (const id of ['../escape', 'a/b', '', 'x'.repeat(65), 'card.front']) {
      const raw = rawSnapshot();
      raw.cards[0].card.id = id;
      expect(await parseCode(raw)).toBe('invalid-contents');
    }
  });

  test('rejects duplicate ids', async () => {
    const raw = rawSnapshot();
    raw.cards[1].card.id = raw.cards[0].card.id;
    expect(await parseCode(raw)).toBe('invalid-contents');
  });

  test('rejects hasBack that disagrees with the images', async () => {
    const raw = rawSnapshot();
    raw.cards[0].card.hasBack = true;
    expect(await parseCode(raw)).toBe('invalid-contents');
  });

  test('rejects a missing front image or thumbnail', async () => {
    const noFront = rawSnapshot();
    delete noFront.cards[0].images.front;
    expect(await parseCode(noFront)).toBe('invalid-contents');
    const noThumb = rawSnapshot();
    delete noThumb.cards[0].images.front.thumbJpegBase64;
    expect(await parseCode(noThumb)).toBe('invalid-contents');
  });

  test('rejects invalid card fields', async () => {
    const raw = rawSnapshot();
    raw.cards[0].card.category = 'passport';
    expect(await parseCode(raw)).toBe('invalid-contents');
  });

  test('rejects non-objects', async () => {
    expect(await parseCode(null)).toBe('invalid-contents');
    expect(await parseCode([])).toBe('invalid-contents');
    expect(await parseCode({ formatVersion: 1, exportedAt: 1, cards: 'nope' })).toBe('invalid-contents');
  });
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/backup`
Expected: FAIL — `Cannot find module '../backupFile'` / `'../passphrase'`.

- [ ] **Step 4: Implement passphrase rules**

`src/backup/passphrase.ts`:

```ts
import { MIN_PASSPHRASE_LENGTH } from '../config';

export type PassphraseProblem = 'too-short' | 'mismatch';

export function validateNewPassphrase(passphrase: string, confirmation: string): PassphraseProblem | null {
  if ([...passphrase].length < MIN_PASSPHRASE_LENGTH) return 'too-short';
  if (passphrase !== confirmation) return 'mismatch';
  return null;
}
```

- [ ] **Step 5: Implement the backup file**

`src/backup/backupFile.ts`:

```ts
import { ImportEntry } from '../cards/cardStore';
import { Card, CardImage } from '../cards/types';
import { validateCardFields } from '../cards/validate';
import { PBKDF2_ITERATIONS } from '../config';
import { createAead } from '../crypto/aead';
import { concat, utf8 } from '../crypto/bytes';
import { engine } from '../crypto/engine';

export type BackupCard = ImportEntry;

export interface BackupSnapshot {
  formatVersion: 1;
  exportedAt: number;
  cards: BackupCard[];
}

export type BackupErrorCode = 'not-a-backup' | 'unsupported-version' | 'wrong-passphrase-or-damaged' | 'invalid-contents';

export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(code);
    this.name = 'BackupError';
  }
}

const MAGIC = utf8.encode('CHBK');
const FORMAT_VERSION = 1;
const SALT_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + 1 + 4 + SALT_LENGTH;
const MIN_ITERATIONS = 1_000;
const MAX_ITERATIONS = 10_000_000;

function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    engine.pbkdf2(passphrase.normalize('NFC'), salt, iterations, 32, 'sha256', (err, key) => {
      if (err || !key) reject(err ?? new Error('PBKDF2 failed'));
      else resolve(new Uint8Array(key));
    });
  });
}

export async function encodeBackup(
  snapshot: BackupSnapshot,
  passphrase: string,
  { iterations = PBKDF2_ITERATIONS }: { iterations?: number } = {},
): Promise<Uint8Array> {
  const salt = new Uint8Array(engine.randomBytes(SALT_LENGTH));
  const key = await deriveKey(passphrase, salt, iterations);
  const header = new Uint8Array(HEADER_LENGTH);
  header.set(MAGIC, 0);
  header[4] = FORMAT_VERSION;
  new DataView(header.buffer).setUint32(5, iterations);
  header.set(salt, 9);
  return concat(header, createAead(key).seal(utf8.encode(JSON.stringify(snapshot))));
}

export async function decodeBackup(bytes: Uint8Array, passphrase: string): Promise<BackupSnapshot> {
  if (bytes.length < HEADER_LENGTH || !MAGIC.every((b, i) => bytes[i] === b)) throw new BackupError('not-a-backup');
  if (bytes[4] !== FORMAT_VERSION) throw new BackupError('unsupported-version');
  const iterations = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(5);
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) throw new BackupError('not-a-backup');

  const key = await deriveKey(passphrase, bytes.subarray(9, HEADER_LENGTH), iterations);
  let json: string;
  try {
    json = utf8.decode(createAead(key).open(bytes.subarray(HEADER_LENGTH)));
  } catch {
    throw new BackupError('wrong-passphrase-or-damaged');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BackupError('invalid-contents');
  }
  return parseSnapshot(parsed);
}

// --- Validation of untrusted contents ---------------------------------------------------------

// Card ids become blob file names, so only allow characters that can't form a path.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function invalid(): never {
  throw new BackupError('invalid-contents');
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPositive = (v: unknown): v is number => isNumber(v) && v > 0;
const isBase64 = (v: unknown): v is string => typeof v === 'string' && BASE64_PATTERN.test(v);

function parseImage(v: unknown): CardImage {
  if (!isObject(v) || !isBase64(v.jpegBase64) || !isPositive(v.aspect)) invalid();
  return { jpegBase64: v.jpegBase64, aspect: v.aspect };
}

function parseEntry(entry: unknown, seen: Set<string>): BackupCard {
  if (!isObject(entry) || !isObject(entry.card) || !isObject(entry.images)) invalid();
  const c = entry.card;
  const imgs = entry.images;

  if (typeof c.id !== 'string' || !ID_PATTERN.test(c.id) || seen.has(c.id)) invalid();
  seen.add(c.id);

  const fields = validateCardFields(c);
  if (!fields.ok) invalid();
  if (typeof c.pinned !== 'boolean' || !isNumber(c.position) || !isNumber(c.createdAt) || !isNumber(c.updatedAt)) invalid();
  if (!isPositive(c.frontAspect)) invalid();

  const front = parseImage(imgs.front);
  const thumb = isObject(imgs.front) ? imgs.front.thumbJpegBase64 : undefined;
  if (!isBase64(thumb)) invalid();
  const back = imgs.back === null ? null : parseImage(imgs.back);
  if (c.hasBack !== (back !== null)) invalid();
  if (back ? !isPositive(c.backAspect) : c.backAspect !== null) invalid();

  const card: Card = {
    ...fields.value,
    id: c.id,
    pinned: c.pinned,
    position: c.position,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    hasBack: back !== null,
    frontAspect: c.frontAspect,
    backAspect: back ? (c.backAspect as number) : null,
  };
  return { card, images: { front: { ...front, thumbJpegBase64: thumb }, back } };
}

export function parseSnapshot(value: unknown): BackupSnapshot {
  if (!isObject(value) || value.formatVersion !== 1 || !isNumber(value.exportedAt) || !Array.isArray(value.cards)) {
    invalid();
  }
  const seen = new Set<string>();
  return { formatVersion: 1, exportedAt: value.exportedAt, cards: value.cards.map((entry) => parseEntry(entry, seen)) };
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npx jest src/backup && npm run typecheck`
Expected: all PASS (the default-iterations test takes about a second); `tsc` exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/backup test/fixtures.ts
git commit -m "feat: passphrase-encrypted backup file format with strict validation"
```

---

### Task 9: Build and apply backup snapshots

**Files:**
- Create: `src/backup/backupService.ts`
- Test: `src/backup/__tests__/backupService.test.ts`

**Interfaces:**
- Consumes: `CardStore`, `blobName` (Task 6); `BackupSnapshot`, `BackupCard`, `encodeBackup`, `decodeBackup`, `parseSnapshot` (Task 8).
- Produces:
  - `buildSnapshot(store: CardStore, now: number): Promise<BackupSnapshot>` — a card whose back blob is missing is exported as front-only; a missing thumbnail falls back to the front
  - `type ImportMode = 'merge' | 'replace'`
  - `interface ImportResult { added: number; skipped: number }`
  - `applySnapshot(store: CardStore, snapshot: BackupSnapshot, mode: ImportMode): Promise<ImportResult>` — merge skips ids already on the device; replace swaps everything atomically (via `insertMany`)

- [ ] **Step 1: Write the failing tests**

`src/backup/__tests__/backupService.test.ts`:

```ts
import { backupSnapshot, fields, images, makeStore } from '../../../test/fixtures';
import { base64, utf8 } from '../../crypto/bytes';
import { blobName } from '../../cards/cardStore';
import { decodeBackup, encodeBackup, parseSnapshot } from '../backupFile';
import { applySnapshot, buildSnapshot } from '../backupService';

const text = (b64: string | null) => (b64 === null ? null : utf8.decode(base64.decode(b64)));

test('export from one phone, replace-import on another', async () => {
  const phoneA = await makeStore();
  await phoneA.store.create(fields({ name: 'Emirates ID', category: 'id', expiresOn: '2027-03-01' }), images('id', true));
  await phoneA.store.create(fields({ name: 'Gym', notes: 'Locker 12' }), images('gym'));

  const bytes = await encodeBackup(await buildSnapshot(phoneA.store, 42), 'travel pass', { iterations: 1_000 });
  const snapshot = await decodeBackup(bytes, 'travel pass');
  expect(snapshot.exportedAt).toBe(42);

  const phoneB = await makeStore();
  expect(await applySnapshot(phoneB.store, snapshot, 'replace')).toEqual({ added: 2, skipped: 0 });
  expect(await phoneB.store.list()).toEqual(await phoneA.store.list());
  expect(text(await phoneB.store.loadImage('card1', 'back'))).toBe('JPEG:id-back');
  expect(text(await phoneB.store.loadImage('card2', 'thumb'))).toBe('THUMB:gym');
});

test('merge keeps cards already on the phone and adds the rest', async () => {
  const { store } = await makeStore();
  await store.create(fields({ name: 'Mine' }), images('mine')); // id card1, same as the backup's first card
  const result = await applySnapshot(store, backupSnapshot(), 'merge');
  expect(result).toEqual({ added: 1, skipped: 1 });
  expect((await store.get('card1'))!.name).toBe('Mine');
  expect((await store.get('card2'))!.name).toBe('Gym');
});

test('merge of a backup with nothing new is a no-op', async () => {
  const { store } = await makeStore();
  await applySnapshot(store, backupSnapshot(), 'merge');
  expect(await applySnapshot(store, backupSnapshot(), 'merge')).toEqual({ added: 0, skipped: 2 });
  expect(await store.count()).toBe(2);
});

test('replace drops cards that are not in the backup', async () => {
  const { store } = await makeStore();
  await store.create(fields({ name: 'A' }), images('a'));
  await store.create(fields({ name: 'B' }), images('b'));
  await store.create(fields({ name: 'C' }), images('c'));
  expect(await applySnapshot(store, backupSnapshot(), 'replace')).toEqual({ added: 2, skipped: 0 });
  expect((await store.list()).map((c) => c.name)).toEqual(['Emirates ID', 'Gym']);
});

test('a card whose back image is missing exports as front-only and still imports', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x', true));
  blobs.raw.delete(blobName(card.id, 'back'));
  const snapshot = await buildSnapshot(store, 1);
  expect(snapshot.cards[0].card).toMatchObject({ hasBack: false, backAspect: null });
  expect(snapshot.cards[0].images.back).toBeNull();
  expect(() => parseSnapshot(JSON.parse(JSON.stringify(snapshot)))).not.toThrow();
});

test('a missing thumbnail falls back to the front image', async () => {
  const { store, blobs } = await makeStore();
  const card = await store.create(fields(), images('x'));
  blobs.raw.delete(blobName(card.id, 'thumb'));
  const snapshot = await buildSnapshot(store, 1);
  expect(text(snapshot.cards[0].images.front.thumbJpegBase64)).toBe('JPEG:x');
});
```

- [ ] **Step 2: Run to make sure they fail**

Run: `npx jest src/backup/__tests__/backupService.test.ts`
Expected: FAIL — `Cannot find module '../backupService'`.

- [ ] **Step 3: Implement the service**

`src/backup/backupService.ts`:

```ts
import { CardStore } from '../cards/cardStore';
import { BackupCard, BackupSnapshot } from './backupFile';

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  added: number;
  skipped: number;
}

export async function buildSnapshot(store: CardStore, now: number): Promise<BackupSnapshot> {
  const cards: BackupCard[] = [];
  for (const card of await store.list()) {
    const front = await store.loadImage(card.id, 'front');
    if (!front) throw new Error(`Card ${card.id} has no front image`);
    const thumb = (await store.loadImage(card.id, 'thumb')) ?? front;
    const back = card.hasBack && card.backAspect ? await store.loadImage(card.id, 'back') : null;
    cards.push({
      card: { ...card, hasBack: back !== null, backAspect: back ? card.backAspect : null },
      images: {
        front: { jpegBase64: front, aspect: card.frontAspect, thumbJpegBase64: thumb },
        back: back && card.backAspect ? { jpegBase64: back, aspect: card.backAspect } : null,
      },
    });
  }
  return { formatVersion: 1, exportedAt: now, cards };
}

// The snapshot must come from decodeBackup, which has already validated every card.
export async function applySnapshot(store: CardStore, snapshot: BackupSnapshot, mode: ImportMode): Promise<ImportResult> {
  if (mode === 'replace') {
    await store.insertMany(snapshot.cards, { replace: true });
    return { added: snapshot.cards.length, skipped: 0 };
  }
  const existing = new Set(await store.ids());
  const fresh = snapshot.cards.filter((entry) => !existing.has(entry.card.id));
  if (fresh.length > 0) await store.insertMany(fresh, { replace: false });
  return { added: fresh.length, skipped: snapshot.cards.length - fresh.length };
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest src/backup`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/backup/backupService.ts src/backup/__tests__/backupService.test.ts
git commit -m "feat: build and apply backup snapshots (merge and replace)"
```

---

### Task 10: Expiry reminders

**Files:**
- Create: `src/reminders/plan.ts`, `src/reminders/scheduler.ts`
- Modify: `app.json` (plugins)
- Test: `src/reminders/__tests__/plan.test.ts`, `src/reminders/__tests__/scheduler.test.ts`

**Interfaces:**
- Consumes: `REMINDER_DAYS_BEFORE`, `REMINDER_HOUR`, `MAX_SCHEDULED_REMINDERS` (Task 1); `strings` (Task 1); `Card` (Task 5); `parseIsoDate` (Task 5).
- Produces:
  - `interface PlannedReminder { id: string /* "<cardId>:<days>" */; cardId: string; daysBefore: number; fireAt: Date; title: string; body: string }`
  - `planReminders(cards: ReadonlyArray<Pick<Card, 'id' | 'name' | 'expiresOn'>>, now: Date, max?: number): PlannedReminder[]` — soonest first, future only, capped
  - `setupNotifications(): Promise<void>` — foreground handler + Android channel
  - `requestReminderPermissionOnce(): Promise<boolean>` — prompts only if never asked
  - `syncReminders(cards: Card[], now?: Date): Promise<void>` — cancels everything, then schedules the plan (only if permission is granted)

- [ ] **Step 1: Install expo-notifications**

```bash
npx expo install expo-notifications
```

Add `"expo-notifications"` to the `plugins` array in `app.json`.

- [ ] **Step 2: Write the failing tests**

`src/reminders/__tests__/plan.test.ts`:

```ts
import { makeCard } from '../../../test/fixtures';
import { planReminders } from '../plan';

const now = new Date(2027, 0, 1, 12, 0);

test('two reminders per card at 09:00, 30 and 7 days before expiry', () => {
  const plan = planReminders([makeCard({ id: 'c1', name: 'Emirates ID', expiresOn: '2027-06-30' })], now);
  expect(plan).toEqual([
    {
      id: 'c1:30',
      cardId: 'c1',
      daysBefore: 30,
      fireAt: new Date(2027, 4, 31, 9, 0),
      title: 'Emirates ID expires in 30 days',
      body: 'Tap to open the card.',
    },
    {
      id: 'c1:7',
      cardId: 'c1',
      daysBefore: 7,
      fireAt: new Date(2027, 5, 23, 9, 0),
      title: 'Emirates ID expires in 7 days',
      body: 'Tap to open the card.',
    },
  ]);
});

test('reminders already in the past are skipped', () => {
  const plan = planReminders([makeCard({ id: 'c1', expiresOn: '2027-01-15' })], now);
  expect(plan.map((r) => r.id)).toEqual(['c1:7']);
  expect(planReminders([makeCard({ id: 'c2', expiresOn: '2026-12-01' })], now)).toEqual([]);
});

test('cards without an expiry date get nothing', () => {
  expect(planReminders([makeCard({ expiresOn: null })], now)).toEqual([]);
});

test('sorted soonest first across cards', () => {
  const plan = planReminders(
    [makeCard({ id: 'late', expiresOn: '2027-12-01' }), makeCard({ id: 'soon', expiresOn: '2027-03-01' })],
    now,
  );
  expect(plan.map((r) => r.id)).toEqual(['soon:30', 'soon:7', 'late:30', 'late:7']);
});

test('caps the plan at the soonest 60 reminders', () => {
  const cards = Array.from({ length: 40 }, (_, i) =>
    makeCard({ id: `c${i}`, expiresOn: `2028-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}` }),
  );
  const plan = planReminders(cards, now);
  expect(plan).toHaveLength(60);
  const times = plan.map((r) => r.fireAt.getTime());
  expect([...times].sort((a, b) => a - b)).toEqual(times);
  const all = planReminders(cards, now, Infinity);
  expect(all).toHaveLength(80);
  expect(plan[59].fireAt.getTime()).toBeLessThanOrEqual(all[60].fireAt.getTime());
});
```

`src/reminders/__tests__/scheduler.test.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { makeCard } from '../../../test/fixtures';
import { requestReminderPermissionOnce, syncReminders } from '../scheduler';

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const now = new Date(2027, 0, 1, 12, 0);

beforeEach(() => jest.clearAllMocks());

test('cancels everything, then schedules the plan', async () => {
  await syncReminders([makeCard({ id: 'c1', name: 'Visa', expiresOn: '2027-06-30' })], now);
  expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: 'c1:30',
    content: { title: 'Visa expires in 30 days', body: 'Tap to open the card.', data: { cardId: 'c1' } },
    trigger: { type: 'date', date: new Date(2027, 4, 31, 9, 0), channelId: 'reminders' },
  });
});

test('without permission it only cancels', async () => {
  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);
  await syncReminders([makeCard({ expiresOn: '2027-06-30' })], now);
  expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('asks for permission only when it has never been asked', async () => {
  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' } as never);
  expect(await requestReminderPermissionOnce()).toBe(true);
  expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);

  mocked.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);
  expect(await requestReminderPermissionOnce()).toBe(false);
  expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/reminders`
Expected: FAIL — `Cannot find module '../plan'` / `'../scheduler'`.

- [ ] **Step 4: Implement the plan**

`src/reminders/plan.ts`:

```ts
import { Card } from '../cards/types';
import { MAX_SCHEDULED_REMINDERS, REMINDER_DAYS_BEFORE, REMINDER_HOUR } from '../config';
import { strings } from '../strings';
import { parseIsoDate } from '../time/dates';

export interface PlannedReminder {
  id: string;
  cardId: string;
  daysBefore: number;
  fireAt: Date;
  title: string;
  body: string;
}

export function planReminders(
  cards: ReadonlyArray<Pick<Card, 'id' | 'name' | 'expiresOn'>>,
  now: Date,
  max: number = MAX_SCHEDULED_REMINDERS,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const card of cards) {
    const expiry = card.expiresOn ? parseIsoDate(card.expiresOn) : null;
    if (!expiry) continue;
    for (const daysBefore of REMINDER_DAYS_BEFORE) {
      const fireAt = new Date(expiry.year, expiry.month - 1, expiry.day - daysBefore, REMINDER_HOUR, 0, 0, 0);
      if (fireAt.getTime() <= now.getTime()) continue;
      planned.push({
        id: `${card.id}:${daysBefore}`,
        cardId: card.id,
        daysBefore,
        fireAt,
        title: strings.reminders.title(card.name, daysBefore),
        body: strings.reminders.body,
      });
    }
  }
  return planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, max);
}
```

- [ ] **Step 5: Implement the scheduler**

`src/reminders/scheduler.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Card } from '../cards/types';
import { strings } from '../strings';
import { planReminders } from './plan';

const CHANNEL_ID = 'reminders';

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: strings.reminders.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

// Called when the user saves a card with an expiry date — never at launch.
export async function requestReminderPermissionOnce(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'undetermined') return current.status === 'granted';
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

// Re-plans from scratch so edits, deletes, imports and the 60-reminder window are always right.
export async function syncReminders(cards: Card[], now: Date = new Date()): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  for (const reminder of planReminders(cards, now)) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body, data: { cardId: reminder.cardId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: CHANNEL_ID },
    });
  }
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npx jest src/reminders && npm run typecheck`
Expected: all PASS; `tsc` exits 0. (If `tsc` rejects `shouldShowBanner`/`shouldShowList`, the installed expo-notifications predates them — replace both with `shouldShowAlert: true`.)

- [ ] **Step 7: Commit**

```bash
git add src/reminders app.json package.json package-lock.json
git commit -m "feat: plan and schedule expiry reminders"
```

---

### Task 11: App shell — native adapters, boot and recovery screen

**Files:**
- Create: `src/crypto/secureVault.ts`, `src/storage/fileBlobStore.ts`, `src/storage/openDatabase.ts`, `src/app/boot.ts`, `src/app/AppProvider.tsx`, `src/app/BootScreen.tsx`, `src/ui/theme.ts`, `src/ui/Text.tsx`, `src/ui/fonts.ts`, `src/ui/Button.tsx`, `assets/fonts/*`
- Replace: `app/_layout.tsx`, `app/index.tsx` (the index is temporary; Task 14 replaces it)
- Modify: `app.json` (plugins)
- Test: `src/app/__tests__/boot.test.ts`, `src/ui/__tests__/Text.test.ts`

**Interfaces:**
- Consumes: `KeyVault`, `openKeyring`, `startFresh` (Task 4); `SqlDb`, `migrate`, `createSettings`, `Settings`, `BlobStore` (Task 3); `createCardStore`, `CardStore` (Task 6); `isUnlocked` (Task 7); `syncReminders`, `setupNotifications` (Task 10); `base64` (Task 2); `strings` (Task 1).
- Produces:
  - `interface BootDeps { db: SqlDb; blobs: BlobStore; vault: KeyVault }`
  - `interface Services extends BootDeps { settings: Settings; store: CardStore }`
  - `boot(deps: BootDeps): Promise<{ status: 'ready'; services: Services } | { status: 'orphaned' }>`
  - `bootFresh(deps: BootDeps): Promise<Services>`
  - `secureVault: KeyVault`, `createFileBlobStore(folder?: string): BlobStore`, `openDatabase(): Promise<SqlDb>`
  - `AppProvider`, `useBoot(): { phase: BootPhase; startFresh(thenImport: boolean): Promise<void> }`
  - `useApp(): { services: Services; cards: Card[]; unlocked: boolean; refresh(): Promise<void>; openImportOnReady: boolean; clearOpenImport(): void }` — `cards` is the sorted list; `refresh()` reloads cards + unlock flag and re-syncs reminders. Call it after every mutation.
  - `BootScreen` (loading / orphaned / error)
  - `interface Theme { bg; surface; text; muted; accent; onAccent; selection; danger; border; rosette; bannerBg; bannerText }` (all `string`), `useTheme(): Theme`, `TYPE` (type scale)
  - `FONT = { regular, semibold, bold }` (font family names), `familyFor(weight): string`, `Text` (drop-in for React Native's `Text` that applies Public Sans at the right weight), `FONTS` (the `useFonts` map, in `src/ui/fonts.ts`)
  - `Button({ label, onPress, variant?: 'primary' | 'secondary' | 'danger', disabled?, testID?, accessibilityHint? })`

- [ ] **Step 1: Install native storage, orientation and gesture packages**

```bash
npx expo install expo-sqlite expo-secure-store expo-file-system expo-screen-orientation react-native-gesture-handler react-native-reanimated expo-font react-native-svg
```

If the installed `react-native-reanimated` is 4.x (`npm ls react-native-reanimated`), also run `npx expo install react-native-worklets`.

Add to the `plugins` array in `app.json`:

```json
      "expo-sqlite",
      "expo-secure-store",
      ["expo-screen-orientation", { "initialOrientation": "PORTRAIT_UP" }]
```

Bundle the typeface (it ships inside the app, so nothing is fetched at runtime). Treat the downloads as untrusted: unzip it into its own empty folder in a scratch directory and copy only the font and licence files:

- **Public Sans** (SIL Open Font License): download the latest release zip from https://github.com/uswds/public-sans/releases and copy `fonts/ttf/PublicSans-Regular.ttf`, `PublicSans-SemiBold.ttf`, `PublicSans-Bold.ttf` and the licence file into `assets/fonts/` (licence as `assets/fonts/PublicSans-LICENSE.md`).

Run: `ls assets/fonts`
Expected: `PublicSans-Bold.ttf  PublicSans-LICENSE.md  PublicSans-Regular.ttf  PublicSans-SemiBold.ttf`

- [ ] **Step 2: Write the failing boot tests**

`src/app/__tests__/boot.test.ts`:

```ts
import { fields, images } from '../../../test/fixtures';
import { createMemoryBlobStore } from '../../../test/memoryBlobStore';
import { memoryDb } from '../../../test/memoryDb';
import { createMemoryVault } from '../../../test/memoryVault';
import { boot, bootFresh } from '../boot';

test('a fresh install boots ready with an empty store', async () => {
  const result = await boot({ db: memoryDb(), blobs: createMemoryBlobStore(), vault: createMemoryVault() });
  if (result.status !== 'ready') throw new Error('expected ready');
  expect(await result.services.store.count()).toBe(0);
});

test('data restored without its key is orphaned', async () => {
  const db = memoryDb();
  const blobs = createMemoryBlobStore();
  const first = await boot({ db, blobs, vault: createMemoryVault() });
  if (first.status !== 'ready') throw new Error('expected ready');
  await first.services.store.create(fields(), images('a'));

  expect((await boot({ db, blobs, vault: createMemoryVault() })).status).toBe('orphaned');
});

test('bootFresh gives a working empty store that boots ready next time', async () => {
  const db = memoryDb();
  const blobs = createMemoryBlobStore();
  const first = await boot({ db, blobs, vault: createMemoryVault() });
  if (first.status !== 'ready') throw new Error('expected ready');
  await first.services.store.create(fields(), images('a'));

  const vault = createMemoryVault();
  const services = await bootFresh({ db, blobs, vault });
  expect(await services.store.count()).toBe(0);
  expect(blobs.raw.size).toBe(0);
  await services.store.create(fields({ name: 'New' }), images('b'));

  const again = await boot({ db, blobs, vault });
  if (again.status !== 'ready') throw new Error('expected ready');
  expect((await again.services.store.list()).map((c) => c.name)).toEqual(['New']);
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/app`
Expected: FAIL — `Cannot find module '../boot'`.

- [ ] **Step 4: Implement boot**

`src/app/boot.ts`:

```ts
import { CardStore, createCardStore } from '../cards/cardStore';
import { KeyVault, openKeyring, startFresh } from '../crypto/keyring';
import { BlobStore } from '../storage/blobStore';
import { createSettings, Settings } from '../storage/settings';
import { migrate, SqlDb } from '../storage/sqlDb';

export interface BootDeps {
  db: SqlDb;
  blobs: BlobStore;
  vault: KeyVault;
}

export interface Services extends BootDeps {
  settings: Settings;
  store: CardStore;
}

export type BootResult = { status: 'ready'; services: Services } | { status: 'orphaned' };

export async function boot(deps: BootDeps): Promise<BootResult> {
  await migrate(deps.db);
  const settings = createSettings(deps.db);
  const keyring = await openKeyring(deps.vault, settings);
  if (keyring.status === 'orphaned') return { status: 'orphaned' };
  const store = createCardStore({ db: deps.db, blobs: deps.blobs, aead: keyring.aead });
  return { status: 'ready', services: { ...deps, settings, store } };
}

export async function bootFresh(deps: BootDeps): Promise<Services> {
  await migrate(deps.db);
  const settings = createSettings(deps.db);
  const aead = await startFresh({ ...deps, settings });
  return { ...deps, settings, store: createCardStore({ db: deps.db, blobs: deps.blobs, aead }) };
}
```

- [ ] **Step 5: Run the boot tests**

Run: `npx jest src/app`
Expected: 3 PASS.

- [ ] **Step 6: Implement the native adapters**

`src/crypto/secureVault.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import { base64 } from './bytes';
import { KeyVault } from './keyring';

const KEY_NAME = 'cardholder.dataKey.v1';
// THIS_DEVICE_ONLY: never synced to iCloud Keychain, never restored onto another phone.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureVault: KeyVault = {
  async get() {
    const value = await SecureStore.getItemAsync(KEY_NAME, OPTIONS);
    return value ? base64.decode(value) : null;
  },
  async set(key) {
    await SecureStore.setItemAsync(KEY_NAME, base64.encode(key), OPTIONS);
  },
};
```

`src/storage/fileBlobStore.ts`:

```ts
import { Directory, File, Paths } from 'expo-file-system';
import { BlobStore } from './blobStore';

export function createFileBlobStore(folder = 'cards'): BlobStore {
  const dir = new Directory(Paths.document, folder);
  const ensureDir = () => {
    if (!dir.exists) dir.create({ intermediates: true });
  };
  const file = (name: string) => new File(dir, name);

  return {
    async put(name, bytes) {
      ensureDir();
      const f = file(name);
      if (f.exists) f.delete();
      f.create();
      f.write(bytes);
    },
    async get(name) {
      const f = file(name);
      return f.exists ? f.bytes() : null;
    },
    async remove(name) {
      const f = file(name);
      if (f.exists) f.delete();
    },
    async list() {
      if (!dir.exists) return [];
      return dir
        .list()
        .filter((entry): entry is File => entry instanceof File)
        .map((f) => f.name);
    },
  };
}
```

(If `tsc` reports that `File` has no `bytes()` in the installed expo-file-system, use `f.bytesSync()` instead.)

`src/storage/openDatabase.ts`:

```ts
import * as SQLite from 'expo-sqlite';
import { SqlDb, SqlValue } from './sqlDb';

export async function openDatabase(): Promise<SqlDb> {
  const db = await SQLite.openDatabaseAsync('cardholder.db');
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params) => db.runAsync(sql, params),
    getAllAsync: <T,>(sql: string, params: SqlValue[]) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T,>(sql: string, params: SqlValue[]) => db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (fn) => db.withTransactionAsync(fn),
  };
}
```

- [ ] **Step 7: Add the theme, typography and button**

`src/ui/theme.ts`:

```ts
import { useColorScheme } from 'react-native';

// Security-printing palette: cool security paper, intaglio ink, guilloche lines,
// a hologram violet reserved for selection, and rubber-stamp red for anything destructive.
export interface Theme {
  bg: string; // security paper
  surface: string; // slightly lifted paper (modals, banners)
  text: string; // intaglio ink
  muted: string; // secondary text (passes 4.5:1 on bg)
  accent: string; // filled primary buttons and links
  onAccent: string;
  selection: string; // hologram violet: selection, focus, the card being dragged — nothing else
  danger: string; // stamp red
  border: string; // hairlines between list items
  rosette: string; // guilloche line colour, field underlines
  bannerBg: string;
  bannerText: string;
}

const light: Theme = {
  bg: '#EDF1EC',
  surface: '#F6F8F5',
  text: '#1D3B4A',
  muted: '#4F6A66',
  accent: '#1D3B4A',
  onAccent: '#EDF1EC',
  selection: '#5B44C8',
  danger: '#B3261E',
  border: '#C9D4CF',
  rosette: '#7C9893',
  bannerBg: '#E1E8E3',
  bannerText: '#1D3B4A',
};

const dark: Theme = {
  bg: '#101B22',
  surface: '#172630',
  text: '#E3EAE6',
  muted: '#9DB2AE',
  accent: '#E3EAE6',
  onAccent: '#101B22',
  selection: '#A99BFF',
  danger: '#FF8A80',
  border: '#2A3D47',
  rosette: '#4A6670',
  bannerBg: '#1B2C36',
  bannerText: '#E3EAE6',
};

// Bringhurst-style scale, body one step above the platform default for arm's-length reading.
export const TYPE = { caption: 14, secondary: 16, body: 18, section: 21, title: 24, display: 36 } as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
```

`src/ui/Text.tsx`:

```tsx
import { Text as NativeText, StyleSheet, TextProps, TextStyle } from 'react-native';
import { TYPE } from './theme';

export const FONT = {
  regular: 'PublicSans-Regular',
  semibold: 'PublicSans-SemiBold',
  bold: 'PublicSans-Bold',
} as const;

// Custom fonts ship one file per weight; map the requested weight to the right file.
export function familyFor(weight: TextStyle['fontWeight']): string {
  const n = weight === 'bold' ? 700 : Number(weight ?? 400);
  if (n >= 700) return FONT.bold;
  if (n >= 600) return FONT.semibold;
  return FONT.regular;
}

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontFamily = flat.fontFamily ?? familyFor(flat.fontWeight);
  // fontWeight 'normal' stops Android synthesising bold on top of an already-bold file.
  return <NativeText {...props} style={[{ fontSize: TYPE.body }, style, { fontFamily, fontWeight: 'normal' }]} />;
}
```

`src/ui/fonts.ts`:

```ts
import { FONT } from './Text';

// Passed to expo-font's useFonts in the root layout. Bundled assets: works offline.
export const FONTS = {
  [FONT.regular]: require('../../assets/fonts/PublicSans-Regular.ttf'),
  [FONT.semibold]: require('../../assets/fonts/PublicSans-SemiBold.ttf'),
  [FONT.bold]: require('../../assets/fonts/PublicSans-Bold.ttf'),
};
```

`src/ui/__tests__/Text.test.ts`:

```ts
import { familyFor, FONT } from '../Text';

test('maps weights to the bundled Public Sans files', () => {
  expect(familyFor(undefined)).toBe(FONT.regular);
  expect(familyFor('normal')).toBe(FONT.regular);
  expect(familyFor('500')).toBe(FONT.regular);
  expect(familyFor('600')).toBe(FONT.semibold);
  expect(familyFor('700')).toBe(FONT.bold);
  expect(familyFor('bold')).toBe(FONT.bold);
  expect(familyFor('900')).toBe(FONT.bold);
});
```

Run: `npx jest src/ui`
Expected: PASS.

`src/ui/Button.tsx`:

```tsx
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, testID, accessibilityHint }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const color = primary ? theme.onAccent : variant === 'danger' ? theme.danger : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: primary ? theme.accent : 'transparent',
          borderColor: primary ? theme.accent : theme.border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
});
```

- [ ] **Step 8: Implement the provider**

`src/app/AppProvider.tsx`:

```tsx
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Card } from '../cards/types';
import { secureVault } from '../crypto/secureVault';
import { isUnlocked } from '../purchases/entitlement';
import { syncReminders } from '../reminders/scheduler';
import { createFileBlobStore } from '../storage/fileBlobStore';
import { openDatabase } from '../storage/openDatabase';
import { boot, BootDeps, bootFresh, Services } from './boot';

export type BootPhase =
  | { status: 'loading' }
  | { status: 'orphaned' }
  | { status: 'error'; message: string }
  | { status: 'ready'; services: Services };

interface BootContextValue {
  phase: BootPhase;
  startFresh(thenImport: boolean): Promise<void>;
}

export interface AppContextValue {
  services: Services;
  cards: Card[];
  unlocked: boolean;
  refresh(): Promise<void>;
  openImportOnReady: boolean;
  clearOpenImport(): void;
}

const BootContext = createContext<BootContextValue | null>(null);
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<BootPhase>({ status: 'loading' });
  const [deps, setDeps] = useState<BootDeps | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [openImportOnReady, setOpenImportOnReady] = useState(false);

  const load = useCallback(async (services: Services) => {
    const [list, unlockedNow] = await Promise.all([services.store.list(), isUnlocked(services.settings)]);
    setCards(list);
    setUnlocked(unlockedNow);
    syncReminders(list).catch((e) => console.warn('Reminder sync failed', e));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const bootDeps: BootDeps = { db: await openDatabase(), blobs: createFileBlobStore(), vault: secureVault };
        setDeps(bootDeps);
        const result = await boot(bootDeps);
        if (result.status === 'orphaned') {
          setPhase({ status: 'orphaned' });
          return;
        }
        await load(result.services);
        setPhase({ status: 'ready', services: result.services });
      } catch (e) {
        setPhase({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [load]);

  const startFresh = useCallback(
    async (thenImport: boolean) => {
      if (!deps) return;
      const services = await bootFresh(deps);
      await load(services);
      setOpenImportOnReady(thenImport);
      setPhase({ status: 'ready', services });
    },
    [deps, load],
  );

  const bootValue = useMemo(() => ({ phase, startFresh }), [phase, startFresh]);

  const appValue = useMemo<AppContextValue | null>(() => {
    if (phase.status !== 'ready') return null;
    const { services } = phase;
    return {
      services,
      cards,
      unlocked,
      refresh: () => load(services),
      openImportOnReady,
      clearOpenImport: () => setOpenImportOnReady(false),
    };
  }, [phase, cards, unlocked, load, openImportOnReady]);

  return (
    <BootContext.Provider value={bootValue}>
      <AppContext.Provider value={appValue}>{children}</AppContext.Provider>
    </BootContext.Provider>
  );
}

export function useBoot(): BootContextValue {
  const value = useContext(BootContext);
  if (!value) throw new Error('useBoot must be used inside AppProvider');
  return value;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp used before the app finished booting');
  return value;
}
```

- [ ] **Step 9: Implement the boot screen**

`src/app/BootScreen.tsx`:

```tsx
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { strings } from '../strings';
import { Button } from '../ui/Button';
import { useTheme } from '../ui/theme';
import { useBoot } from './AppProvider';

export function BootScreen() {
  const { phase, startFresh } = useBoot();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  // Both choices wipe the locked cards, so both confirm first.
  const confirm = (thenImport: boolean) =>
    Alert.alert(strings.boot.startFreshConfirmTitle, strings.boot.startFreshConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: thenImport ? strings.boot.importBackup : strings.boot.startFresh,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await startFresh(thenImport);
          } catch {
            setBusy(false);
            Alert.alert(strings.common.error);
          }
        },
      },
    ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {phase.status === 'loading' && (
        <>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.body, { color: theme.muted }]}>{strings.boot.loading}</Text>
        </>
      )}
      {phase.status === 'error' && (
        <>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.boot.errorTitle}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>{phase.message}</Text>
        </>
      )}
      {phase.status === 'orphaned' && (
        <>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.boot.orphanedTitle}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>{strings.boot.orphanedBody}</Text>
          <Button label={strings.boot.importBackup} onPress={() => confirm(true)} disabled={busy} />
          <Button variant="secondary" label={strings.boot.startFresh} onPress={() => confirm(false)} disabled={busy} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 18, textAlign: 'center' },
});
```

- [ ] **Step 10: Replace the root layout**

`app/_layout.tsx`:

```tsx
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useBoot } from '../src/app/AppProvider';
import { BootScreen } from '../src/app/BootScreen';
import { setupNotifications } from '../src/reminders/scheduler';
import { strings } from '../src/strings';
import { FONTS } from '../src/ui/fonts';
import { useTheme } from '../src/ui/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONTS);
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    setupNotifications().catch((e) => console.warn('Notification setup failed', e));
  }, []);

  // Fonts are bundled, so this resolves in milliseconds; the native splash screen covers it.
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { phase } = useBoot();
  const theme = useTheme();
  if (phase.status !== 'ready') return <BootScreen />;
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: strings.home.title }} />
      </Stack>
    </>
  );
}
```

Later tasks add one `<Stack.Screen … />` line each, directly below the `index` line.

- [ ] **Step 11: Replace the home screen with a temporary list**

`app/index.tsx` (temporary — Task 14 replaces it; rows open the counter view, which arrives in Task 13):

```tsx
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { useTheme } from '../src/ui/theme';

export default function Home() {
  const { cards } = useApp();
  const router = useRouter();
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {cards.length === 0 && (
        <>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }} accessibilityRole="header">
            {strings.home.emptyTitle}
          </Text>
          <Text style={{ fontSize: 18, color: theme.muted }}>{strings.promise}</Text>
        </>
      )}
      {cards.map((card) => (
        <Button key={card.id} variant="secondary" label={card.name} onPress={() => router.push(`/card/${card.id}`)} />
      ))}
      <Button label={strings.home.addCard} onPress={() => router.push('/edit/new')} testID="add-card" />
    </ScrollView>
  );
}
```

- [ ] **Step 12: Typecheck, run all tests**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; all suites PASS.

- [ ] **Step 13: Run the app**

Run: `npx expo run:ios` (needs Xcode; first build takes several minutes)
Expected: the simulator shows "Add your first card", the promise line and an **Add card** button, set in Public Sans on the pale green-grey paper colour, in light or dark to match the simulator's appearance (toggle with Cmd-Shift-A). Quit the app (Cmd-Shift-H twice, swipe away) and relaunch: it opens to the same screen, not the "can't be opened" screen.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: app shell with encrypted storage boot and recovery screen"
```

---

### Task 12: Add and edit a card (photo library + freeform crop)

**Files:**
- Create: `src/cards/editForm.ts`, `src/images/capture.ts`, `src/hooks/useCardImage.ts`, `src/ui/Field.tsx`, `src/ui/CategoryChips.tsx`, `src/ui/ImageField.tsx`, `src/ui/ExpiryField.tsx`, `app/edit/[id].tsx`
- Modify: `app/_layout.tsx` (route), `app.json` (permissions)
- Test: `src/cards/__tests__/editForm.test.ts`

**Interfaces:**
- Consumes: `validateCardFields`, `FieldError` (Task 5); `Card`, `CardFields`, `CardImage`, `FrontImage`, `ImageChanges`, `NewCardImages`, `Category`, `CATEGORIES`, `ImageSide` (Task 5); `canAddCard` (Task 7); `toIsoDate`, `fromIsoDate`, `formatDate` (Task 5); `requestReminderPermissionOnce` (Task 10); `useApp` (Task 11); `Button`, `useTheme` (Task 11); `IMAGE_MAX_EDGE`, `IMAGE_QUALITY`, `THUMB_WIDTH`, `NAME_MAX_LENGTH` (Task 1).
- Produces:
  - `interface EditDraft { name: string; category: Category; number: string; notes: string; expiresOn: string | null; front: FrontImage | null; back: CardImage | null; removeBack: boolean }` — `front`/`back` hold only *newly captured* images
  - `type SaveError = FieldError | 'front-required'`
  - `type SavePlan = { kind: 'invalid'; errors: SaveError[] } | { kind: 'limit-reached' } | { kind: 'create'; fields: CardFields; images: NewCardImages } | { kind: 'update'; id: string; fields: CardFields; changes: ImageChanges }`
  - `draftFor(card: Card | null): EditDraft`
  - `planSave(draft: EditDraft, ctx: { existing: Card | null; cardCount: number; unlocked: boolean }): SavePlan`
  - `pickImage(): Promise<FrontImage | null>` — photo library + freeform crop; `null` on cancel
  - `cropSharedImage(path: string): Promise<FrontImage | null>` — the same crop + thumbnail pipeline for a file shared into the app (used in Task 18)
  - `discardFile(path: string): void` — best-effort delete of a plaintext temp file
  - `useCardImage(card: Card | undefined, side: ImageSide): string | null` (a `data:` URI), `dataUri(jpegBase64: string): string`
  - `Field({ label, error?, children })`, `useInputStyle()`
  - `CategoryChips({ value: Category | null, onChange(value: Category | null), includeAll?: boolean })`
  - `ImageField({ label, uri, onLibrary, onRemove?, error?, testIDPrefix })` — buttons get testIDs `<prefix>-library`, `<prefix>-remove`
  - `ExpiryField({ value: string | null, onChange(value: string | null) })`
  - Screen `/edit/[id]` (`id = "new"` adds); testIDs `card-name`, `save-card`

- [ ] **Step 1: Install capture and date packages**

```bash
npx expo install react-native-image-crop-picker expo-image-manipulator @react-native-community/datetimepicker
```

In `app.json`, add to `ios` and `android` (merge with what's there):

```json
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "CardHolder imports card photos you choose from your library."
      }
    },
    "android": {
      "blockedPermissions": ["android.permission.CAMERA"]
    }
```

The app has no camera feature, so it never asks for camera access; `blockedPermissions` strips the camera permission the picker library declares on Android. (The photo-library string must live in `app.json` because iOS reads it from Info.plist; it is the only user-facing text outside `src/strings.ts`. If App Store Connect later rejects an upload with ITMS-90683 "missing purpose string" for the camera, add an `NSCameraUsageDescription` — it is never shown, because the app never opens the camera.)

- [ ] **Step 2: Write the failing tests**

`src/cards/__tests__/editForm.test.ts`:

```ts
import { frontImage, image, makeCard } from '../../../test/fixtures';
import { draftFor, planSave } from '../editForm';

const free = { existing: null, cardCount: 0, unlocked: false };

test('a new card needs a name and a front photo', () => {
  expect(planSave(draftFor(null), free)).toEqual({ kind: 'invalid', errors: ['name-required', 'front-required'] });
});

test('a valid new card within the free limit is created', () => {
  const front = frontImage('f');
  const plan = planSave({ ...draftFor(null), name: ' Gym ', category: 'membership', number: '12 34', front }, free);
  expect(plan).toEqual({
    kind: 'create',
    fields: { name: 'Gym', category: 'membership', number: '12 34', notes: null, expiresOn: null },
    images: { front, back: null },
  });
});

test('a new card at the free limit goes to the paywall', () => {
  const draft = { ...draftFor(null), name: 'Fifth', front: frontImage('f') };
  expect(planSave(draft, { existing: null, cardCount: 4, unlocked: false })).toEqual({ kind: 'limit-reached' });
  expect(planSave(draft, { existing: null, cardCount: 4, unlocked: true }).kind).toBe('create');
});

test('editing is never limited and sends no image changes when none were made', () => {
  const card = makeCard({ id: 'c9', name: 'Old', hasBack: true, backAspect: 1.5 });
  const plan = planSave({ ...draftFor(card), name: 'New' }, { existing: card, cardCount: 12, unlocked: false });
  expect(plan).toEqual({
    kind: 'update',
    id: 'c9',
    fields: { name: 'New', category: 'membership', number: null, notes: null, expiresOn: null },
    changes: {},
  });
});

test('removing the back, and replacing it', () => {
  const card = makeCard({ hasBack: true, backAspect: 1.5 });
  const ctx = { existing: card, cardCount: 1, unlocked: false };
  expect(planSave({ ...draftFor(card), removeBack: true }, ctx)).toMatchObject({ changes: { back: null } });
  const back = image('new-back');
  expect(planSave({ ...draftFor(card), removeBack: true, back }, ctx)).toMatchObject({ changes: { back } });
});

test('a new front photo is sent on edit', () => {
  const card = makeCard();
  const front = frontImage('new');
  expect(planSave({ ...draftFor(card), front }, { existing: card, cardCount: 1, unlocked: false })).toMatchObject({
    changes: { front },
  });
});

test('draftFor fills from an existing card', () => {
  const card = makeCard({ name: 'Visa', category: 'id', number: 'P123', notes: 'n', expiresOn: '2027-01-01' });
  expect(draftFor(card)).toEqual({
    name: 'Visa',
    category: 'id',
    number: 'P123',
    notes: 'n',
    expiresOn: '2027-01-01',
    front: null,
    back: null,
    removeBack: false,
  });
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/cards/__tests__/editForm.test.ts`
Expected: FAIL — `Cannot find module '../editForm'`.

- [ ] **Step 4: Implement the form logic**

`src/cards/editForm.ts`:

```ts
import { canAddCard } from '../purchases/limits';
import { Card, CardFields, CardImage, Category, FrontImage, ImageChanges, NewCardImages } from './types';
import { FieldError, validateCardFields } from './validate';

export interface EditDraft {
  name: string;
  category: Category;
  number: string;
  notes: string;
  expiresOn: string | null;
  front: FrontImage | null; // newly captured only
  back: CardImage | null; // newly captured only
  removeBack: boolean;
}

export type SaveError = FieldError | 'front-required';

export type SavePlan =
  | { kind: 'invalid'; errors: SaveError[] }
  | { kind: 'limit-reached' }
  | { kind: 'create'; fields: CardFields; images: NewCardImages }
  | { kind: 'update'; id: string; fields: CardFields; changes: ImageChanges };

export function draftFor(card: Card | null): EditDraft {
  return {
    name: card?.name ?? '',
    category: card?.category ?? 'id',
    number: card?.number ?? '',
    notes: card?.notes ?? '',
    expiresOn: card?.expiresOn ?? null,
    front: null,
    back: null,
    removeBack: false,
  };
}

export function planSave(
  draft: EditDraft,
  ctx: { existing: Card | null; cardCount: number; unlocked: boolean },
): SavePlan {
  const validation = validateCardFields(draft);
  const errors: SaveError[] = validation.ok ? [] : [...validation.errors];
  if (!ctx.existing && !draft.front) errors.push('front-required');
  if (!validation.ok || errors.length > 0) return { kind: 'invalid', errors };

  if (ctx.existing) {
    const changes: ImageChanges = {};
    if (draft.front) changes.front = draft.front;
    if (draft.back) changes.back = draft.back;
    else if (draft.removeBack) changes.back = null;
    return { kind: 'update', id: ctx.existing.id, fields: validation.value, changes };
  }

  if (!canAddCard(ctx.cardCount, ctx.unlocked)) return { kind: 'limit-reached' };
  // front is non-null here: a missing front was reported as 'front-required' above.
  return { kind: 'create', fields: validation.value, images: { front: draft.front as FrontImage, back: draft.back } };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx jest src/cards`
Expected: all PASS.

- [ ] **Step 6: Implement image picking and cropping**

`src/images/capture.ts`:

```ts
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import ImagePicker, { Image as PickedImage, Options } from 'react-native-image-crop-picker';
import { FrontImage } from '../cards/types';
import { IMAGE_MAX_EDGE, IMAGE_QUALITY, THUMB_WIDTH } from '../config';

const CROP_OPTIONS: Options = {
  mediaType: 'photo',
  cropping: true,
  freeStyleCropEnabled: true,
  includeBase64: true,
  forceJpg: true,
  compressImageMaxWidth: IMAGE_MAX_EDGE,
  compressImageMaxHeight: IMAGE_MAX_EDGE,
  compressImageQuality: IMAGE_QUALITY,
};

const toFileUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);

// Best effort; the OS also clears the cache folder.
export function discardFile(path: string): void {
  try {
    const f = new File(toFileUri(path));
    if (f.exists) f.delete();
  } catch {
    // ignore
  }
}

const isCancel = (e: unknown) => (e as { code?: string }).code === 'E_PICKER_CANCELLED';

// Photo library → freeform crop. Returns null when the user cancels.
export async function pickImage(): Promise<FrontImage | null> {
  try {
    return await finish((await ImagePicker.openPicker(CROP_OPTIONS)) as PickedImage);
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  }
}

// A file shared into the app → the same freeform crop. The caller discards the shared file.
export async function cropSharedImage(path: string): Promise<FrontImage | null> {
  try {
    return await finish((await ImagePicker.openCropper({ ...CROP_OPTIONS, path: toFileUri(path) })) as PickedImage);
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  }
}

// Plaintext temp files (the crop output and the thumbnail) are deleted before returning.
async function finish(picked: PickedImage): Promise<FrontImage> {
  try {
    if (!picked.data) throw new Error('Picker returned no image data');
    return {
      jpegBase64: picked.data,
      aspect: picked.width / picked.height,
      thumbJpegBase64: await makeThumbnail(toFileUri(picked.path)),
    };
  } finally {
    discardFile(picked.path);
    await ImagePicker.clean().catch(() => {});
  }
}

async function makeThumbnail(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: THUMB_WIDTH }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  try {
    if (!saved.base64) throw new Error('No thumbnail data');
    return saved.base64;
  } finally {
    discardFile(saved.uri);
  }
}
```

- [ ] **Step 7: Implement the image hook**

`src/hooks/useCardImage.ts`:

```ts
import { useEffect, useState } from 'react';
import { useApp } from '../app/AppProvider';
import { Card, ImageSide } from '../cards/types';

// Only thumbnails are cached (small). Keyed on updatedAt so edits never show a stale picture.
const thumbCache = new Map<string, string>();

export const dataUri = (jpegBase64: string) => `data:image/jpeg;base64,${jpegBase64}`;

export function useCardImage(card: Card | undefined, side: ImageSide): string | null {
  const { services } = useApp();
  const key = card ? `${card.id}:${side}:${card.updatedAt}` : null;
  const [uri, setUri] = useState<string | null>(() => (key ? (thumbCache.get(key) ?? null) : null));

  useEffect(() => {
    if (!key || !card) {
      setUri(null);
      return;
    }
    const cached = thumbCache.get(key);
    if (cached) {
      setUri(cached);
      return;
    }
    let live = true;
    setUri(null);
    services.store
      .loadImage(card.id, side)
      .then((b64) => {
        const value = b64 ? dataUri(b64) : null;
        if (value && side === 'thumb') thumbCache.set(key, value);
        if (live) setUri(value);
      })
      .catch(() => {
        if (live) setUri(null);
      });
    return () => {
      live = false;
    };
    // card is fully described by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, services]);

  return uri;
}
```

- [ ] **Step 8: Implement the form components**

`src/ui/Field.tsx`:

```tsx
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FONT, Text } from './Text';
import { useTheme } from './theme';

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[styles.error, { color: theme.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function useInputStyle() {
  const theme = useTheme();
  return [styles.input, { color: theme.text, borderColor: theme.rosette }];
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  error: { fontSize: 16 },
  input: { minHeight: 48, borderBottomWidth: 1, paddingHorizontal: 2, paddingVertical: 10, fontSize: 18, fontFamily: FONT.regular },
});
```

`src/ui/CategoryChips.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from './Text';
import { CATEGORIES, Category } from '../cards/types';
import { strings } from '../strings';
import { useTheme } from './theme';

interface Props {
  value: Category | null;
  onChange: (value: Category | null) => void;
  includeAll?: boolean;
}

export function CategoryChips({ value, onChange, includeAll = false }: Props) {
  const theme = useTheme();
  const options: (Category | null)[] = includeAll ? [null, ...CATEGORIES] : [...CATEGORIES];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const selected = option === value;
        const label = option ? strings.categories[option] : strings.home.allCategories;
        return (
          <Pressable
            key={option ?? 'all'}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            style={[
              styles.chip,
              { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.surface },
            ]}
          >
            <Text style={[styles.text, { color: selected ? theme.onAccent : theme.text }]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 16 },
});
```

`src/ui/ImageField.tsx`:

```tsx
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { strings } from '../strings';
import { Button } from './Button';
import { Field } from './Field';
import { useTheme } from './theme';

interface Props {
  label: string;
  uri: string | null;
  onLibrary: () => void;
  onRemove?: () => void;
  error?: string;
  testIDPrefix: string;
}

export function ImageField({ label, uri, onLibrary, onRemove, error, testIDPrefix }: Props) {
  const theme = useTheme();
  return (
    <Field label={label} error={error}>
      <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={label} />
        ) : (
          <Text style={{ color: theme.muted, fontSize: 16 }}>{strings.edit.noImage}</Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button
          variant="secondary"
          label={strings.edit.chooseFromLibrary}
          onPress={onLibrary}
          testID={`${testIDPrefix}-library`}
        />
        {onRemove && (
          <Button variant="danger" label={strings.edit.removeBack} onPress={onRemove} testID={`${testIDPrefix}-remove`} />
        )}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  preview: {
    aspectRatio: 1.586,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
```

`src/ui/ExpiryField.tsx`:

```tsx
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { formatDate, fromIsoDate, toIsoDate } from '../time/dates';
import { Button } from './Button';
import { Field } from './Field';

export function ExpiryField({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const date = value ? fromIsoDate(value) : new Date();

  const openAndroidDialog = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(toIsoDate(picked));
      },
    });

  return (
    <Field label={strings.edit.expiry}>
      {value === null ? (
        <Button
          variant="secondary"
          label={strings.edit.addExpiry}
          onPress={Platform.OS === 'android' ? openAndroidDialog : () => onChange(toIsoDate(new Date()))}
        />
      ) : (
        <View style={styles.row}>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              accessibilityLabel={strings.edit.expiry}
              onChange={(_event, picked) => picked && onChange(toIsoDate(picked))}
            />
          ) : (
            <Button variant="secondary" label={formatDate(date.getTime())} onPress={openAndroidDialog} />
          )}
          <Button variant="secondary" label={strings.edit.clearExpiry} onPress={() => onChange(null)} />
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
});
```

- [ ] **Step 9: Implement the add/edit screen**

`app/edit/[id].tsx`:

```tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useApp } from '../../src/app/AppProvider';
import { draftFor, EditDraft, planSave, SaveError } from '../../src/cards/editForm';
import { NAME_MAX_LENGTH } from '../../src/config';
import { dataUri, useCardImage } from '../../src/hooks/useCardImage';
import { pickImage } from '../../src/images/capture';
import { requestReminderPermissionOnce } from '../../src/reminders/scheduler';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { CategoryChips } from '../../src/ui/CategoryChips';
import { ExpiryField } from '../../src/ui/ExpiryField';
import { Field, useInputStyle } from '../../src/ui/Field';
import { ImageField } from '../../src/ui/ImageField';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

export default function EditCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { services, cards, unlocked, refresh } = useApp();
  const existing = isNew ? null : (cards.find((c) => c.id === id) ?? null);
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();

  const [draft, setDraft] = useState<EditDraft>(() => draftFor(existing));
  const [errors, setErrors] = useState<SaveError[]>([]);
  const [saving, setSaving] = useState(false);
  const existingFront = useCardImage(existing ?? undefined, 'front');
  const existingBack = useCardImage(existing?.hasBack ? existing : undefined, 'back');

  const update = (patch: Partial<EditDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const errorText = (e: SaveError) => (errors.includes(e) ? strings.edit.errors[e] : undefined);

  if (!isNew && !existing) {
    return (
      <Text style={[styles.content, { color: theme.text, fontSize: 18 }]}>{strings.edit.notFound}</Text>
    );
  }

  const capture = async (side: 'front' | 'back') => {
    try {
      const captured = await pickImage();
      if (!captured) return;
      if (side === 'front') update({ front: captured });
      else update({ back: captured, removeBack: false });
    } catch (e) {
      console.warn('Capture failed', e);
      Alert.alert(strings.edit.captureFailed);
    }
  };

  const save = async () => {
    const plan = planSave(draft, { existing, cardCount: cards.length, unlocked });
    if (plan.kind === 'invalid') {
      setErrors(plan.errors);
      return;
    }
    if (plan.kind === 'limit-reached') {
      router.replace('/paywall');
      return;
    }
    setSaving(true);
    try {
      if (plan.kind === 'create') await services.store.create(plan.fields, plan.images);
      else await services.store.update(plan.id, plan.fields, plan.changes);
      if (plan.fields.expiresOn) await requestReminderPermissionOnce();
      await refresh();
      router.back();
    } catch (e) {
      console.warn('Save failed', e);
      setSaving(false);
      Alert.alert(strings.common.error);
    }
  };

  const confirmDelete = () =>
    Alert.alert(strings.edit.deleteConfirmTitle, strings.edit.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          if (!existing) return;
          await services.store.remove(existing.id);
          await refresh();
          router.dismissAll();
        },
      },
    ]);

  const frontUri = draft.front ? dataUri(draft.front.jpegBase64) : existingFront;
  const backUri = draft.back ? dataUri(draft.back.jpegBase64) : draft.removeBack ? null : existingBack;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isNew ? strings.edit.newTitle : strings.edit.editTitle }} />
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ImageField
          label={strings.edit.front}
          uri={frontUri}
          onLibrary={() => capture('front')}
          error={errorText('front-required')}
          testIDPrefix="front"
        />
        <ImageField
          label={strings.edit.back}
          uri={backUri}
          onLibrary={() => capture('back')}
          onRemove={backUri ? () => update({ back: null, removeBack: true }) : undefined}
          testIDPrefix="back"
        />
        <Field label={strings.edit.name} error={errorText('name-required') ?? errorText('name-too-long')}>
          <TextInput
            testID="card-name"
            value={draft.name}
            onChangeText={(name) => update({ name })}
            placeholder={strings.edit.namePlaceholder}
            placeholderTextColor={theme.muted}
            maxLength={NAME_MAX_LENGTH}
            accessibilityLabel={strings.edit.name}
            style={inputStyle}
          />
        </Field>
        <Field label={strings.edit.category} error={errorText('bad-category')}>
          <CategoryChips value={draft.category} onChange={(category) => category && update({ category })} />
        </Field>
        <Field label={strings.edit.number}>
          <TextInput
            value={draft.number}
            onChangeText={(number) => update({ number })}
            autoCorrect={false}
            autoCapitalize="characters"
            accessibilityLabel={strings.edit.number}
            style={[inputStyle, { fontVariant: ['tabular-nums'] }]}
          />
        </Field>
        <Field label={strings.edit.notes}>
          <TextInput
            value={draft.notes}
            onChangeText={(notes) => update({ notes })}
            multiline
            accessibilityLabel={strings.edit.notes}
            style={[inputStyle, { minHeight: 96, textAlignVertical: 'top' }]}
          />
        </Field>
        <ExpiryField value={draft.expiresOn} onChange={(expiresOn) => update({ expiresOn })} />
        {errorText('bad-expiry') && <Text style={{ color: theme.danger, fontSize: 16 }}>{errorText('bad-expiry')}</Text>}
        <Button label={strings.common.save} onPress={save} disabled={saving} testID="save-card" />
        {existing && <Button variant="danger" label={strings.edit.deleteCard} onPress={confirmDelete} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 48 },
});
```

- [ ] **Step 10: Register the route**

In `app/_layout.tsx`, directly below `<Stack.Screen name="index" … />`, add:

```tsx
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
```

- [ ] **Step 11: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; all suites PASS.

- [ ] **Step 12: Try it on the simulator**

Run: `npx expo run:ios` (a rebuild is needed for the new native modules)
Expected:
1. **Add card** → the form opens as a modal.
2. **Save** with nothing filled in → "Give the card a name." and "Add a photo of the front." appear.
3. Front → **Choose from library** → the photo-permission prompt appears, then a sample photo → a freeform crop screen (drag any corner independently) → Choose → the cropped image appears in the Front box.
4. Name "Gym", category Membership, **Add expiry date** → a compact date picker appears → **Save** → the notification-permission prompt appears (first time only) → the modal closes and "Gym" is listed.
5. Check that nothing readable is on disk:
   ```bash
   ls "$(xcrun simctl get_app_container booted com.hamza.cardholder data)/Documents/cards"
   file "$(xcrun simctl get_app_container booted com.hamza.cardholder data)"/Documents/cards/*
   ```
   Expected: three files per card (`.front`, `.thumb`, plus `.back` if it has one), all reported as `data`, none as `JPEG image data`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add and edit cards from the photo library with freeform crop"
```

---

### Task 13: Counter view

**Files:**
- Create: `app/card/[id].tsx`, `src/ui/ZoomableImage.tsx`, `src/hooks/useMaxBrightness.ts`, `src/hooks/useCardOrientation.ts`, `src/share/fileNames.ts`, `src/share/shareFiles.ts`, `src/share/shareCard.ts`, `src/app/NotificationRouter.tsx`
- Modify: `app/_layout.tsx` (route, notification routing, share-cache cleanup)
- Test: `src/hooks/__tests__/useMaxBrightness.test.tsx`, `src/share/__tests__/fileNames.test.ts`

**Interfaces:**
- Consumes: `useApp` (Task 11); `useCardImage` (Task 12); `Button` (Task 11); `CardStore` (Task 6); `Card` (Task 5); `base64` (Task 2); `toIsoDate` (Task 5); `strings` (Task 1).
- Produces:
  - `useMaxBrightness(): void` — full brightness while mounted; restores on unmount and whenever the app leaves the foreground
  - `orientationForAspect(aspect: number)`, `useCardOrientation(aspect: number): void` — landscape when `aspect > 1`
  - `ZoomableImage({ uri, onTap, onSwipe, accessibilityLabel, accessibilityHint })`
  - `safeFileName(name: string): string`, `cardImageFileName(name: string, side: 'front' | 'back'): string`, `backupFileName(date: Date): string`
  - `clearShareCache(): void`, `shareFiles(files: Array<{ name: string; bytes: Uint8Array }>, mimeType: string): Promise<boolean>` — `true` when the share sheet reports success
  - `shareCardImages(store: CardStore, card: Card): Promise<void>`
  - `NotificationRouter` — opens `/card/<cardId>` when a reminder is tapped
  - Screen `/card/[id]`; testIDs `card-view`, `card-side` (text "Front"/"Back"), `flip-button`, `close-card`

- [ ] **Step 1: Install counter-view packages**

```bash
npx expo install expo-brightness expo-keep-awake react-native-share
```

- [ ] **Step 2: Write the failing tests**

`src/share/__tests__/fileNames.test.ts`:

```ts
import { backupFileName, cardImageFileName, safeFileName } from '../fileNames';

test('safeFileName keeps letters, digits, spaces as dashes', () => {
  expect(safeFileName('Emirates ID')).toBe('Emirates-ID');
  expect(safeFileName('  Café  Card #1 ')).toBe('Cafe-Card-1');
  expect(safeFileName('../../etc/passwd')).toBe('etcpasswd');
});

test('names with no usable characters fall back to "card"', () => {
  expect(safeFileName('بطاقة')).toBe('card');
  expect(safeFileName('   ')).toBe('card');
});

test('long names are truncated', () => {
  expect(safeFileName('x'.repeat(100))).toHaveLength(40);
});

test('card image and backup file names', () => {
  expect(cardImageFileName('Emirates ID', 'back')).toBe('Emirates-ID-back.jpg');
  expect(backupFileName(new Date(2026, 9, 19, 23, 59))).toBe('CardHolder-backup-2026-10-19.cardholder');
});
```

`src/hooks/__tests__/useMaxBrightness.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react-native';
import * as Brightness from 'expo-brightness';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useMaxBrightness } from '../useMaxBrightness';

jest.mock('expo-brightness', () => ({
  getBrightnessAsync: jest.fn(async () => 0.35),
  setBrightnessAsync: jest.fn(async () => {}),
  restoreSystemBrightnessAsync: jest.fn(async () => {}),
}));

const mocked = Brightness as jest.Mocked<typeof Brightness>;
let emitAppState: (state: AppStateStatus) => void = () => {};
let appStateSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    emitAppState = listener as (state: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

// Restore only what this file spied on; restoreAllMocks would also strip the jest.mock implementations above.
afterEach(() => appStateSpy.mockRestore());

const flush = () => act(async () => {});

test('iOS: full brightness while shown, previous level restored on exit', async () => {
  const { unmount } = renderHook(() => useMaxBrightness());
  await flush();
  expect(mocked.setBrightnessAsync).toHaveBeenLastCalledWith(1);
  unmount();
  await flush();
  expect(mocked.setBrightnessAsync).toHaveBeenLastCalledWith(0.35);
});

test('restores when the app leaves the foreground and raises again on return', async () => {
  renderHook(() => useMaxBrightness());
  await flush();
  await act(async () => emitAppState('background'));
  expect(mocked.setBrightnessAsync).toHaveBeenLastCalledWith(0.35);
  await act(async () => emitAppState('active'));
  expect(mocked.setBrightnessAsync).toHaveBeenLastCalledWith(1);
});

test('Android: hands brightness back to the system on exit', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  try {
    const { unmount } = renderHook(() => useMaxBrightness());
    await flush();
    expect(mocked.getBrightnessAsync).not.toHaveBeenCalled();
    expect(mocked.setBrightnessAsync).toHaveBeenLastCalledWith(1);
    unmount();
    await flush();
    expect(mocked.restoreSystemBrightnessAsync).toHaveBeenCalled();
  } finally {
    platform.restore();
  }
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/share src/hooks`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement file names**

`src/share/fileNames.ts`:

```ts
import { toIsoDate } from '../time/dates';

export function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return cleaned || 'card';
}

export function cardImageFileName(name: string, side: 'front' | 'back'): string {
  return `${safeFileName(name)}-${side}.jpg`;
}

export function backupFileName(date: Date): string {
  return `CardHolder-backup-${toIsoDate(date)}.cardholder`;
}
```

- [ ] **Step 5: Implement the brightness hook**

`src/hooks/useMaxBrightness.ts`:

```ts
import * as Brightness from 'expo-brightness';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

// iOS changes the real screen brightness, so we remember and restore it.
// Android only overrides this window; restoreSystemBrightnessAsync hands control back.
export function useMaxBrightness(): void {
  useEffect(() => {
    let previous: number | null = null;

    const raise = async () => {
      try {
        if (Platform.OS === 'ios' && previous === null) previous = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch (e) {
        console.warn('Could not raise brightness', e);
      }
    };

    const restore = async () => {
      try {
        if (Platform.OS === 'android') {
          await Brightness.restoreSystemBrightnessAsync();
        } else if (previous !== null) {
          const level = previous;
          previous = null;
          await Brightness.setBrightnessAsync(level);
        }
      } catch (e) {
        console.warn('Could not restore brightness', e);
      }
    };

    raise();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') raise();
      else restore();
    });
    return () => {
      subscription.remove();
      restore();
    };
  }, []);
}
```

- [ ] **Step 6: Run the tests**

Run: `npx jest src/share src/hooks`
Expected: all PASS.

- [ ] **Step 7: Implement orientation, sharing and zoom**

`src/hooks/useCardOrientation.ts`:

```ts
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

export function orientationForAspect(aspect: number) {
  return aspect > 1 ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP;
}

export function useCardOrientation(aspect: number): void {
  useEffect(() => {
    ScreenOrientation.lockAsync(orientationForAspect(aspect)).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [aspect]);
}
```

`src/share/shareFiles.ts`:

```ts
import { Directory, File, Paths } from 'expo-file-system';
import Share from 'react-native-share';

const shareDir = () => new Directory(Paths.cache, 'share');

// Decrypted copies only ever live here, and only until the next share or the next launch.
export function clearShareCache(): void {
  const dir = shareDir();
  if (dir.exists) dir.delete();
}

export async function shareFiles(files: Array<{ name: string; bytes: Uint8Array }>, mimeType: string): Promise<boolean> {
  clearShareCache();
  const dir = shareDir();
  dir.create({ intermediates: true });
  const urls = files.map(({ name, bytes }) => {
    const f = new File(dir, name);
    f.create();
    f.write(bytes);
    return f.uri;
  });
  const result = await Share.open({ urls, type: mimeType, failOnCancel: false });
  return result.success;
}
```

`src/share/shareCard.ts`:

```ts
import { CardStore } from '../cards/cardStore';
import { Card } from '../cards/types';
import { base64 } from '../crypto/bytes';
import { cardImageFileName } from './fileNames';
import { shareFiles } from './shareFiles';

export async function shareCardImages(store: CardStore, card: Card): Promise<void> {
  const files: Array<{ name: string; bytes: Uint8Array }> = [];
  const front = await store.loadImage(card.id, 'front');
  if (front) files.push({ name: cardImageFileName(card.name, 'front'), bytes: base64.decode(front) });
  if (card.hasBack) {
    const back = await store.loadImage(card.id, 'back');
    if (back) files.push({ name: cardImageFileName(card.name, 'back'), bytes: base64.decode(back) });
  }
  if (files.length > 0) await shareFiles(files, 'image/jpeg');
}
```

`src/ui/ZoomableImage.tsx`:

```tsx
import { Image, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MAX_SCALE = 5;
const SWIPE_DISTANCE = 60;

interface Props {
  uri: string;
  onTap: () => void;
  onSwipe: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export function ZoomableImage({ uri, onTap, onSwipe, accessibilityLabel, accessibilityHint }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedScale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1.01) reset();
      else savedScale.value = scale.value;
    });

  // Zoomed in: pan moves the image. Not zoomed: a horizontal swipe flips the card.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        x.value = savedX.value + e.translationX;
        y.value = savedY.value + e.translationY;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        savedX.value = x.value;
        savedY.value = y.value;
      } else if (Math.abs(e.translationX) > SWIPE_DISTANCE) {
        runOnJS(onSwipe)();
      }
    });

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success && savedScale.value <= 1) runOnJS(onTap)();
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, tap)}>
      <Animated.View
        style={[StyleSheet.absoluteFill, style]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ image: { flex: 1, width: '100%' } });
```

- [ ] **Step 8: Implement the counter view**

`app/card/[id].tsx`:

```tsx
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { useCardImage } from '../../src/hooks/useCardImage';
import { useCardOrientation } from '../../src/hooks/useCardOrientation';
import { useMaxBrightness } from '../../src/hooks/useMaxBrightness';
import { shareCardImages } from '../../src/share/shareCard';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { ZoomableImage } from '../../src/ui/ZoomableImage';

export default function CardView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, services, refresh } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const card = cards.find((c) => c.id === id);
  const [side, setSide] = useState<'front' | 'back'>('front');

  useKeepAwake();
  useMaxBrightness();
  useCardOrientation(card?.frontAspect ?? 1);
  // Decrypt both sides up front so the flip never stalls on the back image.
  const frontUri = useCardImage(card, 'front');
  const backUri = useCardImage(card?.hasBack ? card : undefined, 'back');
  const uri = side === 'front' ? frontUri : backUri;

  // The one piece of motion in the app: the card turns over, swapping sides at the edge-on midpoint.
  const rotation = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const hasBack = card?.hasBack ?? false;
  const flip = useCallback(() => {
    if (!hasBack) return;
    const swap = () => setSide((s) => (s === 'front' ? 'back' : 'front'));
    if (reduceMotion) {
      swap();
      return;
    }
    rotation.value = withTiming(90, { duration: 140 }, (finished) => {
      if (!finished) return;
      runOnJS(swap)();
      rotation.value = -90;
      rotation.value = withTiming(0, { duration: 140 });
    });
  }, [hasBack, reduceMotion, rotation]);
  const flipStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value}deg` }],
  }));

  if (!card) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.message}>{strings.card.notFound}</Text>
        <Button label={strings.common.close} onPress={() => router.back()} />
      </View>
    );
  }

  const sideLabel = side === 'front' ? strings.card.front : strings.card.back;

  const togglePin = async () => {
    await services.store.setPinned(card.id, !card.pinned);
    await refresh();
  };

  const share = () => {
    const go = () =>
      shareCardImages(services.store, card).catch((e) => {
        console.warn('Share failed', e);
        Alert.alert(strings.common.error);
      });
    if (card.category === 'id') {
      Alert.alert(strings.card.shareIdTitle, strings.card.shareIdBody, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.card.share, onPress: go },
      ]);
    } else {
      go();
    }
  };

  return (
    <View style={styles.root} testID="card-view">
      <StatusBar hidden />
      <Animated.View style={[StyleSheet.absoluteFill, flipStyle]}>
      {uri ? (
        <ZoomableImage
          key={side}
          uri={uri}
          onTap={flip}
          onSwipe={flip}
          accessibilityLabel={strings.card.imageLabel(card.name, sideLabel)}
          accessibilityHint={strings.card.imageHint}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}
      </Animated.View>
      <View style={[styles.toolbar, { top: insets.top + 8, left: insets.left + 8, right: insets.right + 8 }]}>
        <ToolButton label={strings.common.close} onPress={() => router.back()} testID="close-card" />
        <Text style={styles.sideLabel} testID="card-side">
          {sideLabel}
        </Text>
        <View style={styles.group}>
          {card.hasBack && <ToolButton label={strings.card.flip} onPress={flip} testID="flip-button" />}
          <ToolButton label={card.pinned ? strings.card.unpin : strings.card.pin} onPress={togglePin} />
          <ToolButton label={strings.card.share} onPress={share} />
          <ToolButton label={strings.card.edit} onPress={() => router.push(`/edit/${card.id}`)} />
        </View>
      </View>
    </View>
  );
}

function ToolButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [styles.tool, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

// The counter view is always dark, whatever the system theme, so the card stands out.
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  message: { color: '#FFFFFF', fontSize: 18, textAlign: 'center' },
  toolbar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  toolText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sideLabel: { color: '#FFFFFF', fontSize: 16, opacity: 0.8 },
});
```

- [ ] **Step 9: Route reminder taps to the card**

`src/app/NotificationRouter.tsx`:

```tsx
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

export function NotificationRouter() {
  const response = Notifications.useLastNotificationResponse();
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const requestId = response.notification.request.identifier;
    const cardId = response.notification.request.content.data?.cardId;
    if (typeof cardId !== 'string' || handled.current === requestId) return;
    handled.current = requestId;
    router.push(`/card/${cardId}`);
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
  }, [response, router]);

  return null;
}
```

(If `tsc` says `clearLastNotificationResponseAsync` doesn't exist in the installed expo-notifications, delete that line — the `handled` ref already prevents repeat navigation.)

- [ ] **Step 10: Wire it into the layout**

In `app/_layout.tsx`:

1. Add imports:
   ```tsx
   import { NotificationRouter } from '../src/app/NotificationRouter';
   import { clearShareCache } from '../src/share/shareFiles';
   ```
2. In `RootLayout`'s `useEffect`, add as the first line:
   ```tsx
       clearShareCache();
   ```
3. Below the `edit/[id]` line, add:
   ```tsx
           <Stack.Screen name="card/[id]" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
   ```
4. Directly after the closing `</Stack>`, add:
   ```tsx
         <NotificationRouter />
   ```

- [ ] **Step 11: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; all suites PASS.

- [ ] **Step 12: Try it**

Rebuild with `npx expo run:ios`. Add a card with a landscape-shaped front and a back, then:
1. Tap the card in the list → black full-screen view, rotated to landscape, "Front" label.
2. Tap the image → the card turns over (a quick 3D flip) to "Back". Swipe left on it → "Front" again. With Settings → Accessibility → Motion → Reduce Motion on, it switches instantly instead. Pinch to zoom in, pan around; while zoomed, a tap doesn't flip. Pinch back out → it snaps to fit.
3. **Share** on a card in the ID category → "Share this ID?" confirmation → share sheet with two JPEGs (front, back).
4. **Edit** → change the name → Save → back in the counter view with the new name in the accessibility label (check with Accessibility Inspector).
5. **Close** → back in portrait.
6. On a physical device (the simulator has no brightness): the screen goes to full brightness on open and back to the previous level on Close and when you swipe home; the screen doesn't dim while it's open.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: full-screen counter view with zoom, flip, brightness and share"
```

---

### Task 14: Home screen

**Files:**
- Create: `src/ui/CardTile.tsx`, `src/ui/CardRow.tsx`, `src/ui/BackupBanner.tsx`, `src/ui/Rosette.tsx`, `src/backup/useBackupNudge.ts`
- Replace: `app/index.tsx`
- Test: `src/ui/__tests__/Rosette.test.ts`

**Interfaces:**
- Consumes: `useApp` (Task 11); `sortCards`, `splitPinned`, `filterCards` (Task 5); `canAddCard` (Task 7); `readNudgeInput`, `shouldNudgeBackup`, `snoozeBackupNudge` (Task 7); `useCardImage` (Task 12); `CategoryChips` (Task 12); `Button`, `useTheme` (Task 11); `strings` (Task 1).
- Produces:
  - `useBackupNudge(): { visible: boolean; snooze(): void }` — re-evaluated whenever cards change and whenever home regains focus
  - `CardTile({ card, onPress, onLongPress?, active?, onMove?(delta: -1 | 1) })` — large pinned tile; screen readers get **Move up / Move down** actions
  - `CardRow({ card, onPress })` — compact row
  - `BackupBanner({ onBackup, onDismiss })`
  - `cardRadius(width: number): number` — ISO ID-1 corner radius for a card drawn `width` wide
  - `rosettePath(size: number, rotation: number): string`, `Rosette({ size, color })` — the guilloche mark (empty state here, app-switcher cover in Task 17)
  - Home navigates to `/edit/new` (or `/paywall` at the limit), `/card/<id>`, `/export`, `/settings`, and `/import` after "Import backup" on the recovery screen. `/settings`, `/export` and `/import` arrive in Task 15 and `/paywall` in Task 16; until then those links show expo-router's "unmatched route" screen.

This task is UI composition over logic that's already unit-tested (sorting, filtering, the limit, the nudge rule). It's verified by typecheck, a manual pass now, and the Maestro flow in Task 19.

- [ ] **Step 1: Install drag-to-reorder**

```bash
npx expo install react-native-draggable-flatlist
```

- [ ] **Step 2: Implement the nudge hook**

`src/backup/useBackupNudge.ts`:

```ts
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useApp } from '../app/AppProvider';
import { readNudgeInput, shouldNudgeBackup, snoozeBackupNudge } from './nudge';

export function useBackupNudge(): { visible: boolean; snooze: () => void } {
  const { services, cards } = useApp();
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      readNudgeInput(services.store, services.settings, Date.now())
        .then((input) => live && setVisible(shouldNudgeBackup(input)))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [services, cards]),
  );

  const snooze = useCallback(() => {
    setVisible(false);
    snoozeBackupNudge(services.settings, Date.now()).catch(() => {});
  }, [services]);

  return { visible, snooze };
}
```

- [ ] **Step 3: Implement the list components**

`src/ui/__tests__/Rosette.test.ts`:

```ts
import { cardRadius } from '../CardTile';
import { rosettePath } from '../Rosette';

const points = (d: string) =>
  d.replace(/Z$/, '').slice(1).split('L').map((p) => p.split(' ').map(Number));

test('the rosette is a closed curve inside its box', () => {
  const pts = points(rosettePath(200, 0));
  expect(pts[0]).toEqual(pts[pts.length - 1]);
  for (const [x, y] of pts) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(200);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(200);
  }
});

test('rotation changes the curve', () => {
  expect(rosettePath(200, 0.1)).not.toBe(rosettePath(200, 0));
});

test('card corners follow ISO ID-1 (3.18 mm on 85.6 mm)', () => {
  expect(cardRadius(856)).toBeCloseTo(31.8, 1);
  expect(cardRadius(64)).toBeCloseTo(2.38, 2);
});
```

Run: `npx jest src/ui/__tests__/Rosette.test.ts`
Expected: FAIL — modules not found. Then add the components:

`src/ui/Rosette.tsx`:

```tsx
import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

// A guilloche rosette — the fine-line pattern printed on IDs and banknotes —
// drawn as a few slightly rotated epitrochoids.
const R = 10;
const r = 3;
const d = 5;
const STEPS = 900;
const LINES = 6;

export function rosettePath(size: number, rotation: number): string {
  const centre = size / 2;
  const scale = centre / (R + r + d);
  const k = (R + r) / r;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let path = '';
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * 2 * Math.PI * r; // R and r are coprime, so the curve closes after r turns
    const x = (R + r) * Math.cos(t) - d * Math.cos(k * t);
    const y = (R + r) * Math.sin(t) - d * Math.sin(k * t);
    const px = (centre + (x * cos - y * sin) * scale).toFixed(2);
    const py = (centre + (x * sin + y * cos) * scale).toFixed(2);
    path += `${i === 0 ? 'M' : 'L'}${px} ${py}`;
  }
  return `${path}Z`;
}

export function Rosette({ size, color }: { size: number; color: string }) {
  const paths = useMemo(
    () => Array.from({ length: LINES }, (_, i) => rosettePath(size, (i * Math.PI) / 39)),
    [size],
  );
  return (
    <Svg width={size} height={size} accessible={false} importantForAccessibility="no-hide-descendants">
      {paths.map((path, i) => (
        <Path key={i} d={path} stroke={color} strokeWidth={0.75} fill="none" />
      ))}
    </Svg>
  );
}
```

`src/ui/CardTile.tsx`:

```tsx
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { Text } from './Text';
import { useTheme } from './theme';

// ISO/IEC 7810 ID-1: 3.18 mm corner radius on an 85.6 mm wide card.
export const cardRadius = (width: number) => (width * 3.18) / 85.6;

const SIDE_PADDING = 16;

interface Props {
  card: Card;
  onPress: () => void;
  onLongPress?: () => void;
  active?: boolean;
  onMove?: (delta: -1 | 1) => void;
}

// No box around the tile: the card photo is the card.
export function CardTile({ card, onPress, onLongPress, active = false, onMove }: Props) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  const width = useWindowDimensions().width - SIDE_PADDING * 2;
  const radius = cardRadius(width);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      accessibilityRole="button"
      accessibilityLabel={strings.home.openCard(card.name)}
      accessibilityActions={
        onMove
          ? [{ name: 'activate' }, { name: 'moveUp', label: strings.home.moveUp }, { name: 'moveDown', label: strings.home.moveDown }]
          : undefined
      }
      onAccessibilityAction={(e) => {
        const action = e.nativeEvent.actionName;
        if (action === 'activate') onPress();
        else if (action === 'moveUp') onMove?.(-1);
        else if (action === 'moveDown') onMove?.(1);
      }}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View
        style={[
          styles.image,
          {
            borderRadius: radius,
            backgroundColor: theme.border,
            borderColor: active ? theme.selection : 'transparent',
          },
        ]}
      >
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </View>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {card.name}
      </Text>
      {card.number ? (
        <Text style={[styles.number, { color: theme.muted }]} numberOfLines={1}>
          {card.number}
        </Text>
      ) : (
        <Text style={[styles.meta, { color: theme.muted }]}>{strings.categories[card.category]}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { gap: 4, marginBottom: 20 },
  image: { aspectRatio: 1.586, overflow: 'hidden', borderWidth: 3 },
  name: { fontSize: 21, fontWeight: '600', marginTop: 6 },
  number: { fontSize: 16, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 16 },
});
```

`src/ui/CardRow.tsx`:

```tsx
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { cardRadius } from './CardTile';
import { Text } from './Text';
import { useTheme } from './theme';

const THUMB_WIDTH = 64;

export function CardRow({ card, onPress }: { card: Card; onPress: () => void }) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.home.openCard(card.name)}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.border }]}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </View>
      <View style={styles.text}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {card.name}
        </Text>
        {card.number ? (
          <Text style={[styles.number, { color: theme.muted }]} numberOfLines={1}>
            {card.number}
          </Text>
        ) : (
          <Text style={[styles.meta, { color: theme.muted }]}>{strings.categories[card.category]}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: THUMB_WIDTH, aspectRatio: 1.586, borderRadius: cardRadius(THUMB_WIDTH), overflow: 'hidden' },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '600' },
  number: { fontSize: 14, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 14 },
});
```

`src/ui/BackupBanner.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { strings } from '../strings';
import { Button } from './Button';
import { useTheme } from './theme';

export function BackupBanner({ onBackup, onDismiss }: { onBackup: () => void; onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.bannerBg, borderColor: theme.rosette }]} accessibilityRole="summary">
      <Text style={[styles.title, { color: theme.bannerText }]}>{strings.backupBanner.title}</Text>
      <Text style={[styles.body, { color: theme.bannerText }]}>{strings.backupBanner.body}</Text>
      <View style={styles.actions}>
        <Button label={strings.backupBanner.action} onPress={onBackup} />
        <Button variant="secondary" label={strings.backupBanner.dismiss} onPress={onDismiss} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
```

- [ ] **Step 4: Replace the home screen**

`app/index.tsx`:

```tsx
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/app/AppProvider';
import { useBackupNudge } from '../src/backup/useBackupNudge';
import { filterCards, sortCards, splitPinned } from '../src/cards/listing';
import { Card, Category } from '../src/cards/types';
import { canAddCard } from '../src/purchases/limits';
import { strings } from '../src/strings';
import { BackupBanner } from '../src/ui/BackupBanner';
import { Button } from '../src/ui/Button';
import { CardRow } from '../src/ui/CardRow';
import { CardTile } from '../src/ui/CardTile';
import { CategoryChips } from '../src/ui/CategoryChips';
import { Rosette } from '../src/ui/Rosette';
import { FONT, Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';

export default function Home() {
  const { services, cards, unlocked, refresh, openImportOnReady, clearOpenImport } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nudge = useBackupNudge();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const sorted = useMemo(() => sortCards(cards), [cards]);
  const { pinned, others } = useMemo(() => splitPinned(sorted), [sorted]);
  const [pinnedOrder, setPinnedOrder] = useState(pinned);
  useEffect(() => setPinnedOrder(pinned), [pinned]);
  const filtering = query.trim() !== '' || category !== null;
  const results = useMemo(() => filterCards(sorted, { query, category }), [sorted, query, category]);

  // "Import backup" on the recovery screen lands here first, then opens the import flow.
  useEffect(() => {
    if (!openImportOnReady) return;
    clearOpenImport();
    router.push('/import');
  }, [openImportOnReady, clearOpenImport, router]);

  const addCard = () => router.push(canAddCard(cards.length, unlocked) ? '/edit/new' : '/paywall');
  const openCard = (card: Card) => router.push(`/card/${card.id}`);

  const savePinnedOrder = async (ordered: Card[]) => {
    setPinnedOrder(ordered);
    await services.store.reorderPinned(ordered.map((c) => c.id));
    await refresh();
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= pinnedOrder.length) return;
    const next = [...pinnedOrder];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    savePinnedOrder(next);
  };

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={strings.home.settings}
            hitSlop={12}
          >
            <Text style={{ color: theme.accent, fontSize: 18 }}>{strings.home.settings}</Text>
          </Pressable>
        ),
      }}
    />
  );

  if (cards.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.bg }]}>
        {header}
        <View style={styles.rosette}>
          <Rosette size={220} color={theme.rosette} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]} accessibilityRole="header">
          {strings.home.emptyTitle}
        </Text>
        <Text style={[styles.promise, { color: theme.muted }]}>{strings.promise}</Text>
        <Button label={strings.home.addCard} onPress={addCard} testID="add-card" />
      </View>
    );
  }

  const renderPinned = ({ item, drag, isActive, getIndex }: RenderItemParams<Card>) => (
    <ScaleDecorator>
      <CardTile
        card={item}
        onPress={() => openCard(item)}
        onLongPress={drag}
        active={isActive}
        onMove={(delta) => move(getIndex() ?? 0, delta)}
      />
    </ScaleDecorator>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {header}
      <NestableScrollContainer
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
      >
        {nudge.visible && <BackupBanner onBackup={() => router.push('/export')} onDismiss={nudge.snooze} />}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={strings.home.searchPlaceholder}
          placeholderTextColor={theme.muted}
          accessibilityLabel={strings.home.searchLabel}
          clearButtonMode="while-editing"
          autoCorrect={false}
          style={[styles.search, { color: theme.text, borderColor: theme.rosette }]}
        />
        <CategoryChips value={category} onChange={setCategory} includeAll />

        {filtering ? (
          <>
            <SectionTitle title={strings.home.results} />
            {results.length === 0 ? (
              <Text style={[styles.hint, { color: theme.muted }]}>{strings.home.noResults}</Text>
            ) : (
              results.map((c) => <CardRow key={c.id} card={c} onPress={() => openCard(c)} />)
            )}
          </>
        ) : (
          <>
            {pinnedOrder.length > 0 && (
              <SectionTitle
                title={strings.home.pinned}
                hint={pinnedOrder.length > 1 ? strings.home.reorderHint : undefined}
              />
            )}
            <NestableDraggableFlatList
              data={pinnedOrder}
              keyExtractor={(c) => c.id}
              renderItem={renderPinned}
              onDragEnd={({ data }) => savePinnedOrder(data)}
            />
            {others.length > 0 && <SectionTitle title={strings.home.allCards} />}
            {others.map((c) => (
              <CardRow key={c.id} card={c} onPress={() => openCard(c)} />
            ))}
          </>
        )}
      </NestableScrollContainer>
      <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
        <Button label={strings.home.addCard} onPress={addCard} testID="add-card" />
      </View>
    </View>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  rosette: { alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 36, fontWeight: '700', textAlign: 'center' },
  promise: { fontSize: 18, textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  search: { minHeight: 48, borderBottomWidth: 1, paddingHorizontal: 2, fontSize: 18, fontFamily: FONT.regular },
  section: { marginTop: 8, gap: 2 },
  sectionTitle: { fontSize: 21, fontWeight: '700' },
  hint: { fontSize: 14 },
  fab: { position: 'absolute', right: 16, left: 16 },
});
```

- [ ] **Step 5: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; all suites PASS.

- [ ] **Step 6: Try it**

Rebuild with `npx expo run:ios`. With the cards from earlier tasks:
0. Empty state first (delete all cards or use a fresh simulator): the guilloche rosette sits above "Add your first card" in fine pale lines; in dark mode the lines are muted blue-grey.
1. The banner "Back up your cards" shows at the top (never exported). **Not now** hides it; it stays hidden after relaunching the app.
2. Pinned cards show as full-width card photos with real card corners and no frame, name below, card number below it (tabular figures) when there is one; long-press one and drag it (it gets a violet outline) to reorder, then relaunch — the order is kept.
3. Open a card, tap **Unpin**, close → it moves to "All cards", in alphabetical order.
4. Type part of a name or card number into search → a flat "Results" list; pick a category chip → it narrows further; "No cards match." when nothing does.
5. Turn on VoiceOver (Accessibility Inspector or Settings → Accessibility on device) on a pinned tile: swipe up/down offers "Move up"/"Move down", and both work.
6. Settings → Accessibility → Display & Text Size → Larger Text at max: text wraps and nothing is clipped.
7. Time to the counter: from the home screen, one tap on a pinned card shows it full-screen. (≤ 2 taps target met.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: home screen with pinned drag-reorder, search, filters and backup nudge"
```

---

### Task 15: Settings, export, import and privacy screens

**Files:**
- Create: `app/settings.tsx`, `app/export.tsx`, `app/import.tsx`, `app/privacy.tsx`
- Modify: `app/_layout.tsx` (routes)

**Interfaces:**
- Consumes: `useApp` (Task 11); `buildSnapshot`, `applySnapshot`, `ImportMode` (Task 9); `encodeBackup`, `decodeBackup`, `BackupError`, `BackupSnapshot` (Task 8); `validateNewPassphrase` (Task 8); `recordExport` (Task 7); `shareFiles`, `backupFileName` (Task 13); `formatAgo`, `formatDate` (Task 5); `Field`, `useInputStyle` (Task 12); `Button`, `useTheme` (Task 11); `MIN_PASSPHRASE_LENGTH` (Task 1); `strings` (Task 1).
- Produces: routes `/settings`, `/export`, `/import`, `/privacy`. Task 16 replaces `app/settings.tsx` to add the purchases section.

All the backup logic (format, validation, merge/replace, nudge) is unit-tested in Tasks 7–9; this task is the screens over it, verified by hand.

- [ ] **Step 1: Install the document picker**

```bash
npx expo install expo-document-picker
```

- [ ] **Step 2: Settings screen**

`app/settings.tsx`:

```tsx
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { strings } from '../src/strings';
import { formatAgo } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { useTheme } from '../src/ui/theme';

export default function SettingsScreen() {
  const { services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [lastExportAt, setLastExportAt] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      services.settings.getNumber('lastExportAt').then(setLastExportAt).catch(() => {});
    }, [services]),
  );

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Section title={strings.settings.backup}>
        <Text style={[styles.body, { color: theme.muted }]}>
          {lastExportAt === null
            ? strings.settings.neverBackedUp
            : strings.settings.lastBackup(formatAgo(lastExportAt, Date.now()))}
        </Text>
        <Button label={strings.settings.exportBackup} onPress={() => router.push('/export')} />
        <Button variant="secondary" label={strings.settings.importBackup} onPress={() => router.push('/import')} />
      </Section>
      <Section title={strings.settings.about}>
        <Text style={[styles.body, { color: theme.text }]}>{strings.promise}</Text>
        <Button variant="secondary" label={strings.settings.privacyPolicy} onPress={() => router.push('/privacy')} />
        <Text style={[styles.body, { color: theme.muted }]}>
          {strings.settings.version(Constants.expoConfig?.version ?? '')}
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 12 },
  title: { fontSize: 21, fontWeight: '700' },
  body: { fontSize: 18 },
});
```

- [ ] **Step 3: Export screen**

`app/export.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { encodeBackup } from '../src/backup/backupFile';
import { buildSnapshot } from '../src/backup/backupService';
import { recordExport } from '../src/backup/nudge';
import { validateNewPassphrase } from '../src/backup/passphrase';
import { MIN_PASSPHRASE_LENGTH } from '../src/config';
import { backupFileName } from '../src/share/fileNames';
import { shareFiles } from '../src/share/shareFiles';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { useTheme } from '../src/ui/theme';

export default function ExportScreen() {
  const { services } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const problem = validateNewPassphrase(passphrase, confirmation);
    if (problem) {
      setError(problem === 'too-short' ? strings.export.tooShort(MIN_PASSPHRASE_LENGTH) : strings.export.mismatch);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const now = Date.now();
      const bytes = await encodeBackup(await buildSnapshot(services.store, now), passphrase);
      const shared = await shareFiles([{ name: backupFileName(new Date(now)), bytes }], 'application/octet-stream');
      if (shared) {
        await recordExport(services.settings, now);
        Alert.alert(strings.export.done);
        router.back();
      }
    } catch (e) {
      console.warn('Export failed', e);
      Alert.alert(strings.export.failed);
    } finally {
      setBusy(false);
    }
  };

  const passphraseInput = (value: string, onChange: (v: string) => void, label: string) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="none"
      accessibilityLabel={label}
      style={inputStyle}
    />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.body, { color: theme.text }]}>{strings.export.intro}</Text>
        <Text style={[styles.body, styles.warning, { color: theme.danger }]}>{strings.export.warning}</Text>
        <Field label={strings.export.passphrase}>
          {passphraseInput(passphrase, setPassphrase, strings.export.passphrase)}
        </Field>
        <Field label={strings.export.confirm} error={error ?? undefined}>
          {passphraseInput(confirmation, setConfirmation, strings.export.confirm)}
        </Field>
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.body, { color: theme.muted }]}>{strings.export.working}</Text>
          </View>
        ) : (
          <Button label={strings.export.action} onPress={run} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20 },
  body: { fontSize: 18 },
  warning: { fontWeight: '600' },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
```

- [ ] **Step 4: Import screen**

`app/import.tsx`:

```tsx
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { BackupError, BackupSnapshot, decodeBackup } from '../src/backup/backupFile';
import { applySnapshot, ImportMode } from '../src/backup/backupService';
import { recordExport } from '../src/backup/nudge';
import { strings } from '../src/strings';
import { formatDate } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { useTheme } from '../src/ui/theme';

type Step =
  | { kind: 'pick' }
  | { kind: 'unlock'; fileName: string; bytes: Uint8Array }
  | { kind: 'choose'; snapshot: BackupSnapshot };

export default function ImportScreen() {
  const { services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    const file = new File(asset.uri);
    try {
      setStep({ kind: 'unlock', fileName: asset.name, bytes: await file.bytes() });
    } catch {
      setError(strings.import.failed);
    } finally {
      try {
        file.delete();
      } catch {
        // The picker's cache copy; the OS clears it eventually.
      }
    }
  };

  const unlock = async () => {
    if (step.kind !== 'unlock' || passphrase.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await decodeBackup(step.bytes, passphrase);
      setPassphrase('');
      setStep({ kind: 'choose', snapshot });
    } catch (e) {
      setError(e instanceof BackupError ? strings.import.errors[e.code] : strings.import.failed);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (mode: ImportMode) => {
    if (step.kind !== 'choose') return;
    setBusy(true);
    try {
      const result = await applySnapshot(services.store, step.snapshot, mode);
      // A restored phone already has a backup: the file we just imported.
      if ((await services.settings.getNumber('lastExportAt')) === null) {
        await recordExport(services.settings, step.snapshot.exportedAt);
      }
      await refresh();
      Alert.alert(strings.import.done(result.added, result.skipped));
      router.dismissAll();
    } catch (e) {
      console.warn('Import failed', e);
      setBusy(false);
      Alert.alert(strings.import.failed);
    }
  };

  const confirmReplace = () =>
    Alert.alert(strings.import.replaceConfirmTitle, strings.import.replaceConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.import.replace, style: 'destructive', onPress: () => apply('replace') },
    ]);

  const busyRow = (
    <View style={styles.busy}>
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.body, { color: theme.muted }]}>{strings.import.working}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step.kind === 'pick' && <Button label={strings.import.pickFile} onPress={pickFile} />}

        {step.kind === 'unlock' && (
          <>
            <Text style={[styles.body, { color: theme.text }]}>{strings.import.fileChosen(step.fileName)}</Text>
            <Field label={strings.import.passphrase}>
              <TextInput
                value={passphrase}
                onChangeText={setPassphrase}
                onSubmitEditing={unlock}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={strings.import.passphrase}
                style={inputStyle}
              />
            </Field>
            {busy ? (
              busyRow
            ) : (
              <>
                <Button label={strings.import.unlock} onPress={unlock} disabled={passphrase.length === 0} />
                <Button variant="secondary" label={strings.import.pickFile} onPress={pickFile} />
              </>
            )}
          </>
        )}

        {step.kind === 'choose' && (
          <>
            <Text style={[styles.body, { color: theme.text }]}>
              {strings.import.summary(step.snapshot.cards.length, formatDate(step.snapshot.exportedAt))}
            </Text>
            {busy ? (
              busyRow
            ) : (
              <>
                <Button label={strings.import.merge} onPress={() => apply('merge')} accessibilityHint={strings.import.mergeHint} />
                <Text style={[styles.hint, { color: theme.muted }]}>{strings.import.mergeHint}</Text>
                <Button
                  variant="danger"
                  label={strings.import.replace}
                  onPress={confirmReplace}
                  accessibilityHint={strings.import.replaceHint}
                />
                <Text style={[styles.hint, { color: theme.muted }]}>{strings.import.replaceHint}</Text>
              </>
            )}
          </>
        )}

        {error && (
          <Text style={[styles.body, { color: theme.danger }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  body: { fontSize: 18 },
  hint: { fontSize: 16, marginTop: -8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
```

- [ ] **Step 5: Privacy policy screen**

`app/privacy.tsx`:

```tsx
import { ScrollView } from 'react-native';
import { Text } from '../src/ui/Text';
import { strings } from '../src/strings';
import { useTheme } from '../src/ui/theme';

export default function PrivacyScreen() {
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {strings.privacy.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={{ color: theme.text, fontSize: 18 }}>
          {paragraph}
        </Text>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 6: Register the routes**

In `app/_layout.tsx`, below the `card/[id]` line, add:

```tsx
        <Stack.Screen name="settings" options={{ title: strings.settings.title }} />
        <Stack.Screen name="export" options={{ title: strings.export.title, presentation: 'modal' }} />
        <Stack.Screen name="import" options={{ title: strings.import.title, presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ title: strings.privacy.title }} />
```

- [ ] **Step 7: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; all suites PASS.

- [ ] **Step 8: Try the full backup loop**

Rebuild with `npx expo run:ios`, with at least two cards (one with a back):
1. Home → **Settings** → "Never backed up". **Export backup** → passphrase "short" → "Use at least 8 characters." → mismatched passphrases → "The passphrases don't match." → matching 8+ characters → **Export** → "Encrypting…" for about a second → share sheet with `CardHolder-backup-<today>.cardholder` → **Save to Files** → "Backup exported." Settings now says "Last backup: today", and the home banner is gone.
2. **Import backup** → choose the saved file → wrong passphrase → "Wrong passphrase, or the file is damaged." → right passphrase → "2 cards in this backup, exported <date>." → **Merge with my cards** → "Added 0 cards, skipped 2 already on this phone."
3. Delete one card, import again, **Merge** → "Added 1 card, skipped 1 …"; the deleted card is back, with both images.
4. Import again → **Replace my cards** → confirmation → the list matches the backup exactly.
5. Pick some unrelated file (e.g. a PDF in Files) → enter any passphrase → "That file isn't a CardHolder backup."
6. **Privacy policy** shows the six paragraphs.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: settings, encrypted backup export and import screens"
```

---

### Task 16: One-time Unlimited purchase

**Files:**
- Create: `src/purchases/gateway.ts`, `src/purchases/expoIapGateway.ts`, `src/purchases/unlock.ts`, `src/purchases/useRestore.ts`, `app/paywall.tsx`
- Replace: `app/settings.tsx`
- Modify: `app/_layout.tsx` (route), `app.json` (plugin, if needed)
- Test: `src/purchases/__tests__/gateway.test.ts`, `src/purchases/__tests__/unlock.test.ts`

**Interfaces:**
- Consumes: `UNLOCK_PRODUCT_ID`, `FREE_CARD_LIMIT` (Task 1); `markUnlocked` (Task 7); `Settings` (Task 3); `useApp` (Task 11); `Button`, `useTheme` (Task 11); `formatAgo` (Task 5); `strings` (Task 1).
- Produces:
  - `type BuyResult = 'purchased' | 'pending' | 'cancelled' | 'failed'`
  - `interface PurchaseGateway { getPrice(): Promise<string | null>; buy(): Promise<BuyResult>; restore(): Promise<boolean> }`
  - `interface IapModule` (the slice of expo-iap used), `interface IapPurchase { productId: string; purchaseState?: string }`
  - `createIapGateway(iap: IapModule, productId?: string): PurchaseGateway` — connects lazily on first use (never at app launch); `restore()` finishes (acknowledges) every owned unlock transaction
  - `purchaseGateway: PurchaseGateway` (bound to expo-iap)
  - `purchaseUnlock(gateway, settings): Promise<BuyResult>`, `restoreUnlock(gateway, settings): Promise<boolean>` — both persist the unlock on success
  - `useRestore(onRestored?: () => void): { restore(): Promise<void>; restoring: boolean }`
  - Route `/paywall`

- [ ] **Step 1: Install expo-iap and confirm its API**

```bash
npx expo install expo-iap
```

Open `node_modules/expo-iap/README.md` (or the docs it links to) for the installed version and confirm these, which `IapModule` below assumes:
- `initConnection()`, `fetchProducts({ skus, type: 'in-app' })` returning products with `id` and `displayPrice`
- `requestPurchase({ request: { ios: { sku }, android: { skus } }, type: 'in-app' })`
- `purchaseUpdatedListener(cb)` / `purchaseErrorListener(cb)` returning `{ remove() }`; purchases have `productId` and `purchaseState`
- `finishTransaction({ purchase, isConsumable })`, `getAvailablePurchases()`
- the user-cancelled error code (`'user-cancelled'` in recent versions)
- whether `"expo-iap"` must be listed in `app.json` `plugins` — if so, add it.

If any name or argument shape differs, change only `IapModule` and the calls in `createIapGateway` to match; the tests below use a fake and won't need changes beyond names.

- [ ] **Step 2: Write the failing tests**

`src/purchases/__tests__/gateway.test.ts`:

```ts
import { createIapGateway, IapModule, IapPurchase } from '../gateway';

const SKU = 'cardholder.unlimited';
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeIap() {
  let onPurchase: ((p: IapPurchase) => void) | null = null;
  let onError: ((e: { code?: string }) => void) | null = null;
  const iap = {
    initConnection: jest.fn(async () => true),
    fetchProducts: jest.fn(async () => [{ id: SKU, displayPrice: '$2.99' }]),
    requestPurchase: jest.fn(async () => undefined),
    finishTransaction: jest.fn(async () => undefined),
    getAvailablePurchases: jest.fn(async (): Promise<IapPurchase[]> => []),
    purchaseUpdatedListener: jest.fn((listener: (p: IapPurchase) => void) => {
      onPurchase = listener;
      return { remove: jest.fn(() => (onPurchase = null)) };
    }),
    purchaseErrorListener: jest.fn((listener: (e: { code?: string }) => void) => {
      onError = listener;
      return { remove: jest.fn(() => (onError = null)) };
    }),
  };
  return {
    iap,
    gateway: createIapGateway(iap as unknown as IapModule, SKU),
    emitPurchase: (p: IapPurchase) => onPurchase?.(p),
    emitError: (e: { code?: string }) => onError?.(e),
    listening: () => onPurchase !== null || onError !== null,
  };
}

test('getPrice returns the store price and connects only once', async () => {
  const { iap, gateway } = fakeIap();
  expect(await gateway.getPrice()).toBe('$2.99');
  expect(await gateway.getPrice()).toBe('$2.99');
  expect(iap.initConnection).toHaveBeenCalledTimes(1);
});

test('getPrice is null when the store is unreachable, and retries next time', async () => {
  const { iap, gateway } = fakeIap();
  iap.initConnection.mockRejectedValueOnce(new Error('offline'));
  expect(await gateway.getPrice()).toBeNull();
  expect(await gateway.getPrice()).toBe('$2.99');
  expect(iap.initConnection).toHaveBeenCalledTimes(2);
});

test('a completed purchase is finished as non-consumable', async () => {
  const { iap, gateway, emitPurchase, listening } = fakeIap();
  const result = gateway.buy();
  await tick();
  const purchase = { productId: SKU, purchaseState: 'purchased' };
  emitPurchase(purchase);
  expect(await result).toBe('purchased');
  expect(iap.finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
  expect(listening()).toBe(false);
});

test('purchases of other products are ignored', async () => {
  const { gateway, emitPurchase } = fakeIap();
  const result = gateway.buy();
  await tick();
  emitPurchase({ productId: 'something.else', purchaseState: 'purchased' });
  emitPurchase({ productId: SKU, purchaseState: 'purchased' });
  expect(await result).toBe('purchased');
});

test('a pending purchase is reported and not finished', async () => {
  const { iap, gateway, emitPurchase } = fakeIap();
  const result = gateway.buy();
  await tick();
  emitPurchase({ productId: SKU, purchaseState: 'pending' });
  expect(await result).toBe('pending');
  expect(iap.finishTransaction).not.toHaveBeenCalled();
});

test('cancel and failure', async () => {
  const cancelled = fakeIap();
  const r1 = cancelled.gateway.buy();
  await tick();
  cancelled.emitError({ code: 'user-cancelled' });
  expect(await r1).toBe('cancelled');

  const failed = fakeIap();
  const r2 = failed.gateway.buy();
  await tick();
  failed.emitError({ code: 'network-error' });
  expect(await r2).toBe('failed');
});

test('restore finishes the unlock transaction', async () => {
  const { iap, gateway } = fakeIap();
  const owned = { productId: SKU, purchaseState: 'purchased' };
  iap.getAvailablePurchases.mockResolvedValueOnce([owned, { productId: 'other', purchaseState: 'purchased' }]);
  expect(await gateway.restore()).toBe(true);
  expect(iap.finishTransaction).toHaveBeenCalledTimes(1);
  expect(iap.finishTransaction).toHaveBeenCalledWith({ purchase: owned, isConsumable: false });
});

test('restore still succeeds if the transaction was already finished', async () => {
  const { iap, gateway } = fakeIap();
  iap.getAvailablePurchases.mockResolvedValueOnce([{ productId: SKU, purchaseState: 'purchased' }]);
  iap.finishTransaction.mockRejectedValueOnce(new Error('already acknowledged'));
  expect(await gateway.restore()).toBe(true);
});

test('restore ignores pending and unrelated purchases', async () => {
  const { gateway, iap } = fakeIap();
  iap.getAvailablePurchases.mockResolvedValueOnce([
    { productId: SKU, purchaseState: 'pending' },
    { productId: 'other', purchaseState: 'purchased' },
  ]);
  expect(await gateway.restore()).toBe(false);
});
```

`src/purchases/__tests__/unlock.test.ts`:

```ts
import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { isUnlocked } from '../entitlement';
import { BuyResult, PurchaseGateway } from '../gateway';
import { purchaseUnlock, restoreUnlock } from '../unlock';

async function settings() {
  const db = memoryDb();
  await migrate(db);
  return createSettings(db);
}

const gateway = (buy: BuyResult, restore: boolean): PurchaseGateway => ({
  getPrice: async () => '$2.99',
  buy: async () => buy,
  restore: async () => restore,
});

test('a completed purchase unlocks', async () => {
  const s = await settings();
  expect(await purchaseUnlock(gateway('purchased', false), s)).toBe('purchased');
  expect(await isUnlocked(s)).toBe(true);
});

test('pending, cancelled and failed purchases do not unlock', async () => {
  for (const result of ['pending', 'cancelled', 'failed'] as const) {
    const s = await settings();
    expect(await purchaseUnlock(gateway(result, false), s)).toBe(result);
    expect(await isUnlocked(s)).toBe(false);
  }
});

test('restore unlocks only when a purchase is found', async () => {
  const found = await settings();
  expect(await restoreUnlock(gateway('failed', true), found)).toBe(true);
  expect(await isUnlocked(found)).toBe(true);

  const none = await settings();
  expect(await restoreUnlock(gateway('failed', false), none)).toBe(false);
  expect(await isUnlocked(none)).toBe(false);
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/purchases`
Expected: FAIL — `Cannot find module '../gateway'` / `'../unlock'`.

- [ ] **Step 4: Implement the gateway**

`src/purchases/gateway.ts`:

```ts
import { UNLOCK_PRODUCT_ID } from '../config';

export type BuyResult = 'purchased' | 'pending' | 'cancelled' | 'failed';

export interface PurchaseGateway {
  getPrice(): Promise<string | null>;
  buy(): Promise<BuyResult>;
  restore(): Promise<boolean>;
}

export interface IapPurchase {
  productId: string;
  purchaseState?: string;
}

export interface IapSubscription {
  remove(): void;
}

// The slice of expo-iap this app uses. Injected so the flow is testable without a store.
export interface IapModule {
  initConnection(): Promise<unknown>;
  fetchProducts(args: { skus: string[]; type: 'in-app' }): Promise<Array<{ id: string; displayPrice: string }> | null | undefined>;
  requestPurchase(args: { request: { ios: { sku: string }; android: { skus: string[] } }; type: 'in-app' }): Promise<unknown>;
  finishTransaction(args: { purchase: IapPurchase; isConsumable: boolean }): Promise<unknown>;
  getAvailablePurchases(): Promise<IapPurchase[]>;
  purchaseUpdatedListener(listener: (purchase: IapPurchase) => void): IapSubscription;
  purchaseErrorListener(listener: (error: { code?: string }) => void): IapSubscription;
}

const CANCEL_CODES = new Set(['user-cancelled', 'E_USER_CANCELLED']);

export function createIapGateway(iap: IapModule, productId: string = UNLOCK_PRODUCT_ID): PurchaseGateway {
  // Connect lazily: the app only talks to the store from the paywall and Restore.
  let connection: Promise<unknown> | null = null;
  const connect = () => {
    connection ??= iap.initConnection().catch((e) => {
      connection = null;
      throw e;
    });
    return connection;
  };

  return {
    async getPrice() {
      try {
        await connect();
        const products = await iap.fetchProducts({ skus: [productId], type: 'in-app' });
        return products?.find((p) => p.id === productId)?.displayPrice ?? null;
      } catch {
        return null;
      }
    },

    async buy() {
      try {
        await connect();
      } catch {
        return 'failed';
      }
      return new Promise<BuyResult>((resolve) => {
        const subscriptions: IapSubscription[] = [];
        let settled = false;
        const settle = (result: BuyResult) => {
          if (settled) return;
          settled = true;
          subscriptions.forEach((s) => s.remove());
          resolve(result);
        };
        subscriptions.push(
          iap.purchaseUpdatedListener((purchase) => {
            if (purchase.productId !== productId) return;
            if (purchase.purchaseState === 'pending') {
              settle('pending');
              return;
            }
            // The user has paid either way; a failed finish is retried by Restore.
            iap.finishTransaction({ purchase, isConsumable: false }).then(
              () => settle('purchased'),
              () => settle('purchased'),
            );
          }),
          iap.purchaseErrorListener((error) =>
            settle(error.code !== undefined && CANCEL_CODES.has(error.code) ? 'cancelled' : 'failed'),
          ),
        );
        iap
          .requestPurchase({ request: { ios: { sku: productId }, android: { skus: [productId] } }, type: 'in-app' })
          .catch(() => settle('failed'));
      });
    },

    async restore() {
      await connect();
      const owned = (await iap.getAvailablePurchases()).filter(
        (p) => p.productId === productId && p.purchaseState !== 'pending',
      );
      // Google refunds purchases that aren't acknowledged within 3 days, so finish every one we see.
      for (const purchase of owned) {
        try {
          await iap.finishTransaction({ purchase, isConsumable: false });
        } catch {
          // Already finished.
        }
      }
      return owned.length > 0;
    },
  };
}
```

`src/purchases/unlock.ts`:

```ts
import { Settings } from '../storage/settings';
import { markUnlocked } from './entitlement';
import { BuyResult, PurchaseGateway } from './gateway';

export async function purchaseUnlock(gateway: PurchaseGateway, settings: Settings): Promise<BuyResult> {
  const result = await gateway.buy();
  if (result === 'purchased') await markUnlocked(settings);
  return result;
}

export async function restoreUnlock(gateway: PurchaseGateway, settings: Settings): Promise<boolean> {
  const restored = await gateway.restore();
  if (restored) await markUnlocked(settings);
  return restored;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx jest src/purchases`
Expected: all PASS.

- [ ] **Step 6: Bind to expo-iap and add the shared Restore behaviour**

`src/purchases/expoIapGateway.ts`:

```ts
import * as ExpoIap from 'expo-iap';
import { createIapGateway, IapModule } from './gateway';

// Shape checked against the installed expo-iap in Task 16 Step 1.
export const purchaseGateway = createIapGateway(ExpoIap as unknown as IapModule);
```

`src/purchases/useRestore.ts`:

```ts
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useApp } from '../app/AppProvider';
import { strings } from '../strings';
import { purchaseGateway } from './expoIapGateway';
import { restoreUnlock } from './unlock';

export function useRestore(onRestored?: () => void): { restore: () => Promise<void>; restoring: boolean } {
  const { services, refresh } = useApp();
  const [restoring, setRestoring] = useState(false);

  const restore = useCallback(async () => {
    setRestoring(true);
    try {
      if (await restoreUnlock(purchaseGateway, services.settings)) {
        await refresh();
        Alert.alert(strings.settings.restored);
        onRestored?.();
      } else {
        Alert.alert(strings.settings.restoreNone);
      }
    } catch {
      Alert.alert(strings.paywall.priceUnavailable);
    } finally {
      setRestoring(false);
    }
  }, [services, refresh, onRestored]);

  return { restore, restoring };
}
```

- [ ] **Step 7: Paywall screen**

`app/paywall.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { FREE_CARD_LIMIT } from '../src/config';
import { purchaseGateway } from '../src/purchases/expoIapGateway';
import { purchaseUnlock } from '../src/purchases/unlock';
import { useRestore } from '../src/purchases/useRestore';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { useTheme } from '../src/ui/theme';

export default function Paywall() {
  const { services, refresh } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [price, setPrice] = useState<string | null | undefined>(undefined); // undefined = still loading
  const [buying, setBuying] = useState(false);
  const { restore, restoring } = useRestore(() => router.back());

  useEffect(() => {
    let live = true;
    purchaseGateway.getPrice().then((p) => live && setPrice(p));
    return () => {
      live = false;
    };
  }, []);

  const buy = async () => {
    setBuying(true);
    try {
      const result = await purchaseUnlock(purchaseGateway, services.settings);
      if (result === 'purchased') {
        await refresh();
        Alert.alert(strings.paywall.purchased);
        router.back();
      } else if (result === 'pending') {
        Alert.alert(strings.paywall.pending);
      } else if (result === 'failed') {
        Alert.alert(strings.paywall.failed);
      }
    } finally {
      setBuying(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {strings.paywall.title}
      </Text>
      <Text style={[styles.body, { color: theme.text }]}>{strings.paywall.body(FREE_CARD_LIMIT)}</Text>
      {price === undefined ? (
        <View style={styles.row}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.body, { color: theme.muted }]}>{strings.paywall.loadingPrice}</Text>
        </View>
      ) : price === null ? (
        <Text style={[styles.body, { color: theme.danger }]}>{strings.paywall.priceUnavailable}</Text>
      ) : (
        <Button label={strings.paywall.buy(price)} onPress={buy} disabled={buying || restoring} testID="buy-unlock" />
      )}
      <Button variant="secondary" label={strings.paywall.restore} onPress={restore} disabled={buying || restoring} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 20 },
  title: { fontSize: 36, fontWeight: '700' },
  body: { fontSize: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
```

- [ ] **Step 8: Replace the settings screen (adds the purchases section)**

`app/settings.tsx`:

```tsx
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/app/AppProvider';
import { FREE_CARD_LIMIT } from '../src/config';
import { useRestore } from '../src/purchases/useRestore';
import { strings } from '../src/strings';
import { formatAgo } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { useTheme } from '../src/ui/theme';

export default function SettingsScreen() {
  const { services, cards, unlocked } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { restore, restoring } = useRestore();
  const [lastExportAt, setLastExportAt] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      services.settings.getNumber('lastExportAt').then(setLastExportAt).catch(() => {});
    }, [services]),
  );

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Section title={strings.settings.backup}>
        <Text style={[styles.body, { color: theme.muted }]}>
          {lastExportAt === null
            ? strings.settings.neverBackedUp
            : strings.settings.lastBackup(formatAgo(lastExportAt, Date.now()))}
        </Text>
        <Button label={strings.settings.exportBackup} onPress={() => router.push('/export')} />
        <Button variant="secondary" label={strings.settings.importBackup} onPress={() => router.push('/import')} />
      </Section>
      <Section title={strings.settings.purchases}>
        {unlocked ? (
          <Text style={[styles.body, { color: theme.text }]}>{strings.settings.unlocked}</Text>
        ) : (
          <>
            <Text style={[styles.body, { color: theme.muted }]}>
              {strings.settings.freeUsage(cards.length, FREE_CARD_LIMIT)}
            </Text>
            <Button label={strings.settings.unlock} onPress={() => router.push('/paywall')} />
          </>
        )}
        <Button variant="secondary" label={strings.settings.restore} onPress={restore} disabled={restoring} />
      </Section>
      <Section title={strings.settings.about}>
        <Text style={[styles.body, { color: theme.text }]}>{strings.promise}</Text>
        <Button variant="secondary" label={strings.settings.privacyPolicy} onPress={() => router.push('/privacy')} />
        <Text style={[styles.body, { color: theme.muted }]}>
          {strings.settings.version(Constants.expoConfig?.version ?? '')}
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 12 },
  title: { fontSize: 21, fontWeight: '700' },
  body: { fontSize: 18 },
});
```

- [ ] **Step 9: Register the route**

In `app/_layout.tsx`, below the `privacy` line, add:

```tsx
        <Stack.Screen name="paywall" options={{ title: strings.paywall.title, presentation: 'modal' }} />
```

- [ ] **Step 10: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; all suites PASS.

- [ ] **Step 11: Set up the store products (one-time, manual)**

- **App Store Connect:** create the app record for `com.hamza.cardholder` → In-App Purchases → **Non-Consumable**, product ID `cardholder.unlimited`, reference name "Unlimited cards", price $2.99 (AED 10.99 tier), display name + description, review screenshot of the paywall. Users and Access → Sandbox → add a sandbox tester.
- **Google Play Console:** create the app for `com.hamza.cardholder`. Billing only works for an app already uploaded to a track, so first upload a build to **Internal testing** (Task 20 Step 4 shows how: `eas build --profile preview --platform android`, then upload). Then Monetize → In-app products → create `cardholder.unlimited`, $2.99, activate. Setup → License testing → add your Google account.

- [ ] **Step 12: Try purchases in the sandboxes**

On a **physical device** (store purchases don't work on the simulator), running a development build (`eas build --profile development --platform ios` or `npx expo run:ios --device`):
1. Add 4 cards → **Add card** → the paywall opens instead of the form. With Wi-Fi off: "Couldn't reach the store…". Wi-Fi on, reopen: the button shows the store's localized price.
2. Buy with the sandbox account → "Unlimited unlocked. Thank you!" → back home, **Add card** opens the form. Settings shows "Unlimited is unlocked."
3. Delete and reinstall the app → Settings → **Restore purchases** → "Unlimited restored."
4. On Android with a license tester, use the "slow test card, approves after a few minutes" option → "Your purchase is waiting for approval…" → after it approves, **Restore purchases** unlocks and Play Console shows the order as acknowledged (not refunded after 3 days).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: one-time Unlimited unlock with paywall and restore"
```

---

### Task 17: App-switcher privacy

**Files:**
- Create: `src/ui/PrivacyShield.tsx`, `plugins/recentsScreenshotTransform.js`, `plugins/withRecentsScreenshotDisabled.js`
- Modify: `app/_layout.tsx`, `app.json` (plugin)
- Test: `src/ui/__tests__/PrivacyShield.test.tsx`, `plugins/__tests__/recentsScreenshotTransform.test.js`

**Interfaces:**
- Consumes: `useTheme` (Task 11); `strings` (Task 1).
- Produces:
  - `PrivacyShield` — a full-screen cover shown whenever the app isn't active (`testID="privacy-shield"`)
  - `addRecentsScreenshotFlag(mainActivitySource: string): string` — inserts `setRecentsScreenshotEnabled(false)` (Android 13+) after `super.onCreate(...)`; idempotent; throws if there's no `super.onCreate`
  - Config plugin `./plugins/withRecentsScreenshotDisabled`

How each platform is covered:
- **iOS** takes the app-switcher snapshot after the app goes `inactive`, so a cover rendered on `inactive` is what gets captured.
- **Android 13+**: `Activity.setRecentsScreenshotEnabled(false)` makes the system show a blank card. This doesn't block screenshots (the spec allows those).
- **Android 10–12**: no API short of `FLAG_SECURE`, which would also block screenshots. Best effort: cover on window `blur`. On 13+ that listener isn't added, because `blur` also fires for the app's own dialogs and share sheet.

- [ ] **Step 1: Write the failing tests**

`src/ui/__tests__/PrivacyShield.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import { PrivacyShield } from '../PrivacyShield';

let emit: (state: AppStateStatus) => void = () => {};
let spy: jest.SpyInstance;

beforeEach(() => {
  spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    emit = listener as (state: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => spy.mockRestore());

test('covers the app whenever it is not active', () => {
  render(<PrivacyShield />);
  expect(screen.queryByTestId('privacy-shield')).toBeNull();
  act(() => emit('inactive'));
  expect(screen.getByTestId('privacy-shield')).toBeTruthy();
  act(() => emit('active'));
  expect(screen.queryByTestId('privacy-shield')).toBeNull();
  act(() => emit('background'));
  expect(screen.getByTestId('privacy-shield')).toBeTruthy();
});
```

`plugins/__tests__/recentsScreenshotTransform.test.js`:

```js
const { addRecentsScreenshotFlag } = require('../recentsScreenshotTransform');

const MAIN_ACTIVITY = `package com.hamza.cardholder

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }
}
`;

test('adds the Android 13+ flag right after super.onCreate', () => {
  expect(addRecentsScreenshotFlag(MAIN_ACTIVITY)).toContain(
    'super.onCreate(null)\n    if (android.os.Build.VERSION.SDK_INT >= 33) {\n      setRecentsScreenshotEnabled(false)\n    }',
  );
});

test('is idempotent', () => {
  const once = addRecentsScreenshotFlag(MAIN_ACTIVITY);
  expect(addRecentsScreenshotFlag(once)).toBe(once);
});

test('fails loudly when there is no onCreate to hook', () => {
  expect(() => addRecentsScreenshotFlag('class MainActivity : ReactActivity() {}')).toThrow('super.onCreate');
});
```

- [ ] **Step 2: Run to make sure they fail**

Run: `npx jest src/ui plugins`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the shield**

`src/ui/PrivacyShield.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { AppState, NativeEventSubscription, Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { strings } from '../strings';
import { Rosette } from './Rosette';
import { useTheme } from './theme';

const ANDROID_RECENTS_API = 33; // setRecentsScreenshotEnabled, applied by plugins/withRecentsScreenshotDisabled.js

export function PrivacyShield() {
  const theme = useTheme();
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const subscriptions: NativeEventSubscription[] = [
      AppState.addEventListener('change', (state) => setCovered(state !== 'active')),
    ];
    if (Platform.OS === 'android' && (Platform.Version as number) < ANDROID_RECENTS_API) {
      subscriptions.push(
        AppState.addEventListener('blur', () => setCovered(true)),
        AppState.addEventListener('focus', () => setCovered(false)),
      );
    }
    return () => subscriptions.forEach((s) => s.remove());
  }, []);

  if (!covered) return null;
  return (
    <View
      testID="privacy-shield"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.bg }]}
    >
      <Rosette size={180} color={theme.rosette} />
      <Text style={[styles.name, { color: theme.text }]}>{strings.shield}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  name: { fontSize: 36, fontWeight: '700' },
});
```

- [ ] **Step 4: Implement the Android config plugin**

`plugins/recentsScreenshotTransform.js`:

```js
const MARKER = 'setRecentsScreenshotEnabled(false)';
const ON_CREATE = /super\.onCreate\([^)]*\)/;

// Hides the app's content in Android 13+ recents without blocking screenshots (unlike FLAG_SECURE).
function addRecentsScreenshotFlag(source) {
  if (source.includes(MARKER)) return source;
  if (!ON_CREATE.test(source)) {
    throw new Error('withRecentsScreenshotDisabled: could not find super.onCreate(...) in MainActivity');
  }
  return source.replace(
    ON_CREATE,
    (call) => `${call}\n    if (android.os.Build.VERSION.SDK_INT >= 33) {\n      ${MARKER}\n    }`,
  );
}

module.exports = { addRecentsScreenshotFlag };
```

`plugins/withRecentsScreenshotDisabled.js`:

```js
const { withMainActivity } = require('expo/config-plugins');
const { addRecentsScreenshotFlag } = require('./recentsScreenshotTransform');

module.exports = function withRecentsScreenshotDisabled(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error('withRecentsScreenshotDisabled expects a Kotlin MainActivity');
    }
    cfg.modResults.contents = addRecentsScreenshotFlag(cfg.modResults.contents);
    return cfg;
  });
};
```

Add to the `plugins` array in `app.json`:

```json
      "./plugins/withRecentsScreenshotDisabled"
```

- [ ] **Step 5: Mount the shield**

In `app/_layout.tsx`:

1. Add the import:
   ```tsx
   import { PrivacyShield } from '../src/ui/PrivacyShield';
   ```
2. In `RootLayout`, render it after `</AppProvider>` (inside `GestureHandlerRootView`) so it also covers the boot and recovery screens:
   ```tsx
         </AppProvider>
         <PrivacyShield />
       </GestureHandlerRootView>
   ```

- [ ] **Step 6: Run tests and verify the plugin output**

Run: `npx jest src/ui plugins && npm run typecheck`
Expected: all PASS; `tsc` exits 0.

Run: `npx expo prebuild --platform android --clean && grep -n -A2 "super.onCreate" android/app/src/main/java/com/hamza/cardholder/MainActivity.kt`
Expected: the `super.onCreate(null)` line followed by `if (android.os.Build.VERSION.SDK_INT >= 33) {` and `setRecentsScreenshotEnabled(false)`.

- [ ] **Step 7: Check it on the simulator**

Rebuild with `npx expo run:ios`, open a card, then swipe up to the app switcher: CardHolder's card shows only the cover — the rosette and the app name — never the ID. Take a screenshot inside the app (Cmd-S in the simulator): it works and shows the card.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: hide card contents in the app switcher on iOS and Android"
```

---

### Task 18: Share to CardHolder

**Files:**
- Create: `src/shareIn/plan.ts`, `src/shareIn/pending.ts`, `src/shareIn/ShareIntentRouter.tsx`, `app/+native-intent.tsx`
- Modify: `app/_layout.tsx`, `app/edit/[id].tsx`, `app.json` (plugin)
- Test: `src/shareIn/__tests__/plan.test.ts`, `src/shareIn/__tests__/pending.test.ts`

**Interfaces:**
- Consumes: `canAddCard` (Task 7); `cropSharedImage`, `discardFile` (Task 12); `CardImage`, `FrontImage` (Task 5); `toHex`, `engine` (Task 2); `useApp` (Task 11); `strings` (Task 1).
- Produces:
  - `type ShareInDecision = 'ignore' | 'too-many' | 'limit-reached' | 'add'`
  - `decideShareIn(imageCount: number, ctx: { cardCount: number; unlocked: boolean }): ShareInDecision` — more than two images is refused before the limit is checked
  - `interface SharedImages { front: FrontImage; back: CardImage | null }`
  - `setPendingShare(images: SharedImages): string` (returns a token), `getPendingShare(token: string): SharedImages | null`, `clearPendingShare(token: string): void` — in memory only, never on disk
  - `ShareIntentRouter` — receives shared images, crops each, opens `/edit/new?share=<token>` (or the paywall, or a message), and deletes the shared files whatever happens
  - The add-card screen accepts `?share=<token>` and starts with those images as front/back

From the spec: one shared image becomes the front; two become front and back, in the order shared; more than two are refused with a short message; at the free limit the upgrade screen shows instead and the shared images are discarded. Every image goes through the freeform crop.

- [ ] **Step 1: Install expo-share-intent and confirm its API**

```bash
npx expo install expo-share-intent
```

Add to the `plugins` array in `app.json`:

```json
      ["expo-share-intent", {
        "iosActivationRules": { "NSExtensionActivationSupportsImageWithMaxCount": 10 },
        "androidIntentFilters": ["image/*"],
        "androidMultiIntentFilters": ["image/*"]
      }]
```

(The iOS maximum is 10, not 2, so sharing three photos still reaches the app and gets the "share one or two" message instead of CardHolder silently missing from the share sheet.)

Open `node_modules/expo-share-intent/README.md` for the installed version and confirm what the code below assumes:
- `ShareIntentProvider` wraps the app; `useShareIntentContext()` returns `{ hasShareIntent, shareIntent, resetShareIntent }`, and `shareIntent.files` items have `path` and `mimeType`
- the expo-router integration: a `app/+native-intent.tsx` with `redirectSystemPath` that uses `getShareExtensionKey()`
- any iOS requirement for `ios.appleTeamId` or an App Group in `app.json` (add whatever the README lists)

If names differ, change only the calls in `ShareIntentRouter.tsx` and `+native-intent.tsx`.

- [ ] **Step 2: Write the failing tests**

`src/shareIn/__tests__/plan.test.ts`:

```ts
import { decideShareIn } from '../plan';

const free = { cardCount: 0, unlocked: false };

test('one or two images open the add-card screen', () => {
  expect(decideShareIn(1, free)).toBe('add');
  expect(decideShareIn(2, free)).toBe('add');
});

test('nothing usable is ignored', () => {
  expect(decideShareIn(0, free)).toBe('ignore');
});

test('more than two images are refused, even at the limit', () => {
  expect(decideShareIn(3, free)).toBe('too-many');
  expect(decideShareIn(5, { cardCount: 4, unlocked: false })).toBe('too-many');
});

test('at the free limit the upgrade screen shows instead', () => {
  expect(decideShareIn(1, { cardCount: 4, unlocked: false })).toBe('limit-reached');
  expect(decideShareIn(1, { cardCount: 4, unlocked: true })).toBe('add');
});
```

`src/shareIn/__tests__/pending.test.ts`:

```ts
import { frontImage, image } from '../../../test/fixtures';
import { clearPendingShare, getPendingShare, setPendingShare } from '../pending';

test('shared images are handed over by token', () => {
  const images = { front: frontImage('f'), back: image('b') };
  const token = setPendingShare(images);
  expect(getPendingShare(token)).toEqual(images);
  expect(getPendingShare(token)).toEqual(images); // re-renders can read it again
  expect(getPendingShare('wrong')).toBeNull();
  clearPendingShare(token);
  expect(getPendingShare(token)).toBeNull();
});

test('a new share replaces the previous one', () => {
  const first = setPendingShare({ front: frontImage('1'), back: null });
  const second = setPendingShare({ front: frontImage('2'), back: null });
  expect(getPendingShare(first)).toBeNull();
  expect(getPendingShare(second)?.front).toEqual(frontImage('2'));
});

test('clearing a stale token leaves the current share alone', () => {
  const first = setPendingShare({ front: frontImage('1'), back: null });
  const second = setPendingShare({ front: frontImage('2'), back: null });
  clearPendingShare(first);
  expect(getPendingShare(second)).not.toBeNull();
});
```

- [ ] **Step 3: Run to make sure they fail**

Run: `npx jest src/shareIn`
Expected: FAIL — `Cannot find module '../plan'` / `'../pending'`.

- [ ] **Step 4: Implement the decision and the hand-over**

`src/shareIn/plan.ts`:

```ts
import { canAddCard } from '../purchases/limits';

export type ShareInDecision = 'ignore' | 'too-many' | 'limit-reached' | 'add';

export function decideShareIn(imageCount: number, ctx: { cardCount: number; unlocked: boolean }): ShareInDecision {
  if (imageCount === 0) return 'ignore';
  if (imageCount > 2) return 'too-many';
  if (!canAddCard(ctx.cardCount, ctx.unlocked)) return 'limit-reached';
  return 'add';
}
```

`src/shareIn/pending.ts`:

```ts
import { CardImage, FrontImage } from '../cards/types';
import { toHex } from '../crypto/bytes';
import { engine } from '../crypto/engine';

export interface SharedImages {
  front: FrontImage;
  back: CardImage | null;
}

// Memory only: the cropped images wait here until the add-card screen reads them; never written to disk.
let pending: { token: string; images: SharedImages } | null = null;

export function setPendingShare(images: SharedImages): string {
  const token = toHex(engine.randomBytes(8));
  pending = { token, images };
  return token;
}

export function getPendingShare(token: string): SharedImages | null {
  return pending?.token === token ? pending.images : null;
}

export function clearPendingShare(token: string): void {
  if (pending?.token === token) pending = null;
}
```

Run: `npx jest src/shareIn`
Expected: all PASS.

- [ ] **Step 5: Receive shares**

`src/shareIn/ShareIntentRouter.tsx`:

```tsx
import { useShareIntentContext } from 'expo-share-intent';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useApp } from '../app/AppProvider';
import { cropSharedImage, discardFile } from '../images/capture';
import { strings } from '../strings';
import { setPendingShare } from './pending';
import { decideShareIn } from './plan';

export function ShareIntentRouter() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { cards, unlocked } = useApp();
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    if (!hasShareIntent || busy.current) return;
    busy.current = true;
    const paths = (shareIntent.files ?? [])
      .filter((f) => f.mimeType?.startsWith('image/'))
      .map((f) => f.path);

    (async () => {
      try {
        const decision = decideShareIn(paths.length, { cardCount: cards.length, unlocked });
        if (decision === 'too-many') {
          Alert.alert(strings.shareIn.tooMany);
        } else if (decision === 'limit-reached') {
          router.push('/paywall');
        } else if (decision === 'add') {
          const front = await cropSharedImage(paths[0]);
          const back = front && paths[1] ? await cropSharedImage(paths[1]) : null;
          if (front) router.push(`/edit/new?share=${setPendingShare({ front, back })}`);
        }
      } catch (e) {
        console.warn('Share-in failed', e);
        Alert.alert(strings.shareIn.failed);
      } finally {
        // Shared originals are plaintext copies; remove them whatever happened.
        paths.forEach(discardFile);
        resetShareIntent();
        busy.current = false;
      }
    })();
  }, [hasShareIntent, shareIntent, cards.length, unlocked, router, resetShareIntent]);

  return null;
}
```

`app/+native-intent.tsx`:

```tsx
import { getShareExtensionKey } from 'expo-share-intent';

// The share extension opens the app through a deep link; send it to home instead of an unmatched route.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return path.includes(`dataUrl=${getShareExtensionKey()}`) ? '/' : path;
  } catch {
    return '/';
  }
}
```

- [ ] **Step 6: Wire it into the layout**

In `app/_layout.tsx`:

1. Add imports:
   ```tsx
   import { ShareIntentProvider } from 'expo-share-intent';
   import { ShareIntentRouter } from '../src/shareIn/ShareIntentRouter';
   ```
2. Wrap `<AppProvider>…</AppProvider>` in `RootLayout`:
   ```tsx
         <ShareIntentProvider>
           <AppProvider>
             <RootNavigator />
           </AppProvider>
         </ShareIntentProvider>
   ```
3. Directly after `<NotificationRouter />`, add:
   ```tsx
         <ShareIntentRouter />
   ```
   (It sits inside the ready branch, so a share that arrives while the app is still booting or on the recovery screen waits until the cards are open.)

- [ ] **Step 7: Let the add-card screen start from shared images**

In `app/edit/[id].tsx`:

1. Change the React import to `import { useEffect, useState } from 'react';` and add:
   ```tsx
   import { clearPendingShare, getPendingShare } from '../../src/shareIn/pending';
   ```
2. Replace
   ```tsx
     const { id } = useLocalSearchParams<{ id: string }>();
     const isNew = id === 'new';
   ```
   with
   ```tsx
     const { id, share } = useLocalSearchParams<{ id: string; share?: string }>();
     const isNew = id === 'new';
   ```
3. Replace
   ```tsx
     const [draft, setDraft] = useState<EditDraft>(() => draftFor(existing));
   ```
   with
   ```tsx
     const [draft, setDraft] = useState<EditDraft>(() => {
       const shared = isNew && share ? getPendingShare(share) : null;
       return { ...draftFor(existing), front: shared?.front ?? null, back: shared?.back ?? null };
     });
     useEffect(
       () => () => {
         if (share) clearPendingShare(share);
       },
       [share],
     );
   ```

- [ ] **Step 8: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; all suites PASS.

- [ ] **Step 9: Try it on a device or simulator**

Rebuild with `npx expo run:ios` (the share extension is a new native target). In Photos:
1. Select one photo → Share → **CardHolder** → the app opens to the freeform crop → Choose → the add-card form with that photo as the front. Name it, Save → it's pinned on home.
2. Select two photos → Share → CardHolder → two crops in a row → the form has front and back in the order you selected them.
3. Cancel the first crop → nothing opens; no form appears.
4. Select three photos → Share → CardHolder → "Share one photo for the front, or two for the front and back."
5. With 4 cards on a free install, share one photo → the Unlimited screen opens instead of the form.
6. After each case, check that no shared originals are left behind:
   ```bash
   find "$(xcrun simctl get_app_container booted com.hamza.cardholder data)" -iname '*.jp*g' -newer package.json
   ```
   Expected: no output.
7. Repeat 1, 2 and 4 on Android (Photos/Gallery → Share → CardHolder).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: Share to CardHolder from Photos with crop, limit check and cleanup"
```

---

### Task 19: End-to-end test with Maestro

**Files:**
- Create: `e2e/add-and-open-card.yaml`, `assets/e2e/sample-card.jpg`
- Modify: `src/images/capture.ts`, `package.json` (script)

**Interfaces:**
- Consumes: testIDs `add-card` (Tasks 11/14), `front-library`/`back-library`, `card-name`, `save-card` (Task 12), `card-view`, `card-side`, `flip-button` (Task 13); accessibility label `Open <name>` (Task 14).
- Produces: `npm run e2e:ios`; with `EXPO_PUBLIC_E2E=1` at build time, `pickImage` returns a bundled sample photo instead of opening the native picker. Maestro can't drive the third-party crop UI reliably, and picker + crop are covered by the manual check in Task 12.

- [ ] **Step 1: Install Maestro and expo-asset; make the sample image**

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
npx expo install expo-asset
mkdir -p assets/e2e
sips -s format jpeg assets/icon.png --out assets/e2e/sample-card.jpg
```

Expected: `maestro --version` prints a version; `file assets/e2e/sample-card.jpg` reports JPEG image data.

- [ ] **Step 2: Write the flow**

`e2e/add-and-open-card.yaml`:

```yaml
appId: com.hamza.cardholder
---
- launchApp:
    clearState: true
- assertVisible: "Add your first card"
- tapOn:
    id: "add-card"
- tapOn:
    id: "front-library"
- tapOn:
    id: "back-library"
- tapOn:
    id: "card-name"
- inputText: "Gym membership"
- hideKeyboard
- scrollUntilVisible:
    element:
      id: "save-card"
- tapOn:
    id: "save-card"
- assertVisible: "Pinned"
- assertVisible: "Open Gym membership"
- tapOn: "Open Gym membership"
- assertVisible:
    id: "card-view"
- assertVisible:
    id: "card-side"
    text: "Front"
- tapOn:
    id: "flip-button"
- assertVisible:
    id: "card-side"
    text: "Back"
```

Add the script to `package.json` `"scripts"`:

```json
    "e2e:ios": "maestro test e2e/add-and-open-card.yaml"
```

- [ ] **Step 3: Run it to make sure it fails**

Run:
```bash
EXPO_PUBLIC_E2E=1 npx expo run:ios --configuration Release
npm run e2e:ios
```
Expected: FAIL at `tapOn: id: "front-library"` → the native photo picker opens and the next step can't find `back-library`.

- [ ] **Step 4: Add the E2E capture hook**

In `src/images/capture.ts`:

1. Add the import:
   ```ts
   import { Asset } from 'expo-asset';
   ```
2. Make this the first line inside `pickImage`:
   ```ts
     if (process.env.EXPO_PUBLIC_E2E === '1') return e2eSampleImage();
   ```
3. Add at the end of the file:
   ```ts
   // E2E builds only (EXPO_PUBLIC_E2E=1 is inlined at bundle time): skip the native picker.
   async function e2eSampleImage(): Promise<FrontImage> {
     const [asset] = await Asset.loadAsync(require('../../assets/e2e/sample-card.jpg'));
     if (!asset.localUri) throw new Error('E2E sample image missing');
     const jpegBase64 = await new File(asset.localUri).base64();
     return { jpegBase64, aspect: 1, thumbJpegBase64: jpegBase64 };
   }
   ```

- [ ] **Step 5: Run it to make sure it passes**

Run:
```bash
EXPO_PUBLIC_E2E=1 npx expo run:ios --configuration Release
npm run e2e:ios
```
Expected: every step passes (`✅` per command), ending at `Assert that id: card-side, "Back" is visible`.

Then confirm a normal build still opens the real picker: `npx expo run:ios` → Add card → Front → Choose from library opens the photo picker.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: Maestro flow for add, pin, open and flip"
```

---

### Task 20: Release preparation

**Files:**
- Create: `eas.json`, `docs/privacy-policy.md`
- Modify: `app.json` (EAS project id, written by `eas init`)

**Interfaces:**
- Consumes: everything above.
- Produces: signed store builds on TestFlight and Play internal testing; a hosted privacy policy URL.

- [ ] **Step 1: Full verification before any build**

Run: `npm run typecheck && npm test`
Expected: `tsc` exits 0; every suite PASS. Then re-run `npm run e2e:ios` against an `EXPO_PUBLIC_E2E=1` Release build: PASS.

Confirm there is no network code:

Run: `grep -rnE "fetch\(|axios|XMLHttpRequest|WebSocket|analytics|sentry|crashlytics" app src`
Expected: no matches.

- [ ] **Step 2: EAS setup**

```bash
npm install -g eas-cli
eas login
eas init
```

Expected: `eas init` adds `extra.eas.projectId` to `app.json`.

`eas.json`:

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "app-bundle" } },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 3: Privacy policy**

`docs/privacy-policy.md` (keep in sync with `strings.privacy.paragraphs`):

```markdown
# CardHolder Privacy Policy

Effective: 2026-10-19

CardHolder stores your cards only on this phone. There are no accounts and no servers, and the app does not connect to the internet.

Card photos and details are encrypted on the phone with a key that never leaves it.

CardHolder collects no personal data, analytics or crash reports. If you choose to share crash data with Apple or Google, they handle it under their own policies.

Backups you export are encrypted with a passphrase you choose. Where you keep the file is up to you.

Purchases are processed by the App Store or Google Play. CardHolder never sees your payment details.

Questions? Contact the developer through the app's store listing.
```

Host it at any public URL (GitHub Pages, Netlify, your own site) and note the URL; both stores require it.

- [ ] **Step 4: Build and upload**

```bash
eas build --profile production --platform all
eas submit --platform ios --latest
eas submit --platform android --latest
```

Expected: both builds finish on EAS. The iOS build appears in App Store Connect → TestFlight; the Android bundle goes to Play Console. For the first Android upload, create the Internal testing release in Play Console if `eas submit` asks you to.

- [ ] **Step 5: Store listings (manual)**

- **Name:** search "CardHolder" on both stores. If it's taken, pick a variant (e.g. "CardHolder – ID Wallet"), set it as `expo.name` in `app.json` and as the listing name.
- **Apple App Privacy:** "Data Not Collected". **Google Data safety:** no data collected, no data shared.
- **Privacy policy URL:** the URL from Step 3, in both consoles.
- **Export compliance (Apple):** the app implements AES-256 for on-device data. Answer App Store Connect's encryption questions accordingly (Apple's "Complying with Encryption Export Regulations" page explains when the mass-market exemption applies and whether you need to file an annual self-classification report), then set `ITSAppUsesNonExemptEncryption` in `app.json` `ios.infoPlist` to match your answer so future builds skip the question.
- **Content rating / age rating** questionnaires; category: Utilities (Apple) / Tools (Google).
- **Screenshots:** home with pinned cards, counter view (landscape), add-card form, paywall — using sample cards, never real IDs.
- **In-app purchase:** attach `cardholder.unlimited` to the first version under review (App Store Connect → the version → In-App Purchases).

- [ ] **Step 6: Beta, then public**

1. TestFlight: add internal testers (friends and family). Play Console: Internal testing → testers list.
2. Ask testers to run through: add 4 cards → paywall → sandbox buy; counter view at a real counter; export and import onto a second phone; a reminder from a card that expires in 31 days (set the date accordingly and wait for 09:00 the next day).
3. Fix what's found (each fix through the normal test-first loop), rebuild with `eas build --profile production --platform all`, resubmit.
4. Submit for App Review / promote the Play release to Production.

- [ ] **Step 7: Commit and tag**

```bash
git add eas.json app.json docs/privacy-policy.md
git commit -m "chore: EAS build config and privacy policy for v1 release"
git tag v1.0.0
```
