# Native hosts

Platform hosts receive CoCreate device envelopes from the WebView, invoke the operating system capability, and return a response envelope with the original `uuid`.

The JavaScript native-build entry is `index.js`. It installs a navigator facade and the initial API shims in `shims/`. The facade forwards APIs it does not override to the original navigator object.

Platform-specific implementation notes:

- [Android](android/README.md)
- [iOS](ios/README.md)
- [Windows](windows/README.md)

Platform project folders are placeholders. Shared JavaScript bootstrap, facade, lifecycle handling, and platform build orchestration exist; native host projects remain pending.
