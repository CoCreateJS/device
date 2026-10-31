# CoCreate Device

A navigator facade and envelope bridge for CoCreate apps. Existing components retain browser API calls; native builds route advertised capabilities to a WebView host and keep captured browser implementations available.

The shared JavaScript runtime, native bundle selection, asset preparation, and platform scripts are implemented. Android, iOS, and Windows host projects are still pending; this repository cannot produce a native app yet.

- [Architecture](docs/architecture.md)
- [Review and remediation status](docs/review.md)
- [Implementation roadmap](docs/roadmap.md)

## Install and browser API

```sh
yarn add @cocreate/device
```

The normal entry captures the original browser implementations for Contacts and Badging without installing a navigator facade:

```js
import Device from "@cocreate/device";

const response = await Device.send({
  method: "device.contacts.select",
  device: {
    properties: ["name", "email", "tel"],
    options: { multiple: true }
  }
});
```

The envelope preserves caller metadata. `uuid` correlates the response, and the capability payload stays under `device`.

## Native bootstrap and transport

Use `@cocreate/device/native` or the native distribution before other CoCreate modules initialize. It captures the navigator once, forwards unchanged members, and exposes shims only for advertised native methods. When the browser route is chosen, the original method runs immediately with its original receiver.

The host must establish protocol compatibility and supported methods before application feature checks. For an injected transport:

```js
Device.setNativeTransport({
  protocolVersion: 1,
  capabilities: ["device.contacts.select", "device.contacts.getProperties"],
  send(envelope) {
    // Translate to the platform's WebView messaging channel.
    nativeChannel.postMessage(JSON.stringify(envelope));
  }
});
```

The host returns a matching envelope through `Device.receive()`:

```js
Device.receive({
  method: "device.contacts.select",
  uuid: request.uuid,
  response: true,
  device: { contacts: [] }
});
```

Echo `clientId` and `frameId` when supplied. An injected `send` receives an object. A global `CoCreateDeviceBridge` may instead expose `postMessage`: it receives JSON text by default, or an object with `encoding: "object"`. That global also requires `protocolVersion: 1` and advertised `capabilities` or a synchronous `supports(method)` returning `true`.

`isSupported(method)` and `isNativeSupported(method)` report available routes. Hosts must validate origin and method access on their side. `initializationError` on the native distribution reports a runtime that prevents replacing navigator; ordinary browser APIs remain available in that case.

## Request lifecycle

`send(envelope, { signal, timeout })` supports native cancellation and per-request timeouts. The host can implement `cancel(envelope)` to receive abort, timeout, and disconnect notifications. Otherwise cancellation only releases the local request. `disconnect()` rejects pending native calls; `dispose()` also prevents further native requests until a transport is explicitly attached again.

The default timeout is 30 seconds; contact selection disables automatic timeout because a user may leave the picker open. Configure method overrides with `configure({ timeouts: { "device.contacts.select": 120000 } })`.

Native cancellation, permission denial, and ordinary operation errors are returned without retry. Standard exception names map to DOMException or JavaScript error types; the transport code is available as `deviceCode` without overwriting DOMException.code. For noninteractive calls, an explicit `error.code: "UNSUPPORTED_CAPABILITY"` can take a browser fallback. Contacts selects its route up front and never retries after a native reply, preserving consent and browser user-activation behavior.

Use the named `createDevice({ navigatorObject, globalObject })` export for an isolated runtime. Browser handlers can be extended with `registerBrowserProvider(method, handler)`; its returned disposer removes only the registration it owns.

## JavaScript and app assets

```sh
yarn build                 # browser distribution
npm run build:native       # native entry → dist/native/
npm test                   # regression tests; no SDK installation
```

Local bundles do not upload files. Upload integration requires explicit `--env upload=true`.

Copy `device.config.example.json` to `device.config.json` and point `webDir` at your app's built HTML/CSS/JS:

```sh
npm run device:prepare
```

This builds the native JavaScript bundle, copies the app into `build/<appId>/web`, inserts the bootstrap before app scripts, and writes `device-app.json` with the app identity, source revision when available, and an asset digest. Shared host sources remain under `src/native/`. The future host projects must consume this prepared directory; that platform integration remains pending. The app's content security policy must permit its local bootstrap script.

`COCREATE_DEVICE_CONFIG` selects a different configuration file. `device:prepare:assets` stages assets using an existing native bundle.

## Platform environment commands

| Platform | Check environment | Setup | Build |
| --- | --- | --- | --- |
| Android | `device:android:doctor` | `device:android:setup` | `device:android:build:debug`, `device:android:build` |
| iOS | `device:ios:doctor` | `device:ios:setup` | `device:ios:build:simulator`, `device:ios:build`, `device:ios:export` |
| Windows | `device:windows:doctor` | `device:windows:setup` | `device:windows:build:debug`, `device:windows:build` |

Invoke these as `npm run <command>` or `yarn <command>`. Doctor commands are read-only. Build commands require their platform projects, which are not yet included.

Android setup targets Debian/Ubuntu x86_64, installs JDK 17 and checksum-verified command-line tools, and presents SDK licenses interactively. Set `ANDROID_SDK_ROOT` for a custom SDK directory or `ANDROID_COMPILE_SDK` to preinstall a platform. Gradle project versions and release signing belong to the future Android host. The shell build runner supports Linux and macOS.

iOS setup checks full Xcode on a Mac. From Linux, set `COCREATE_IOS_SSH_HOST` and `COCREATE_IOS_REMOTE_DIR` to dispatch to a Mac. Remote builds require clean checkouts at the same committed revision and `rsync` on both hosts. They can transfer prepared assets from `COCREATE_DEVICE_ASSETS` and collect output under local `build/ios`. Custom remote archive/export paths must stay under the remote checkout's `build/ios/`. `COCREATE_IOS_EXPORT_OPTIONS` points to an ExportOptions.plist on the Mac. Use `COCREATE_IOS_PROJECT` for local selection when multiple projects exist. Remote execution uses automatic unambiguous project discovery.

Windows setup installs .NET 10 and validates winapp CLI 0.6 or newer. It prepares tools without initializing files in shared sources. The future project will pin and restore its SDK references. The CLI remains a preview dependency; final Windows distribution packaging requires platform validation. `device:windows:build:debug` uses Debug, and the package command creates unsigned MSIX output. `COCREATE_WINDOWS_PROJECT` selects a specific app project.

Signing credentials stay on the build host. Native builds, signing, WebView compatibility, and platform Store submission have not been validated. See [scripts/README.md](scripts/README.md) and [src/README.md](src/README.md).
