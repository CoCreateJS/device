import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeClient } from '../src/bridge/client.js';
import { createEnvelope } from '../src/bridge/protocol.js';
import { createDevice } from '../src/index.js';
import { createBrowserProvider } from '../src/browser/index.js';
import { createNavigatorFacade, getNavigatorInstallation } from '../src/native/navigator.js';
import { installNativeDevice, restoreNavigator } from '../src/native/runtime.js';

const method = 'device.contacts.select';
function host(bridge, capabilities = [method], send) {
 const transport = { protocolVersion: 1, capabilities, send: send || (request => bridge.receive({ ...request, response: true, device: { contacts: [] } })) };
 bridge.setNativeTransport(transport);
 return transport;
}
function setup(navigatorObject = {}, capabilities = []) {
 const bridge = createBridgeClient({ globalObject: {} });
 const device = createDevice({ navigatorObject, bridge });
 host(bridge, capabilities);
 const target = { navigator: navigatorObject };
 const facade = installNativeDevice({ target, device });
 return { bridge, device, target, facade };
}

test('valid responses preserve routing metadata and can arrive synchronously', async () => {
 const b = createBridgeClient({ globalObject: {} }); host(b);
 const result = await b.send({ method, uuid: 'valid', clientId: 'c', frameId: 'f', device: {} });
 assert.equal(result.uuid, 'valid'); assert.equal(result.response, true); b.dispose();
});
test('request echoes, wrong methods/frames, malformed JSON, and late responses are rejected', async () => {
 const b = createBridgeClient({ globalObject: {} }); host(b, [method], () => {});
 const request = { method, uuid: 'reply', frameId: 'frame', device: {} };
 const result = b.send(request);
 for (const envelope of [request, { ...request, response: true, method: 'device.other' }, { ...request, response: true, frameId: 'other' }, { ...request, response: true, device: [] }, 'not JSON']) assert.equal(b.receive(envelope), false);
 assert.equal(b.receive(JSON.stringify({ ...request, response: true })), true);
 await result; assert.equal(b.receive({ ...request, response: true }), false); b.dispose();
});
test('a duplicate uuid cannot overwrite another request', async () => {
 const b = createBridgeClient({ globalObject: {} }); host(b, [method], () => {});
 const first = b.send({ method, uuid: 'duplicate' });
 await assert.rejects(b.send({ method, uuid: 'duplicate' }), { deviceCode: 'DUPLICATE_REQUEST' });
 b.receive({ method, uuid: 'duplicate', response: true, device: { contacts: [] } });
 await first; b.dispose();
});
for (const asyncSend of [false, true]) test('transport rejection cleans up request, async=' + asyncSend, async () => {
 const b = createBridgeClient({ globalObject: {} });
 host(b, [method], () => { if (asyncSend) return Promise.reject(new Error('offline')); throw new Error('offline'); });
 await assert.rejects(b.send({ method, uuid: 'reusable' }), /offline/);
 host(b); await b.send({ method, uuid: 'reusable' }); b.dispose();
});
test('abort and disconnect settle pending requests and notify host', async () => {
 const b = createBridgeClient({ globalObject: {} }); const h = host(b, [method], () => {});
 let cancelled = 0; h.cancel = () => { cancelled++; };
 const controller = new AbortController();
 const promise = b.send({ method, uuid: 'abort' }, { signal: controller.signal, timeout: 0 });
 controller.abort(); await assert.rejects(promise, { name: 'AbortError' });
 const second = b.send({ method, uuid: 'disconnect' }); b.disconnect();
 await assert.rejects(second, { name: 'AbortError' }); assert.equal(cancelled, 2); b.dispose();
});
test('timeout cleans up and replacement transport rejects stale pending calls', async () => {
 const b = createBridgeClient({ globalObject: {} }); host(b, [method], () => {});
 await assert.rejects(b.send({ method, uuid: 'timeout' }, { timeout: 5 }), { name: 'TimeoutError' });
 const pending = b.send({ method, uuid: 'replacement' }); host(b);
 await assert.rejects(pending, { name: 'AbortError' }); b.dispose();
});
test('capabilities require protocol agreement and synchronous affirmative support', async () => {
 const globalObject = { CoCreateDeviceBridge: { protocolVersion: 1, postMessage() {}, capabilities: [method] } };
 const b = createBridgeClient({ globalObject }); assert.equal(b.isSupported(method), true);
 globalObject.CoCreateDeviceBridge.protocolVersion = 2; assert.equal(b.isSupported(method), false);
 assert.throws(() => b.setNativeTransport({ send() {} }), /protocolVersion/);
 b.setNativeTransport({ protocolVersion: 1, send() {}, supports: () => Promise.resolve(true) });
 assert.equal(b.isSupported(method), false); b.dispose();
});
test('browser API is invoked synchronously and retains its receiver', async () => {
 let called = false;
 const contacts = { select() { assert.equal(this, contacts); called = true; return Promise.resolve([]); } };
 const d = createDevice({ navigatorObject: { contacts }, globalObject: {} });
 const promise = d.send({ method, device: { properties: ['name'], options: {} } });
 assert.equal(called, true); assert.deepEqual((await promise).device.contacts, []); d.dispose();
});
test('browser registry cleanup cannot remove a newer registration', async () => {
 const b = createBrowserProvider({}); const first = b.register('device.custom', () => ({ value: 1 }));
 const second = b.register('device.custom', () => ({ value: 2 })); assert.equal(first(), false);
 assert.equal((await b.send({ method: 'device.custom', device: {} })).device.value, 2);
 second(); assert.equal((await b.send({ method: 'device.custom', device: {} })).device.value, 1);
});
test('native operation errors never retry interactive browser APIs', async () => {
 let browserCalls = 0;
 const b = createBridgeClient({ globalObject: {} });
 const d = createDevice({ navigatorObject: { contacts: { select() { browserCalls++; } } }, bridge: b });
 for (const error of [{ name: 'NotAllowedError', message: 'denied' }, { name: 'AbortError', message: 'cancelled' }, { name: 'NotSupportedError', code: 'UNSUPPORTED_CAPABILITY' }]) {
  host(b, [method], request => b.receive({ ...request, response: true, error }));
  await assert.rejects(d.send({ method, device: {} }));
 }
 assert.equal(browserCalls, 0); d.dispose();
});
test('explicit unsupported capability can fallback for noninteractive badging', async () => {
 let count = 0; const b = createBridgeClient({ globalObject: {} });
 const d = createDevice({ navigatorObject: { setAppBadge() { count++; } }, bridge: b });
 host(b, ['device.badging.set'], request => b.receive({ ...request, response: true, error: { code: 'UNSUPPORTED_CAPABILITY' } }));
 await d.send({ method: 'device.badging.set', device: { count: 3 } }); assert.equal(count, 1); d.dispose();
});
test('facade preserves stable functions, receivers, constructor, accessors, and writes', () => {
 class Original { method() { return this; } get field() { return this.value; } }
 const original = new Original(); original.value = 1;
 const facade = createNavigatorFacade(original);
 assert.equal(facade.method, facade.method); assert.equal(facade.method(), original);
 assert.equal(facade.constructor, Original); assert.equal(facade.field, 1);
 facade.value = 2; assert.equal(original.value, 2);
});
test('repeated native installation does not recapture shims; restore and reinstall work', async () => {
 let calls = 0; const original = { setAppBadge() { calls++; } };
 const { target, device, facade } = setup(original);
 assert.equal(installNativeDevice({ target, device }), facade);
 await target.navigator.setAppBadge(1); assert.equal(calls, 1);
 restoreNavigator(target); assert.equal(target.navigator, original); assert.equal(getNavigatorInstallation(target), undefined);
 installNativeDevice({ target, device }); await target.navigator.setAppBadge(2); assert.equal(calls, 2);
 restoreNavigator(target); device.dispose();
});
test('Contacts keeps prototype members and supported fields', async () => {
 class Contacts { getProperties() { assert.equal(this, original.contacts); return Promise.resolve(['name']); } select() { return Promise.resolve([]); } }
 const original = { contacts: new Contacts() }; const { target, device, facade } = setup(original);
 assert.deepEqual(await facade.contacts.getProperties(), ['name']);
 assert.equal(facade.contacts.getProperties, facade.contacts.getProperties);
 restoreNavigator(target); device.dispose();
});
test('capability exposure updates when a host is attached, and remains absent otherwise', async () => {
 const { target, device, facade, bridge } = setup();
 assert.equal(facade.contacts, undefined); assert.equal(facade.setAppBadge, undefined);
 host(bridge, [method]); assert.equal(typeof facade.contacts.select, 'function');
 assert.equal(facade.contacts.getProperties, undefined);
 restoreNavigator(target); device.dispose();
});
test('malformed native Contacts responses are errors, not empty results', async () => {
 const { target, device, facade, bridge } = setup({}, [method, 'device.contacts.getProperties']);
 host(bridge, [method, 'device.contacts.getProperties'], request => bridge.receive({ ...request, response: true, device: {} }));
 await assert.rejects(facade.contacts.select(['name']), { name: 'DataError' });
 await assert.rejects(facade.contacts.getProperties(), { name: 'DataError' });
 restoreNavigator(target); device.dispose();
});
test('native badging validates numeric inputs before invoking the host', async () => {
 const { target, device, facade, bridge } = setup({}, ['device.badging.set']);
 let calls = 0; host(bridge, ['device.badging.set'], request => { calls++; bridge.receive({ ...request, response: true, device: {} }); });
 for (const count of [-1, NaN, Infinity, 2 ** 64, 1n]) await assert.rejects(facade.setAppBadge(count), TypeError);
 assert.equal(calls, 0); await facade.setAppBadge('3.5'); assert.equal(calls, 1);
 restoreNavigator(target); device.dispose();
});
test('locked navigator fails explicitly without registering replacement state', () => {
 const target = {}; Object.defineProperty(target, 'navigator', { configurable: false, get: () => ({}) });
 assert.throws(() => installNativeDevice({ target }), { name: 'NotSupportedError' });
 assert.equal(getNavigatorInstallation(target), undefined);
});
test('nonconfigurable writable navigator data properties can be restored', () => {
 const original = {}; const target = {};
 Object.defineProperty(target, 'navigator', { configurable: false, writable: true, value: original });
 installNativeDevice({ target }); restoreNavigator(target); assert.equal(target.navigator, original);
});
test('invalid payloads are rejected rather than silently normalized', () => {
 for (const request of [{ method: 'device.' }, { method, device: [] }, { method, uuid: 3 }, { method, response: true }]) assert.throws(() => createEnvelope(request), TypeError);
});
test('native Contacts validates fields and prevents overlapping pickers', async () => {
 const { target, device, facade, bridge } = setup({}, [method]);
 let request; host(bridge, [method], value => { request = value; });
 for (const fields of [undefined, [], ['unknown'], 'name']) await assert.rejects(facade.contacts.select(fields), TypeError);
 const selection = facade.contacts.select(['name'], { multiple: 1 });
 assert.equal(request.device.options.multiple, true);
 await assert.rejects(facade.contacts.select(['name']), { name: 'InvalidStateError' });
 bridge.receive({ ...request, response: true, device: { contacts: [] } }); await selection;
 restoreNavigator(target); device.dispose();
});
test('a long-running picker has no automatic timeout and can be disposed', async () => {
 const bridge = createBridgeClient({ globalObject: {} }); bridge.configure({ timeout: 1 });
 host(bridge, [method], () => {});
 const device = createDevice({ bridge, navigatorObject: {} });
 const promise = device.send({ method, device: {} });
 await new Promise(resolve => setTimeout(resolve, 10));
 device.disconnect(); await assert.rejects(promise, { name: 'AbortError' }); device.dispose();
});
test('postMessage transport encodes JSON while native responses can be decoded', async () => {
 const globalObject = {};
 const bridge = createBridgeClient({ globalObject });
 globalObject.CoCreateDeviceBridge = { protocolVersion: 1, capabilities: [method], postMessage(raw) {
  assert.equal(typeof raw, 'string'); bridge.receive(JSON.stringify({ ...JSON.parse(raw), response: true, device: { contacts: [] } }));
 } };
 await bridge.send({ method }); bridge.dispose();
});
test('async support checks cannot cause an unhandled rejection or claim support', async () => {
 const bridge = createBridgeClient({ globalObject: {} });
 bridge.setNativeTransport({ protocolVersion: 1, send() {}, supports: () => Promise.reject(new Error('invalid async support')) });
 assert.equal(bridge.isSupported(method), false); await new Promise(resolve => setImmediate(resolve)); bridge.dispose();
});
test('invalid AbortSignals cannot leave a pending request behind', async () => {
 const b = createBridgeClient({ globalObject: {} }); host(b);
 await assert.rejects(b.send({ method, uuid: 'signal' }, { signal: {} }), TypeError);
 await b.send({ method, uuid: 'signal' }); b.dispose();
});
test('pagehide disposes pending native calls and restore removes its listener', async () => {
 const listeners = new Map(); const target = { navigator: {}, addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); } };
 const bridge = createBridgeClient({ globalObject: {} }); host(bridge, [method], () => {});
 const device = createDevice({ navigatorObject: target.navigator, bridge });
 installNativeDevice({ target, device });
 const call = device.send({ method, device: {} }); listeners.get('pagehide')();
 await assert.rejects(call, { name: 'AbortError' }); restoreNavigator(target); assert.equal(listeners.size, 0); device.dispose();
});
test('native entry imports in Node without modifying its navigator', async () => {
 const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
 const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
 // A getter-only locked navigator is simulated using the explicit runtime API;
 // importing native/index in Node itself must leave the Node navigator untouched.
 const original = globalThis.navigator;
 const entry = await import('../src/native/index.js');
 assert.equal(globalThis.navigator, original); assert.equal(entry.navigatorFacade, undefined);
 assert.equal(Object.getOwnPropertyDescriptor(globalThis, 'navigator').get, descriptor.get);
 assert.equal(Object.getOwnPropertyDescriptor(globalThis, 'window'), oldWindow);
});
test('native Contacts rejects absent user activation when the browser exposes that state', async () => {
 const { device, target, facade } = setup({ userActivation: { isActive: false } }, [method]);
 await assert.rejects(facade.contacts.select(['name']), { name: 'SecurityError' });
 restoreNavigator(target); device.dispose();
});
test('native errors preserve public exception types without replacing DOMException codes', async () => {
 const b = createBridgeClient({ globalObject: {} });
 host(b, [method], request => b.receive({ ...request, response: true, error: { name: 'NotSupportedError', message: 'missing', code: 'UNSUPPORTED_CAPABILITY' } }));
 await assert.rejects(b.send({ method }), error => error instanceof DOMException && typeof error.code === 'number' && error.deviceCode === 'UNSUPPORTED_CAPABILITY');
 host(b, [method], request => b.receive({ ...request, response: true, error: { name: 'TypeError', message: 'invalid' } }));
 await assert.rejects(b.send({ method }), TypeError); b.dispose();
});
