# Source layout

```text
src/
  browser/      Captured browser implementations and custom handler registry
  bridge/       Envelope validation, native transport, and request lifecycle
  native/       Navigator facade, shims, bootstrap, and platform host source
  index.js      Public Device API and isolated runtime factory
  package.json  ES module scope; repository build configs remain CommonJS
```

`browser/index.js` captures Contacts and Badging methods against the original navigator. The normal Device entry can call them without installing a facade.

`bridge/protocol.js` validates request envelopes. `bridge/client.js` creates isolated clients, requires protocol/capability agreement, validates response identity, and manages failure, timeout, abort, and disconnect cleanup.

`native/runtime.js` installs the navigator once and attaches page lifecycle cleanup. `native/navigator.js` preserves member receivers and identities. `native/shims/` contains per-method Badging and Contacts overrides, including supported-property discovery.

`native/index.js` is the explicit native Webpack entry. Browser runtimes attempt installation and expose `initializationError` if their navigator cannot be replaced. Importing the source in Node does not install a facade.

Android, iOS, and Windows project source belongs in the matching `native` folders. Those projects remain pending. Platform automation is under repository-level `scripts/`.

See [the public API and host contract](../README.md), [architecture](../docs/architecture.md), and [remediation status](../docs/review.md).
