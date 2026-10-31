# Device architecture

This document separates the agreed direction from proposed work. The shared runtime and asset preparation are implemented; platform hosts and native packaging remain pending. See [review.md](review.md) for remediation status and [roadmap.md](roadmap.md) for implementation order.

## Existing application contract

HTML declarations, CSS, Actions, and existing CoCreate components remain the application-facing API. Badging continues to call `navigator.setAppBadge()` and Contact Picker continues to call `navigator.contacts.select(properties, options)`.

A native build installs one navigator controller before application modules initialize. The controller captures the original navigator, overrides supported capabilities, and forwards other members with their original receivers. Capability-specific shims translate browser arguments and results to and from the shared device envelope.

```text
HTML declarations and existing CoCreate components
  → navigator facade
    → supported native shim → Device.send(envelope) → WebView host → OS API
    → captured browser API
```

The source layout remains `src/browser`, `src/bridge`, and `src/native`. Platform host source belongs under `src/native/android`, `src/native/ios`, and `src/native/windows`. Repository-level scripts coordinate tool installation and builds.

## Startup and capability discovery

1. The host loads the configured app entry and establishes the local WebView message channel.
2. It supplies its supported methods and protocol compatibility before application capability checks run.
3. The native bootstrap captures the original navigator once, installs supported shims once, and registers browser fallbacks against the originals.
4. Existing CoCreate components initialize and the HTML app runs.
5. Host shutdown or page replacement disposes outstanding requests and active operations.

`build:native` explicitly selects the native Webpack entry. Protocol version 1 and a supported-method manifest (or a synchronous affirmative support check) are required before native methods appear. Hosts can attach a transport later; facade getters read current availability. The host must still establish its channel before app initialization when consumers cache feature checks.

Support is capability-specific. A shim should expose a method when the host or browser can implement it. Build target, device identity, API availability, and permission state are separate facts. Permission denial does not mean that a capability is absent.

## Shared envelope

The device transport preserves CoCreate's `method`, `uuid`, and capability payload convention. Existing metadata can travel with the request; using the same envelope does not require opening a socket to call a local OS API.

```js
// Request
{
  method: "device.contacts.select",
  uuid: "request-uuid",
  device: {
    properties: ["name", "email", "tel"],
    options: { multiple: true }
  }
}

// Response
{
  method: "device.contacts.select",
  uuid: "request-uuid",
  response: true,
  device: { contacts: [] }
}
```

These examples align with the current Contacts shim. Other capability schemas remain to be defined. The transport advertises `protocolVersion: 1` and `capabilities` or `supports(method)` before native routing is enabled. The envelope itself retains CoCreate method/uuid/device conventions.

`uuid` identifies a request/response exchange. `clientId` and `frameId` can identify the caller where required. Socket, worker, and server identifiers retain their existing meaning when present; a local transport should not fabricate them. An envelope is routing data, not permission to invoke an OS capability.

Responses must match an outstanding request, identify themselves as responses, and belong to the expected method and WebView context. Duplicate in-flight UUIDs must be rejected or explicitly coordinated. Unknown and late responses must not complete another request. Serialization, transport failure, cancellation, host disconnect, and timeout need defined outcomes.

## Browser API compatibility

Each shim preserves the public browser API shape, including callbacks, synchronous return values, exceptions, events, and object lifetimes where applicable. A native message may be asynchronous even when the JavaScript method must return a handle synchronously.

| Capability | Compatibility work |
| --- | --- |
| Badging | Preserve void promise results and browser argument validation; document platform badge differences. |
| Contacts | Preserve `select()` and `getProperties()`, supported property names, consent, cancellation, and selected-contact result shapes. |
| Geolocation | Preserve callback signatures; return watch identifiers synchronously and map them to native subscriptions. |
| Wake lock | Recreate a JavaScript object with `type`, `released`, `release()`, and release events; a JSON result alone cannot replace the sentinel. |
| Clipboard and sharing | Define files, blobs, media types, and user-activation requirements before choosing serialization. |

Browser fallback should happen only when a capability is unavailable. Cancellation, permission denial, malformed input, and ordinary operation failures must reach the caller. A late fallback after waiting on native code may lose browser transient user activation, so known browser routes should be selected immediately when required.

A generic `NotSupportedError` does not always mean an entire capability is unavailable. The host and shim must distinguish unsupported capabilities from unsupported request options before permitting fallback. This does not establish a new framework-wide element error representation.

The [Contact Picker draft](https://w3c.github.io/contact-picker/) defines both `select()` and `getProperties()`; its interface is the reference for the Contacts shim.

## Host transports

Hosts adapt their platform messaging channel to the same JavaScript bridge contract:

| Target | Host direction |
| --- | --- |
| Android | Kotlin/Java WebView host using an origin-restricted message channel. |
| iOS | Swift WKWebView host with script message handlers and a response channel. |
| Windows | WebView2 host exchanging structured messages with JavaScript. |

All three are currently planning placeholders. Define object versus string encoding once at the transport boundary. Keep binary transfers and streaming as explicit future contracts rather than assuming all browser values survive JSON serialization.

The host selects the allowed app origin and method dispatch table. Frame identity comes from the WebView channel where possible. Native access should not be automatically granted to arbitrary inbound socket or mesh messages merely because their envelope has a device method.

References: [Android WebView bridge](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge), [WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler), [WebView2 messaging](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/communicate-btwn-web-native).

## App input and generated output

The framework needs an app description: application ID, name, version, web asset directory and entry, enabled capabilities, allowed origins, and platform build settings. A hosted URL can be a separate explicit input mode. Credentials should be referenced from the build host environment.

`device.config.example.json` defines app identity, webDir, entry, enabled capabilities, and origins. `device:prepare` builds the native bootstrap and stages the web app. Platform-specific SDK/signing configuration remains to be added with the native projects. `CoCreate.config.js` continues to describe documentation uploads.

Reusable host sources stay under `src/native/<platform>`. Web preparation creates a per-app staged directory and content digest under ignored `build/`; native project workspace generation remains pending, so the same framework can build multiple app identities without editing its shared host sources.

```text
App configuration + HTML/CSS/JS
  → validate input and build the web assets with the native bootstrap
  → prepare the platform workspace and copy assets
  → run Gradle / xcodebuild / Windows packaging tools
  → collect APK/AAB, archive/IPA, or MSIX
```

## Build environment responsibilities

Use separate operations for host setup, app initialization, environment checks, building, signing, and publishing. Windows setup now provisions tools independently of app initialization. Read-only doctor commands report local tools, bundle/configuration state, and host-project presence.

Pin SDK and project tool versions when the host projects land. Doctor commands perform no downloads. They report signing as uninspected; actual signing readiness requires the future platform projects and credentials.

Remote iOS builds currently assume the repository is already checked out on the Mac. The scripts require clean matching source revisions, optionally transfer prepared assets with rsync, and retrieve output under build/ios. Real Mac execution, native consumption of those assets, and artifact validation still need platform testing.
