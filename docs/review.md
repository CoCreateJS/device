# Review remediation

The confirmed JavaScript defects identified in the initial scaffold review have been corrected. This status distinguishes locally tested behavior from platform work that still requires native projects and build hosts.

## Applied corrections

| Finding | Applied fix |
| --- | --- |
| Request-shaped replies and duplicate UUIDs could complete the wrong promise | Response flag, method, UUID, caller context, and transport identity are checked. Duplicate pending UUIDs are rejected. |
| Rejected async sends became timeouts | Both sync and async transport errors reject and clean up the owned request. |
| Repeated installation recaptured shims as browser originals | Bootstrap checks installed state first. Browser handlers capture originals independently; restoration removes lifecycle listeners and settles pending calls. |
| Contacts prototype methods disappeared | A nested facade forwards unchanged members; `getProperties()` and `select()` have separate native support checks. Malformed native results reject. |
| Forwarded methods changed identity on every access | Bound functions are cached while their backing methods remain unchanged. Constructors, getters, and ordinary writes retain their backing object behavior. |
| Unsupported capabilities appeared available | Native routes require protocol version 1 plus advertised methods or synchronous affirmative support. Unavailable overrides fall through to the original browser object. |
| Picker requests timed out while the user was choosing | Contact selection disables automatic timeout; callers can set a method/request deadline or abort explicitly. |
| Browser routing existed only after native shim installation | The normal Device API now initializes its own captured browser implementations. Browser route invocation happens before an asynchronous boundary. |
| Generic unsupported errors caused unsafe retry | Only the explicit unsupported-capability code permits noninteractive fallback. Contact selection never retries a native operation through the browser. |
| Native entry metadata had no build effect | `build:native` explicitly selects the native entry and separate output directory. Local builds upload only with an explicit flag. |
| App assets had no preparation step | An app configuration example and preparation command copy assets, prepend the native bootstrap, and record app identity and content digest. |
| Build/setup scripts mixed roles or selected unintended projects | Android reports missing project before needing Java; Xcode selection ignores project-internal workspaces and rejects ambiguity; Windows provisioning no longer initializes source files and checks the CLI version. |
| Remote builds did not establish source identity or retrieve output | Remote iOS checks clean matching revisions, supports prepared-asset transfer, and retrieves generated artifacts with rsync. |
| Copied workflows could release without validation | CI runs regression/syntax checks, with a bundle job. Manual distribution builds upload workflow artifacts. Native publishing remains a separate future workflow. |

## Local verification

`npm test` currently passes 36 tests and covers response correlation, concurrent requests, sync/async transport failure, invalid input, abort/disconnect/timeout cleanup, fallback and user-activation-sensitive routing, navigator installation/restoration, supported method exposure, Contacts validation, prototype forwarding, asset preparation, bundle selection, and platform-script failure paths.

JavaScript and Bash syntax checks pass. Webpack configuration is tested with plugin stubs; dependencies have not been installed and real distributions have not been bundled locally. PowerShell syntax is configured for Windows CI but has not been executed on this Linux machine. CI workflow files are committed source scaffolds here and have not been run on GitHub.

## Still pending

- Android, iOS, and Windows host projects, platform dispatch tables, and host-side origin/permission enforcement.
- Real navigator/WebIDL compatibility checks in Android WebView, WKWebView, and WebView2. Locked navigator accessors are reported as unsupported; this does not establish a universal facade workaround.
- Native consumption of prepared app assets, pinned platform project toolchains, signed app outputs, and Store submission.
- Real Mac/Windows toolchain and SSH artifact-flow validation.
- Subscriptions and native operation-handle mapping for APIs such as geolocation watching and wake lock. The current lifecycle API handles one-shot requests; it does not claim those future APIs are implemented.
- Cross-platform files, blobs, streaming, and binary payload contracts.

No SDKs were installed, no remote build was started, and no native app was built during remediation. The next milestone is the Android host and a real contact-selection flow through existing CoCreate markup.
