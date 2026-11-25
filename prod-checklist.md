# Doc Keeper: Android launch checklist

Package `com.hamza.cardholder` · current build 1.26.0 (versionCode 1026000) · minSdk 29 · distribution today: signed APK on GitHub Releases.
Items marked **(you)** need a human in a dashboard; the rest can be done in the repo.

## 1. Blockers: do these first

- [ ] **Play Console account** **(you)**: pay the $25 fee and complete identity verification. A personal account created after Nov 2023 must run a closed test with 12+ testers for 14 days before it can go to production. Start this clock now.
- [ ] **Ship an AAB, not an APK**: Play requires an Android App Bundle. `scripts/release-android.sh` builds an APK only, so add a `bundleRelease` path (`./gradlew bundleRelease`) or build with EAS.
- [ ] **Enrol in Play App Signing** **(you)**: upload the key from `~/.cardholder-signing/release.jks`. Back up the keystore and its passwords in two places off this Mac. Losing the upload key is painful, and losing an APK-era signing key means existing sideload users can't update.
- [ ] **Target API level**: confirm `targetSdkVersion` meets Play's current requirement (latest or latest minus one) with `./gradlew :app:dependencies` or the `build.gradle` ext values.
- [ ] **Dangerous permissions review**: `AndroidManifest.xml` declares `SYSTEM_ALERT_WINDOW` and `WRITE_SETTINGS`. A document wallet shouldn't need either, and both draw Play policy scrutiny. Remove them (or their source plugin) unless the app truly uses them.
- [ ] **Storage permissions**: `READ/WRITE_EXTERNAL_STORAGE` are capped at SDK 32, which is fine. Confirm no `MANAGE_EXTERNAL_STORAGE` appears in the merged manifest.

## 2. Play Console: store listing

- [ ] App name "Doc Keeper" (30 chars max), short description (80), full description (4000)
- [ ] 512×512 icon (from `assets/icon.png`), 1024×500 feature graphic
- [ ] Phone screenshots (min 2, ideally 6–8) in both light and graphite dark mode; capture with the `emulator-test` skill's report
- [ ] Category (Tools or Productivity), contact email, website (`site/`)
- [ ] **Privacy policy URL**: `site/privacy.html` must be live on a public URL and match what the app actually does
- [ ] Release notes for 1.x

## 3. Play Console: policy forms **(you)**

- [ ] **Data safety form**: declare what is collected and shared. Be precise about on-device storage, OCR and scanned text, profile photos, and any network calls (INTERNET is declared; list every endpoint).
- [ ] **App content**: target audience (not for children), ads declaration (none), content rating questionnaire, government-app and financial-features declarations (all "no" unless that changes)
- [ ] **Sensitive-data wording**: the app stores IDs and cards. Say clearly that data stays on the device, and whether encryption and biometric lock are used (USE_BIOMETRIC is present).
- [ ] **In-app purchases** (`expo-iap` with `store: play` is configured): create the products in Play Console, activate the merchant profile, and add licence testers. Disclose pricing in the listing. See `docs/payments.md`.
- [ ] Permissions declarations if any sensitive permission remains after section 1

## 4. Build and quality gate

- [ ] Bump `versionCode` and `versionName`. Play rejects a repeated `versionCode`. The current scheme is major×1,000,000 + minor×1,000, so keep it.
- [ ] Clean working tree before releasing. The release script bundles the working tree, so don't edit `app/src` mid-build.
- [ ] `npm test` and `npx tsc --noEmit` pass
- [ ] Run the **`emulator-test`** skill's full case catalogue and attach the screenshot report
- [ ] Test the **release** build, not debug: install the signed build on 2+ physical devices (one low-end, one Android 14/15) and check:
  - [ ] fresh install, then add, edit and delete a document
  - [ ] scan, OCR, profile photo (gallery picker only; CAMERA is blocked on purpose)
  - [ ] biometric lock, background and resume
  - [ ] backup and restore, export and share (`allowBackup: false` means there is no Android auto-backup, so confirm the in-app export works)
  - [ ] dark (graphite) and light themes, adaptive and monochrome icon, rotation (`orientation: default`)
  - [ ] purchase flow with a licence-tester account
  - [ ] upgrade from the currently published APK to the new build, with data intact
- [ ] ProGuard/R8 shrinking check: release build doesn't crash on first launch
- [ ] Pre-launch report in Play Console (automatic crawl on Firebase devices) is clean

## 5. Rollout

- [ ] Upload AAB to **Internal testing** and verify install from the Play link
- [ ] **Closed testing**: 12+ testers for 14 days if the account requires it
- [ ] Apply for production access **(you)**, then submit with **staged rollout** (start at 10–20%)
- [ ] Decide the fate of the GitHub APK channel. Play-signed and locally signed builds have different signatures, so sideload users must uninstall before moving to Play. Either keep GitHub as a beta channel with a different package suffix or announce the migration.
- [ ] Keep `version.json` and in-app update logic from nagging Play users toward the APK. Disable the APK self-update path in Play builds.

## 6. Post-launch

- [ ] Monitor Play Console: crashes and ANRs (Android vitals), reviews, install funnel
- [ ] Crash reporting hooked up (Sentry or Firebase Crashlytics) if not already
- [ ] Support email and an issue template (GitHub Issues, `docs/agents/issue-tracker.md`)
- [ ] Reply to reviews in the first week; hotfix path rehearsed (bump versionCode, upload, 100% rollout)
- [ ] Write the launch worklog in `docs/worklog/` (`YYYY-MM-DD-android-launch.md`)

## Suggested order

1. Create the Play account and start verification (section 1, first item)
2. Fix the permissions and AAB build (section 1)
3. Prepare the listing and policy forms while the account verifies (sections 2 and 3)
4. Run the QA pass (section 4), then internal and closed testing (section 5)
