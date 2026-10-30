---
name: deploy
description: >-
  Release a signed Doc Keeper Android APK for sideload updates. Use when the
  user says deploy, release the app, publish an APK, ship an update, or run
  the deploy skill.
disable-model-invocation: true
---

# Deploy Doc Keeper

Both approaches publish the same GitHub Release files: `DocKeeper-<version>.apk` and `version.json`. The update manifest is `https://github.com/dork7/cardholder/releases/latest/download/version.json`.

## Ask before building

Before installing tools, building, tagging, or uploading, use the AskQuestion tool. Do not choose an approach yourself. Do not start either path until the user answers.

Question id: `deploy-approach`

Prompt: `Which deploy approach should I use?`

Options:

- id: `local` — label: `Build on this machine and upload the APK to GitHub Releases`
- id: `github` — label: `Build on GitHub Actions`

If they already named an approach in the same message, still ask. The selection is part of running this skill.

Also ask for the version tag (`vMAJOR.MINOR.PATCH`) and release notes when they have not given them. Minor and patch must be 999 or less. `versionCode` is `major * 1000000 + minor * 1000 + patch`.

## Local build

Use this path only when they select `local`.

1. JDK 17 and the Android SDK must be available. The release script accepts Android Studio, Homebrew Temurin 17, `~/Library/Android/sdk`, or `/opt/homebrew/share/android-commandlinetools`.
2. The signing keystore must stay in `~/.cardholder-signing/`. Never print the passwords or commit the keystore.
3. The worktree must be clean. Commit first. The tag points at that commit.
4. Run `scripts/release-android.sh vX.Y.Z "release notes"`.
5. Report the release URL and the `version.json` URL.

The first local build compiles the native libraries and takes a long time. Later builds reuse the Gradle cache on this machine.

## GitHub Actions

Use this path only when they select `github`.

Pushing a tag does not start a build. Run the manual workflow:

```bash
gh workflow run "Build and Release APK" --ref main -f version=vX.Y.Z
```

The repository secrets `SIGNING_KEY_STORE_BASE64`, `SIGNKEY_STORE_PASSWORD`, `SIGNKEY_KEY_ALIAS`, and `SIGNKEY_KEY_PASSWORD` must already exist. Do not print them. Watch the run at `https://github.com/dork7/cardholder/actions`.
