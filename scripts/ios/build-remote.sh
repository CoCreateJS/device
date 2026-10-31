#!/usr/bin/env bash
set -euo pipefail
REMOTE_REPO="${1:?Remote repository path is required}"
ACTION="${2:-archive}"
SCHEME="${3:-CoCreateDevice}"
ARCHIVE_PATH="${4:-}"
EXPORT_OPTIONS="${5:-}"
EXPORT_PATH="${6:-}"
EXPECTED_REVISION="${7:?Expected source revision is required}"
ASSETS="${8:-}"
cd "$REMOTE_REPO"
if [[ "$(git rev-parse HEAD)" != "$EXPECTED_REVISION" || -n "$(git status --porcelain)" ]]; then
 echo "Remote checkout must be clean and match revision $EXPECTED_REVISION. Update it before building." >&2
 exit 1
fi
for output in "$ARCHIVE_PATH" "$EXPORT_PATH"; do
 if [[ -n "$output" && "$output" != "$REMOTE_REPO/build/ios/"* ]]; then
  echo "Remote custom outputs must stay under $REMOTE_REPO/build/ios for artifact collection." >&2; exit 1
 fi
done
COCREATE_IOS_SCHEME="$SCHEME" COCREATE_IOS_ARCHIVE_PATH="$ARCHIVE_PATH" \
 COCREATE_IOS_EXPORT_OPTIONS="$EXPORT_OPTIONS" COCREATE_IOS_EXPORT_PATH="$EXPORT_PATH" \
 COCREATE_DEVICE_ASSETS="$ASSETS" bash scripts/ios/build-local.sh "$ACTION"
