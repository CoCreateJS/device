#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ACTION="${1:-archive}"
SCHEME="${COCREATE_IOS_SCHEME:-CoCreateDevice}"

if [[ "$(uname -s)" == "Darwin" ]]; then
	exec bash "$SCRIPT_DIR/build-local.sh" "$ACTION"
fi

if [[ -z "${COCREATE_IOS_SSH_HOST:-}" ]]; then
	echo "iOS builds require macOS. Set COCREATE_IOS_SSH_HOST and COCREATE_IOS_REMOTE_DIR to use a remote Mac host." >&2
	exit 1
fi
if [[ -z "${COCREATE_IOS_REMOTE_DIR:-}" ]]; then
	echo "Set COCREATE_IOS_REMOTE_DIR to the CoCreate-device checkout path on the Mac build host." >&2
	exit 1
fi

REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
if ! command -v rsync >/dev/null 2>&1; then echo "rsync is required to collect remote artifacts." >&2; exit 1; fi
if ! REVISION="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null)" || [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
 echo "Remote builds require committed source and a clean local checkout." >&2; exit 1
fi
REMOTE_ASSETS=""
if [[ -n "${COCREATE_DEVICE_ASSETS:-}" ]]; then
 if [[ ! -f "$COCREATE_DEVICE_ASSETS/device-app.json" ]]; then echo "Prepared app assets are missing device-app.json." >&2; exit 1; fi
 REMOTE_ASSETS="$COCREATE_IOS_REMOTE_DIR/build/ios-input/web"
 printf -v CREATE_ASSETS 'mkdir -p -- %q' "$REMOTE_ASSETS"
 ssh "$COCREATE_IOS_SSH_HOST" "$CREATE_ASSETS"
 rsync -a --delete --protect-args -- "$COCREATE_DEVICE_ASSETS/" "$COCREATE_IOS_SSH_HOST:$REMOTE_ASSETS/"
fi
printf -v REMOTE_COMMAND 'bash -s -- %q %q %q %q %q %q %q %q' \
 "$COCREATE_IOS_REMOTE_DIR" "$ACTION" "$SCHEME" \
 "${COCREATE_IOS_ARCHIVE_PATH:-}" "${COCREATE_IOS_EXPORT_OPTIONS:-}" \
 "${COCREATE_IOS_EXPORT_PATH:-}" "$REVISION" "$REMOTE_ASSETS"
ssh "$COCREATE_IOS_SSH_HOST" "$REMOTE_COMMAND" < "$SCRIPT_DIR/build-remote.sh"
mkdir -p "$REPO_ROOT/build/ios"
rsync -a --protect-args -- "$COCREATE_IOS_SSH_HOST:$COCREATE_IOS_REMOTE_DIR/build/ios/" "$REPO_ROOT/build/ios/"
echo "Collected iOS artifacts under $REPO_ROOT/build/ios."
