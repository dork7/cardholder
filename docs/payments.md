# One-time document unlock

Ten documents are free. Adding an eleventh opens the purchase screen; a single non-consumable
product, `cardholder.unlimited`, unlocks unlimited documents. It is not a subscription.
Reading, editing, deleting and exporting existing documents are always available, including
when an imported backup contains more than ten. Importing a backup does not transfer a purchase.

The purchase screen first offers **See purchase price**, which connects to the store and displays
its localized price. **Unlock for …** starts the native payment sheet. **Restore purchases** can
recover an unlock after a reinstall, on another device using the same store account, or after a
pending payment completes. Apple purchases do not transfer to Google accounts or vice versa.

`src/purchases/store.ts` owns the store connection and transaction handling through `expo-iap`.
Nothing connects at startup, in Settings, or merely by opening the purchase screen. Store events
are listened to only during that visit after the user connects. Leaving before payment completes
requires Restore on the next visit. The device saves the unlock before acknowledging/finishing
the transaction. A failed acknowledgement asks the user to restore; Google can automatically refund
purchases not acknowledged within its deadline, normally three days after payment completes.

The entitlement is stored on the device and checked without the network. Android trusts the native
Play Billing client's purchase state and ownership response; iOS also checks StoreKit verification.
There is no receipt verification backend, account system, analytics or payment information in app
storage. This accepts client tampering and no automatic refund revocation, consistent with ADR 0005.
Never put a Google service-account private key in the app.

## Google Play setup

These steps require the developer's Play Console account; installing the library alone does not
create a product or make purchases live.

1. Set up the personal developer account's merchant payments profile and payout information.
2. Create the Play app with application ID `com.hamza.cardholder`. Before enrolling in Play App
   Signing, preserve the existing APK signing identity if current GitHub users must update in place;
   changing the app signing key can force a reinstall and lose their encrypted documents (ADR 0004).
3. Create and activate a **one-time product** with ID `cardholder.unlimited`, a permanent buy option
   (not a rental), name “Unlimited documents”, and the desired prices/country availability. Do not
   configure a subscription. The app never consumes this product.
4. Generate the Play native project and bundle using the Play distribution setting throughout:

   ```sh
   DOC_KEEPER_DISTRIBUTION=play npx expo prebuild --platform android --no-install
   # Configure release signing with your upload key before making the release bundle.
   cd android
   DOC_KEEPER_DISTRIBUTION=play ./gradlew :app:bundleRelease
   ```

   This setting is read by `app.config.ts`: it hides the GitHub updater and removes
   `REQUEST_INSTALL_PACKAGES` from the merged manifest. Keep the same setting when running Metro
   with this build. Builds without it retain GitHub updates. Increase `android.versionCode` for
   subsequent Play uploads. Do not publish a bundle signed with the debug key.
5. Upload the signed bundle to an internal testing track. Add testers to the track and license
   testing, have them opt in, and install from the Play testing link with the intended Google account.
   A random GitHub APK or Expo Go is not a substitute for this purchase test.

For iOS later, create the same ID as a non-consumable in App Store Connect, complete the Paid Apps
Agreement/tax/banking setup, rebuild the native app, and test in the Apple sandbox/TestFlight.

## Verification

Automated: `npm run typecheck` and `npm test -- --runInBand` cover the free limit, existing-document
editing, purchase-screen interaction, completed/pending/cancelled purchases, duplicate events,
restore, failed local persistence and failed acknowledgement.

Before publishing, test on a Play-installed build:

- Documents one through ten save; adding an eleventh opens the purchase screen. Existing documents
  remain viewable/editable/exportable, and deleting one frees a slot.
- The store's localized price is shown. Approving the test purchase unlocks an eleventh document;
  cancelling does not. Relaunch in airplane mode: the paid unlock still works.
- A pending test payment stays locked. Approve it, then Restore; access is granted only after
  completion. Reject it: access remains locked.
- On a fresh install with the same store account, Restore recovers the unlock without charging.
  With an account that has never bought it, Restore explains that no purchase was found.
- Close the screen during payment, then Restore to recover it. Check the Play order is acknowledged.
- Test unavailable store/network, a failed purchase, and retries. None should block access to existing
  documents. A draft that reaches the limit at save remains in the editor behind the paywall.
- Check that the Play build has no GitHub update controls or install-packages permission.

References: [Play Billing integration](https://developer.android.com/google/play/billing/integrate),
[license testing](https://developer.android.com/google/play/billing/test),
[Expo IAP](https://github.com/hyodotdev/openiap/tree/main/libraries/expo-iap).
