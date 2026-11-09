# Android copies update themselves from this repo's GitHub Releases

Android builds are signed APKs published to `dork7/cardholder` GitHub Releases
(`scripts/release-android.sh` or the tag workflow) with a `version.json` next to them. Settings can
check for, download and install a newer one (`src/update/`, `modules/app-update`). An APK is only
installed if it comes from this repository's releases and matches the SHA-256 in `version.json`.
Releases without a hash are never offered. Nothing is checked or downloaded unless the user taps.
iOS doesn't offer this.

## Consequences

- The release signing key can never change. Android refuses an update signed with a different key,
  and reinstalling would wipe the Keystore data key and every document with it (see ADR-0002).
- The app asks for `REQUEST_INSTALL_PACKAGES`. A move to Play distribution later would need this
  path removed or hidden for store builds.
- The release must be built from a clean tree, because the build bundles whatever is in the working
  directory.
