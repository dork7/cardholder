# Card Holder — Quick access from outside the app (native plan)

Oct 25, 2026 · Spec: [`docs/design.md`](../../design.md)

**Status:** not started. Needs a machine with Xcode and the Android SDK; none of this can be built or tried without a dev build.

## Goal

Open a card without going through the app's home screen:

- **Home-screen widget:** tap a pinned card on the widget and the app opens straight on that card.
- **Lock-screen quick access:** an iOS Control Center control (iOS 18+) and an Android Quick Settings tile open the card view. Both still sit behind the phone's own unlock.

**Already done in JS** (reuse, don't rebuild):

- Long-press app shortcuts: `src/shortcuts/quickActions.ts` (`expo-quick-actions`) lists the first three pinned cards plus Add card. The list is re-synced on every refresh in `src/app/AppProvider.tsx`.
- Deep links: the `cardholder://card/<id>` URL already opens the card view through expo-router (`scheme` in `app.json`).
- Launch routing: `src/app/useLaunchLinks.ts` (reminder taps, shortcuts) is where a widget or tile tap with extra data would also be handled.

## The one design decision: what the widget may show

Card data is encrypted with a key held in the Keychain/Keystore, which extensions can't use without sharing it. A widget therefore can't decrypt anything. The app has to write a **plaintext** list of what the widget shows into storage shared with the extension (an App Group on iOS, SharedPreferences on Android).

- **Recommended:** write only `{ id, label }` for pinned cards. Add a setting, "Show card names on widgets" (default on), whose off state uses generic labels ("Card 1"). Images stay out of the widget: thumbnails would be unencrypted copies of the card on disk.
- The privacy policy (`strings.privacy`) needs one sentence about this list once it ships.

## Work

### 1. Shared list (both platforms)
- Add a local Expo module `modules/quick-access` with `setPinned(items: {id, label}[])`.
  - iOS: write the items to `UserDefaults(suiteName: "group.com.hamza.cardholder")`, then call `WidgetCenter.shared.reloadAllTimelines()` and `ControlCenter.shared.reloadAllControls()`.
  - Android: write the items to SharedPreferences, then send `AppWidgetManager` an update broadcast.
- Call it from the same sync as `syncShortcuts`, using the same pinned order (`splitPinned`).

### 2. iOS widget and control
- Add the extension target with `@bacons/apple-targets` (config plugin: no committed `ios/` folder, matching how the app is built now). Entitlement: the App Group on both the app and the extension.
- Widget (WidgetKit, small and medium sizes): a list of pinned labels. Each row is a `Link` to `cardholder://card/<id>`. When nothing is pinned, show "Pin a card to see it here" and open the app.
- Control (`ControlWidgetButton`, iOS 18+): "Show card" runs an `AppIntent` with `openAppWhenRun = true` that opens `cardholder://card/<first pinned id>`, or home if none. Opening the app from the lock screen already requires Face ID / passcode.
- Deployment target is 16.4, so wrap the control in `@available(iOS 18, *)`.

### 3. Android widget and tile
- A config plugin that adds the Kotlin sources, the `AppWidgetProvider` receiver plus its XML, and the `TileService` to the manifest.
- Widget: `RemoteViews` list (or Glance) of pinned labels; each row has a `PendingIntent` for the deep link.
- Tile: `onClick` → `unlockAndRun { startActivityAndCollapse(PendingIntent for the deep link) }`. `unlockAndRun` is what keeps the tile behind the phone's unlock.

### 4. Smart crop on Android (follow-up to the iOS version)
- `src/images/smartCrop.ts` already calls `detectCard` on the `CardOcr` module when it exists. Android needs the same function. ML Kit's document scanner is a full UI; use OpenCV contour detection or the ML Kit object detector instead. Add an Android target to `modules/card-ocr` returning the same `{ x, y, width, height }`.

## Testing

- Unit-test the item list built for the shared storage, the same way as `planShortcuts` in `src/shortcuts/__tests__/quickActions.test.ts`.
- On device: pin, unpin, rename and delete a card, and check that the widget, control and tile follow. Tap each one from a locked phone and confirm unlock is asked for first. Turn names off and check the generic labels.
