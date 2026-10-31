# Android host

Future Android WebView host implementation.

Responsibilities to define:

- Receive and validate the shared CoCreate device envelope.
- Map `method` and the `device` payload to Android capabilities and permissions.
- Return success, cancellation, denial, and failure through a response envelope preserving `uuid`.
- Support operation lifecycle messages for capabilities such as location watches and wake locks.

Build entry points are declared in the package scripts: `device:android:setup`, `device:android:build:debug`, and `device:android:build`. Setup targets Debian/Ubuntu Linux, installs JDK 17 and Android command-line tools, and prompts for SDK license acceptance. The build expects a Gradle wrapper and `app` module in this directory.

This directory is still a planning placeholder; Android source and Gradle project files have not been added. See [`scripts/android/`](../../../scripts/android/) for the setup and build scripts.
