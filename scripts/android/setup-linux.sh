#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
	echo "Android setup script expects Linux. On another OS, install Android command-line tools using the platform-specific instructions and set ANDROID_SDK_ROOT." >&2
	exit 1
fi

if [[ "$(uname -m)" != "x86_64" ]]; then
	echo "This Android Linux setup pins the x86_64 tool archive. Configure an appropriate SDK manually for this architecture." >&2
	exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
	echo "Automatic system dependency setup supports Debian/Ubuntu (apt-get). Install JDK 17, curl, unzip, and zip manually on this Linux distribution." >&2
	exit 1
fi

echo "Installing JDK 17 and Android SDK download utilities (sudo may prompt for your password)."
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk curl unzip zip

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"
use_android_jdk

SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
CMDLINE_TOOLS="$SDK_ROOT/cmdline-tools/latest"
SDKMANAGER="$CMDLINE_TOOLS/bin/sdkmanager"
TOOLS_VERSION="15859902"
TOOLS_SHA256="4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583"
TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${TOOLS_VERSION}_latest.zip"

mkdir -p "$SDK_ROOT/cmdline-tools"
if [[ ! -x "$SDKMANAGER" ]]; then
	if [[ -e "$CMDLINE_TOOLS" ]]; then
		echo "Found $CMDLINE_TOOLS but sdkmanager is missing. Move the incomplete directory aside, then rerun setup." >&2
		exit 1
	fi
	TMP_DIR="$(mktemp -d)"
	trap 'rm -r -- "$TMP_DIR"' EXIT
	echo "Downloading Android command-line tools $TOOLS_VERSION."
	curl --fail --location --retry 3 "$TOOLS_URL" --output "$TMP_DIR/android-command-line-tools.zip"
	echo "$TOOLS_SHA256  $TMP_DIR/android-command-line-tools.zip" | sha256sum --check --status || {
		echo "Android command-line tools checksum verification failed." >&2
		exit 1
	}
	unzip -q "$TMP_DIR/android-command-line-tools.zip" -d "$TMP_DIR"
	mv "$TMP_DIR/cmdline-tools" "$CMDLINE_TOOLS"
fi

export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export PATH="$SDK_ROOT/platform-tools:$CMDLINE_TOOLS/bin:$PATH"

echo "Review and accept the Android SDK license agreements when prompted."
"$SDKMANAGER" --sdk_root="$SDK_ROOT" --licenses
"$SDKMANAGER" --sdk_root="$SDK_ROOT" --install "platform-tools"

if [[ -n "${ANDROID_COMPILE_SDK:-}" ]]; then
	"$SDKMANAGER" --sdk_root="$SDK_ROOT" --install "platforms;android-${ANDROID_COMPILE_SDK}"
fi

echo "Android command-line tools are ready at $SDK_ROOT."
echo "Build scripts will use ANDROID_SDK_ROOT for this process."
echo "Gradle wrapper will be added with the Android host project under src/native/android."
