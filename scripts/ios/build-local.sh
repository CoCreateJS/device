#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
IOS_PROJECT="$REPO_ROOT/src/native/ios"
ACTION="${1:-archive}"
SCHEME="${COCREATE_IOS_SCHEME:-CoCreateDevice}"

if [[ "$(uname -s)" != "Darwin" ]]; then
	echo "iOS builds require macOS and Xcode." >&2
	exit 1
fi
if ! command -v xcodebuild >/dev/null 2>&1; then
	echo "xcodebuild is unavailable. Run device:ios:setup on this Mac first." >&2
	exit 1
fi
if [[ ! -d "$IOS_PROJECT" ]]; then
	echo "iOS host project directory is not present: $IOS_PROJECT" >&2
	exit 1
fi

PROJECT_ARGS=()
if [[ "$ACTION" != "export" ]]; then
 source "$SCRIPT_DIR/project.sh"
 select_ios_project "$IOS_PROJECT"
fi
ARCHIVE_PATH="${COCREATE_IOS_ARCHIVE_PATH:-$REPO_ROOT/build/ios/CoCreateDevice.xcarchive}"

case "$ACTION" in
	simulator)
		xcodebuild "${PROJECT_ARGS[@]}" -scheme "$SCHEME" -configuration Debug \
			-destination 'generic/platform=iOS Simulator' -derivedDataPath "$REPO_ROOT/build/ios/DerivedData" build
		;;
	archive)
		mkdir -p "$(dirname -- "$ARCHIVE_PATH")"
		xcodebuild "${PROJECT_ARGS[@]}" -scheme "$SCHEME" -configuration Release \
			-destination 'generic/platform=iOS' -archivePath "$ARCHIVE_PATH" archive
		echo "iOS archive: $ARCHIVE_PATH"
		;;
	export)
		if [[ -z "${COCREATE_IOS_EXPORT_OPTIONS:-}" || ! -f "$COCREATE_IOS_EXPORT_OPTIONS" ]]; then
			echo "Set COCREATE_IOS_EXPORT_OPTIONS to an ExportOptions.plist for signed IPA export." >&2
			exit 1
		fi
		EXPORT_PATH="${COCREATE_IOS_EXPORT_PATH:-$REPO_ROOT/build/ios/export}"
		mkdir -p "$EXPORT_PATH"
		xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" \
			-exportOptionsPlist "$COCREATE_IOS_EXPORT_OPTIONS" -exportPath "$EXPORT_PATH"
		echo "Exported iOS package: $EXPORT_PATH"
		;;
	*) echo "Usage: $0 [simulator|archive|export]" >&2; exit 2 ;;
esac
