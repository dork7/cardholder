#!/usr/bin/env bash
# Build a signed Android APK on this machine and publish it to GitHub Releases.
# Users get the same update as a CI release: DocKeeper-<version>.apk and version.json.
#
# Usage:
#   scripts/release-android.sh v1.2.3
#   scripts/release-android.sh v1.2.3 "Bug fixes and performance improvements."
#
# Requires JDK 17, the Android SDK, and the keystore in ~/.cardholder-signing/.
# One-time setup on a Mac is Android Studio, which provides both.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

tag="${1:-}"
notes="${2:-}"
signing_dir="${HOME}/.cardholder-signing"

if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: scripts/release-android.sh v1.2.3 [release notes]"
  exit 1
fi

version_name="${tag#v}"
if [[ -n "$(git diff --name-only)" || -n "$(git diff --cached --name-only)" ]]; then
  echo "Commit or stash changes before releasing. The GitHub tag is the commit this APK is built from."
  exit 1
fi

if [[ ! -f "$signing_dir/release.jks" || ! -f "$signing_dir/store-password" || ! -f "$signing_dir/key-password" || ! -f "$signing_dir/key-alias" ]]; then
  echo "Missing the release keystore in $signing_dir"
  exit 1
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -x "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/java" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  elif [[ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  elif /usr/libexec/java_home -v 17 >/dev/null 2>&1; then
    JAVA_HOME="$(/usr/libexec/java_home -v 17)"
    export JAVA_HOME
  fi
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="${JAVA_HOME}/bin:${PATH}"
fi
if [[ -z "${ANDROID_HOME:-}" && -d "${HOME}/Library/Android/sdk" ]]; then
  export ANDROID_HOME="${HOME}/Library/Android/sdk"
elif [[ -z "${ANDROID_HOME:-}" && -d "/opt/homebrew/share/android-commandlinetools" ]]; then
  export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
fi
export ANDROID_SDK_ROOT="${ANDROID_HOME:-}"

if ! command -v java >/dev/null 2>&1; then
  echo "Java was not found. Install Android Studio, then run this script again."
  exit 1
fi
if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME" ]]; then
  echo "The Android SDK was not found. Install Android Studio, then run this script again."
  exit 1
fi

if [[ -x "/usr/local/n/versions/node/22.21.0/bin/node" ]]; then
  export PATH="/usr/local/n/versions/node/22.21.0/bin:${PATH}"
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is not installed."
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  token="$(git credential fill <<'EOF' | awk -F= '/^password=/{print substr($0,10)}'
protocol=https
host=github.com

EOF
)"
  if [[ -z "$token" ]]; then
    echo "GitHub CLI is not logged in. Run: gh auth login"
    exit 1
  fi
  export GH_TOKEN="$token"
fi

repo="$(git remote get-url origin | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')"
# Without notes given, every change since the last release, one per line; merge commits are left out
# because they repeat the changes they bring in.
if [[ -z "$notes" ]]; then
  previous="$(git describe --tags --abbrev=0 --match 'v[0-9]*' HEAD^ 2>/dev/null || true)"
  if [[ -n "$previous" ]]; then
    notes="$(git log --no-merges --pretty='- %s' "${previous}..HEAD")"
  fi
  if [[ -z "$notes" ]]; then
    notes="$(git log -1 --pretty=%s)"
  fi
fi

app_json_backup="$(mktemp)"
cp app.json "$app_json_backup"
cleanup() {
  cp "$app_json_backup" app.json
  rm -f "$app_json_backup"
}
trap cleanup EXIT

RELEASE_TAG="$tag" node <<'EOF'
const fs = require('fs');
const tag = process.env.RELEASE_TAG;
const match = tag.match(/^v(\d+)\.(\d+)\.(\d+)$/);
const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]);
if (minor > 999 || patch > 999) {
  console.error('Minor and patch must be 999 or less so versionCode stays unique');
  process.exit(1);
}
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.expo.version = `${major}.${minor}.${patch}`;
app.expo.android.versionCode = major * 1000000 + minor * 1000 + patch;
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
console.log(`versionName=${app.expo.version} versionCode=${app.expo.android.versionCode}`);
EOF

export EXPO_NO_TELEMETRY=1
npx expo prebuild --platform android --no-install
# The Expo template allows only 10 seconds to download Gradle. A home connection
# often needs longer.
wrapper_props="android/gradle/wrapper/gradle-wrapper.properties"
if [[ -f "$wrapper_props" ]]; then
  if grep -q '^networkTimeout=' "$wrapper_props"; then
    sed -i '' 's/^networkTimeout=.*/networkTimeout=120000/' "$wrapper_props"
  else
    printf '\nnetworkTimeout=120000\n' >> "$wrapper_props"
  fi
fi
node scripts/configure-android-release-signing.js
cp "$signing_dir/release.jks" android/app/release.jks

export SIGNING_STORE_FILE=release.jks
SIGNKEY_STORE_PASSWORD="$(cat "$signing_dir/store-password")"
SIGNKEY_KEY_PASSWORD="$(cat "$signing_dir/key-password")"
SIGNKEY_KEY_ALIAS="$(cat "$signing_dir/key-alias")"
export SIGNKEY_STORE_PASSWORD SIGNKEY_KEY_PASSWORD SIGNKEY_KEY_ALIAS

(
  cd android
  ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
)

apk="android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$apk" ]]; then
  echo "Signed APK was not produced"
  find android/app/build/outputs/apk -name '*.apk' -print
  exit 1
fi

apksigner="$(find "$ANDROID_HOME/build-tools" -name apksigner | sort | tail -1)"
if [[ -n "$apksigner" ]]; then
  "$apksigner" verify --print-certs "$apk" | tee /tmp/apk-certs.txt
  if grep -q "CN=Android Debug" /tmp/apk-certs.txt; then
    echo "APK is signed with the Android debug keystore"
    exit 1
  fi
fi

release_apk="android/app/build/outputs/apk/release/DocKeeper-${version_name}.apk"
cp "$apk" "$release_apk"

RELEASE_TAG="$tag" RELEASE_NOTES="$notes" RELEASE_REPO="$repo" node <<'EOF'
const fs = require('fs');
const tag = process.env.RELEASE_TAG;
const versionName = tag.slice(1);
const notes = process.env.RELEASE_NOTES;
const repo = process.env.RELEASE_REPO;
const match = tag.match(/^v(\d+)\.(\d+)\.(\d+)$/);
const versionCode = Number(match[1]) * 1000000 + Number(match[2]) * 1000 + Number(match[3]);
const apkName = `DocKeeper-${versionName}.apk`;
const manifest = {
  versionCode,
  versionName,
  apkUrl: `https://github.com/${repo}/releases/download/${tag}/${apkName}`,
  releaseNotes: notes,
};
const out = 'android/app/build/outputs/apk/release/version.json';
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
EOF

manifest="android/app/build/outputs/apk/release/version.json"
if gh release view "$tag" --repo "$repo" >/dev/null 2>&1; then
  gh release upload "$tag" --repo "$repo" --clobber "$release_apk" "$manifest"
else
  gh release create "$tag" --repo "$repo" --title "$tag" --notes "$notes" --target "$(git rev-parse HEAD)" \
    "$release_apk" "$manifest"
fi

echo "Published https://github.com/${repo}/releases/tag/${tag}"
echo "Update manifest: https://github.com/${repo}/releases/latest/download/version.json"
