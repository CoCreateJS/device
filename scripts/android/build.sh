#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
ANDROID_PROJECT="$REPO_ROOT/src/native/android"
VARIANT="${1:-release}"

case "$VARIANT" in
	debug) TASK=assembleDebug ;;
	release) TASK=bundleRelease ;;
	*) echo "Usage: $0 [debug|release]" >&2; exit 2 ;;
esac

if [[ "$(uname -s)" != "Linux" && "$(uname -s)" != "Darwin" ]]; then
	echo "Android build script expects Linux or macOS." >&2
	exit 1
fi

if [[ ! -x "$ANDROID_PROJECT/gradlew" ]]; then
	echo "Android host project is not scaffolded yet: expected executable $ANDROID_PROJECT/gradlew." >&2
	echo "Run device:android:setup for toolchain setup; add the Gradle host project before building." >&2
	exit 1
fi

source "$SCRIPT_DIR/env.sh"
use_android_jdk

SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"

cd "$ANDROID_PROJECT"
./gradlew --no-daemon :app:"$TASK"
if [[ "$VARIANT" == "debug" ]]; then
	echo "Debug APK: $ANDROID_PROJECT/app/build/outputs/apk/debug/app-debug.apk"
else
	echo "Release bundle: $ANDROID_PROJECT/app/build/outputs/bundle/release/app-release.aab"
fi
