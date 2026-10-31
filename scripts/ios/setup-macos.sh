#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
	echo "The iOS setup check must run on macOS. Xcode cannot be installed or run on this Linux host." >&2
	exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
	echo "Install full Xcode from Apple, launch it once, and accept its license before building iOS apps." >&2
	exit 1
fi

if ! xcode-select --print-path >/dev/null 2>&1; then
	echo "Xcode is installed but not selected. Run: sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer" >&2
	exit 1
fi

xcodebuild -version
echo "Xcode command-line build tools are ready. iOS host project will live in src/native/ios."
