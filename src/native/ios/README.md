# iOS host

Future iOS WebView host implementation.

Responsibilities to define:

- Receive and validate the shared CoCreate device envelope.
- Map `method` and the `device` payload to iOS capabilities and permission flows.
- Return success, cancellation, denial, and failure through a response envelope preserving `uuid`.
- Support operation lifecycle messages for capabilities such as location watches and wake locks.

Build entry points are declared in the package scripts: `device:ios:setup`, `device:ios:build:simulator`, `device:ios:build`, and `device:ios:export`. Full Xcode is required. Linux can dispatch setup and builds over SSH to a Mac using `COCREATE_IOS_SSH_HOST` and `COCREATE_IOS_REMOTE_DIR`.

This directory is still a planning placeholder; iOS source and Xcode project files have not been added. See [`scripts/ios/`](../../../scripts/ios/) for setup and build scripts.
