#!/usr/bin/env bash
# Delete old GitHub releases, keeping the newest few by version number (three unless told otherwise).
# Only releases named like v1.2.3 are counted or deleted. Their git tags stay, so every released
# commit can still be found; only the release page and its APK go.
#
# Usage:
#   scripts/prune-releases.sh owner/repo            # keep 3
#   scripts/prune-releases.sh owner/repo 5          # keep 5
#   scripts/prune-releases.sh owner/repo 3 v1.2.3   # and never delete v1.2.3
#   DRY_RUN=1 scripts/prune-releases.sh owner/repo  # only say what would go

set -euo pipefail

repo="${1:-}"
keep="${2:-3}"
never="${3:-}"

if [[ -z "$repo" || ! "$keep" =~ ^[1-9][0-9]*$ ]]; then
  echo "Usage: scripts/prune-releases.sh owner/repo [how many to keep] [tag never to delete]"
  exit 1
fi

old="$(
  gh release list --repo "$repo" --limit 1000 --json tagName --jq '.[].tagName' |
    grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' |
    sort -t. -k1.2,1nr -k2,2nr -k3,3nr |
    tail -n +"$((keep + 1))"
)"

for tag in $old; do
  if [[ "$tag" == "$never" ]]; then
    continue
  fi
  if [[ -n "${DRY_RUN:-}" ]]; then
    echo "Would delete release $tag"
  else
    gh release delete "$tag" --repo "$repo" --yes
    echo "Deleted release $tag"
  fi
done
