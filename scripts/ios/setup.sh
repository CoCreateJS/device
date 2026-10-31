#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(uname -s)" == "Darwin" ]]; then
	exec bash "$SCRIPT_DIR/setup-macos.sh"
fi

if [[ -z "${COCREATE_IOS_SSH_HOST:-}" ]]; then
	echo "iOS setup requires a macOS host with full Xcode. Set COCREATE_IOS_SSH_HOST to run the setup check over SSH, or run this command on a Mac." >&2
	exit 1
fi

ssh "$COCREATE_IOS_SSH_HOST" 'bash -s' < "$SCRIPT_DIR/setup-macos.sh"
