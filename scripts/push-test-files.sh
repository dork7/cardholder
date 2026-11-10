#!/usr/bin/env bash
# Copies the sample documents in dataSet/ onto running emulators and simulators, so they can be picked
# in Doc Keeper like a user's own: photos go to the photo library, PDFs to Downloads (Android) or
# Files → On My iPhone (iOS), each in a "DocKeeperTest" folder.
#
# Usage:
#   scripts/push-test-files.sh               every running Android emulator and booted iOS simulator
#   scripts/push-test-files.sh android       Android emulators only
#   scripts/push-test-files.sh ios           booted iOS simulators only
#   scripts/push-test-files.sh --device ID   one device: an adb serial (a real phone works too) or a simulator UDID
#   scripts/push-test-files.sh --clean ...   on Android, and in iOS Files, remove what an earlier run copied first
#
# dataSet/ is git-ignored: real documents stay on this machine. Subfolders are fine.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$root/dataSet"
folder="DocKeeperTest"

platform="all"
device=""
clean=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    android | ios | all) platform="$1" ;;
    --device) device="${2:?--device needs an adb serial or a simulator UDID}"; shift ;;
    --clean) clean=true ;;
    -h | --help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (see --help)"; exit 1 ;;
  esac
  shift
done

if [[ ! -d "$source_dir" ]]; then
  mkdir -p "$source_dir"
  echo "Created $source_dir. Put sample photos (.jpg .jpeg .png .heic .webp) and PDFs in it, then run this again."
  exit 1
fi

photos=()
pdfs=()
while IFS= read -r -d '' file; do
  case "$(echo "${file##*.}" | tr '[:upper:]' '[:lower:]')" in
    jpg | jpeg | png | heic | heif | webp) photos+=("$file") ;;
    pdf) pdfs+=("$file") ;;
  esac
done < <(find "$source_dir" -type f ! -name '.*' -print0 | sort -z)

if [[ ${#photos[@]} -eq 0 && ${#pdfs[@]} -eq 0 ]]; then
  echo "No photos or PDFs in $source_dir."
  exit 1
fi
echo "Found ${#photos[@]} photo(s) and ${#pdfs[@]} PDF(s) in dataSet/."

copied=0

# ---------- Android ----------

adb_bin="$(command -v adb || true)"
if [[ -z "$adb_bin" ]]; then
  for sdk in "${ANDROID_HOME:-}" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    [[ -n "$sdk" && -x "$sdk/platform-tools/adb" ]] && adb_bin="$sdk/platform-tools/adb" && break
  done
fi

push_android() {
  local serial="$1"
  local adb=("$adb_bin" -s "$serial")
  local pictures="/sdcard/Pictures/$folder" downloads="/sdcard/Download/$folder"
  if $clean; then
    "${adb[@]}" shell rm -rf "$pictures" "$downloads"
  fi
  "${adb[@]}" shell mkdir -p "$pictures" "$downloads"
  local file
  for file in ${photos[@]+"${photos[@]}"}; do "${adb[@]}" push -q "$file" "$pictures/" >/dev/null; done
  for file in ${pdfs[@]+"${pdfs[@]}"}; do "${adb[@]}" push -q "$file" "$downloads/" >/dev/null; done
  # The photo picker only shows files the media store knows about. Android 11 and later scan a whole
  # volume on request; older versions take the per-file broadcast.
  if ! "${adb[@]}" shell content call --uri content://media --method scan_volume --arg external_primary >/dev/null 2>&1; then
    for file in ${photos[@]+"${photos[@]}"} ${pdfs[@]+"${pdfs[@]}"}; do
      local dir="$pictures"
      [[ "$file" == *.[pP][dD][fF] ]] && dir="$downloads"
      "${adb[@]}" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
        -d "file://$dir/$(basename "$file")" >/dev/null 2>&1 || true
    done
  fi
  echo "Android $serial: photos in Pictures/$folder, PDFs in Download/$folder."
  copied=$((copied + 1))
}

if [[ "$platform" != "ios" ]]; then
  if [[ -z "$adb_bin" ]]; then
    [[ "$platform" == "android" ]] && { echo "adb was not found. Install Android Studio, or set ANDROID_HOME."; exit 1; }
  else
    serials=()
    if [[ -n "$device" ]]; then
      "$adb_bin" devices | awk 'NR > 1 && $2 == "device" { print $1 }' | grep -qx "$device" && serials=("$device")
    else
      # Emulators only by default: a real phone is copied to only when it is named with --device.
      while read -r serial; do serials+=("$serial"); done < <("$adb_bin" devices | awk 'NR > 1 && $2 == "device" && $1 ~ /^emulator-/ { print $1 }')
    fi
    for serial in ${serials[@]+"${serials[@]}"}; do push_android "$serial"; done
  fi
fi

# ---------- iOS ----------

push_ios() {
  local udid="$1" name="$2"
  if [[ ${#photos[@]} -gt 0 ]]; then
    # Adds to Photos each time it runs: running it twice gives two copies of each photo.
    xcrun simctl addmedia "$udid" "${photos[@]}"
  fi
  if [[ ${#pdfs[@]} -gt 0 ]]; then
    # Files → On My iPhone is the Files app's local storage group on the simulator's disk.
    local storage
    storage="$(xcrun simctl get_app_container "$udid" com.apple.DocumentsApp groups 2>/dev/null \
      | awk '/FileProvider.LocalStorage/ { $1 = ""; sub(/^ /, ""); print }')"
    if [[ -n "$storage" ]]; then
      local target="$storage/File Provider Storage/$folder"
      $clean && rm -rf "$target"
      mkdir -p "$target"
      cp "${pdfs[@]}" "$target/"
    else
      echo "  $name: couldn't find the Files app's storage; open Files once on the simulator and run this again for the PDFs."
    fi
  fi
  echo "iOS $name: photos in Photos, PDFs in Files → On My iPhone → $folder."
  copied=$((copied + 1))
}

if [[ "$platform" != "android" ]] && command -v xcrun >/dev/null 2>&1; then
  while IFS=$'\t' read -r udid name; do
    [[ -z "$udid" ]] && continue
    push_ios "$udid" "$name"
  done < <(xcrun simctl list devices booted -j | node -e '
    const want = process.argv[1];
    const { devices } = JSON.parse(require("fs").readFileSync(0, "utf8"));
    for (const list of Object.values(devices))
      for (const d of list)
        if (d.state === "Booted" && (!want || d.udid === want)) console.log(`${d.udid}\t${d.name}`);
  ' "$device")
fi

if [[ $copied -eq 0 ]]; then
  if [[ -n "$device" ]]; then
    echo "No running device or booted simulator with the id $device."
  else
    echo "No running Android emulator or booted iOS simulator. Start one, then run this again."
  fi
  exit 1
fi
