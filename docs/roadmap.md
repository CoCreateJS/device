# Implementation roadmap

Platform order: Android, iOS, Windows. The current repository contains a runtime scaffold and orchestration scripts; none of the three host projects can produce an app yet.

## 1. Shared runtime remediation — implemented, platform validation pending

- Confirmed bridge and facade defects have regression coverage and corrections in [review.md](review.md).
- Protocol version/capability advertisement, response validation, encoding, and native/browser fallback are implemented; actual hosts must implement the same contract.
- Preserve original navigator members and repeated installation/restoration behavior.
- Preserve complete API signatures; expose capabilities accurately to existing feature checks.
- Explicit native bundle selection and staged bootstrap insertion are implemented and covered by local tests.

Completion evidence: targeted tests cover valid and malformed responses, concurrent requests, transport rejection, cancellation, and fallback. The existing Contact Picker and Badging modules run unchanged against original browser methods and a simulated host. Real WebView compatibility remains a separate check.

## 2. Build one Android app from end to end

- Add the pinned Gradle wrapper, Android project, WebView activity, and native message receiver under `src/native/android`.
- Define one app input configuration and a web asset preparation step.
- Load the same declarative app through the WebView and install its native bootstrap early.
- Prove a request/response round trip before adding an OS capability.
- Implement contact selection and supported contact properties with accurate cancellation and consent behavior. Start with the subset the host actually supports.
- Generate a debug APK, then configure an independently reviewed release-signing path for the AAB.

Completion evidence: a reproducible debug APK launches the HTML app; the existing contact-selection declaration opens the native picker and receives the expected result. Unsupported capabilities take the browser path when available, without repeating a denied or cancelled operation.

## 3. Complete capability lifecycles

- Add host readiness and disposal on page navigation or WebView shutdown.
- Implement operation subscriptions before adding location watching or wake lock.
- Define native handle mapping, event delivery, cancellation, and cleanup.
- Document native/browser differences per method rather than declaring an entire platform supported.

Completion evidence: navigation releases resources, callbacks stop after cancellation, and JS-facing return values and events match the existing components' expectations.

## 4. Complete reproducible platform builds

- Read-only doctor commands are implemented alongside setup commands.
- Separate machine provisioning from per-app project preparation.
- Pin tool versions and keep generated app workspaces outside shared source templates.
- Remote iOS source revision checks and optional asset transfer are implemented; validate on a real Mac.
- Remote iOS artifact collection is implemented; validate transfer and platform build metadata on a real Mac.
- Add local checks and platform CI jobs before enabling native distribution workflows.

Completion evidence: a new Linux build host can prepare and build the same Android app using documented inputs; the resulting artifact identifies its source revision and app configuration.

## 5. Implement the iOS host

- Add the WKWebView project and Swift message adapter under `src/native/ios`.
- Reuse the envelope, capability negotiation, shims, and app input configuration.
- Validate the navigator facade in WKWebView before expanding native methods.
- Complete Mac setup diagnostics, simulator build, archive, signed export, and remote artifact retrieval.

Completion evidence: the same HTML contact-selection flow works in the iOS host, followed by the capability lifecycle checks. The Mac build uses the requested revision and returns its artifacts.

## 6. Implement the Windows host

- Add the WinUI/WebView2 project under `src/native/windows`.
- Pin the selected SDK/CLI workflow, including the public-preview tool dependency if retained.
- Implement the same envelope and capability contract over WebView2 messages.
- Verify Debug and Release behavior, runtime deployment, MSIX signing, and the required Store-upload format.

Completion evidence: the same declarative app runs in a Windows window and uses supported native capabilities without changing the component calls.

## Proposed documentation sections

As implementation lands, maintain focused sections for app configuration, envelopes and routing, navigator compatibility, capability support, host lifecycles, build environments, signing/artifacts, and troubleshooting. Add implementation files only as those contracts become concrete.
