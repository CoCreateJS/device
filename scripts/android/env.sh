#!/usr/bin/env bash

use_android_jdk() {
	local candidate
	if [[ -n "${JAVA_HOME:-}" && ! -x "$JAVA_HOME/bin/java" ]]; then
		echo "JAVA_HOME does not contain an executable Java installation." >&2
		return 1
	fi
	if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
		export PATH="$JAVA_HOME/bin:$PATH"
		return
	fi
	for candidate in /usr/lib/jvm/java-17-openjdk-*; do
		if [[ -x "$candidate/bin/java" ]]; then
			export JAVA_HOME="$candidate"
			export PATH="$JAVA_HOME/bin:$PATH"
			return
		fi
	done
	if ! command -v java >/dev/null 2>&1; then
		echo "Java is missing. Run device:android:setup first." >&2
		return 1
	fi
}
