import { PROTOCOL_VERSION, createEnvelope, createError, decodeEnvelope } from "./protocol.js";

function createBridgeClient({ globalObject = globalThis } = {}) {
	const pending = new Map();
	let injected;
	let defaultTimeout = 30000;
	let closed = false;

	function transport() {
		return injected || globalObject.CoCreateDeviceBridge;
	}

	function compatible(value) {
		return value && value.protocolVersion === PROTOCOL_VERSION &&
			(typeof value.send === "function" || typeof value.postMessage === "function");
	}

	function isSupported(method) {
		const value = transport();
		if (closed || !compatible(value)) return false;
		if (Array.isArray(value.capabilities)) return value.capabilities.includes(method);
		// Support checks must be synchronous: a Promise is not evidence of support.
		if (typeof value.supports !== "function") return false;
		try {
			const supported = value.supports(method);
			if (supported && typeof supported.then === "function") Promise.resolve(supported).catch(() => {});
			return supported === true;
		} catch { return false; }
	}

	function settle(entry, error, envelope) {
		if (pending.get(entry.envelope.uuid) !== entry) return;
		pending.delete(entry.envelope.uuid);
		clearTimeout(entry.timer);
		entry.signal?.removeEventListener("abort", entry.abort);
		if (error) entry.reject(error);
		else entry.resolve(envelope);
	}

	function cancelHost(entry) {
		if (typeof entry.transport.cancel !== "function") return;
		try { Promise.resolve(entry.transport.cancel(entry.envelope)).catch(() => {}); } catch {}
	}

	function disconnect(reason = createError("AbortError", "Device host disconnected.")) {
		for (const entry of [...pending.values()]) {
			settle(entry, reason);
			cancelHost(entry);
		}
	}

	function setNativeTransport(value) {
		if (value != null && !compatible(value))
			throw new TypeError("Transport requires protocolVersion: 1 and send(envelope) or postMessage(envelope).");
		if (value !== injected) disconnect();
		injected = value || undefined;
		closed = false;
	}

	function send(request, options = {}) {
		let envelope;
		try { envelope = createEnvelope(request); } catch (error) { return Promise.reject(error); }
		const value = transport();
		if (!isSupported(envelope.method))
			return Promise.reject(createError("NotSupportedError", "Native capability unavailable: " + envelope.method, "UNSUPPORTED_CAPABILITY"));
		if (pending.has(envelope.uuid))
			return Promise.reject(createError("InvalidStateError", "Device uuid is already in flight: " + envelope.uuid, "DUPLICATE_REQUEST"));
		if (options.signal !== undefined && (!options.signal || typeof options.signal.addEventListener !== "function" || typeof options.signal.removeEventListener !== "function"))
			return Promise.reject(new TypeError("signal must be an AbortSignal."));
		if (options.signal?.aborted)
			return Promise.reject(createError("AbortError", "Device request aborted."));
		const timeout = options.timeout ?? defaultTimeout;
		if (!Number.isFinite(timeout) || timeout < 0)
			return Promise.reject(new TypeError("Request timeout must be a nonnegative number; 0 disables it."));

		return new Promise((resolve, reject) => {
			const entry = { envelope, transport: value, resolve, reject, signal: options.signal };
			entry.abort = () => {
				settle(entry, createError("AbortError", "Device request aborted."));
				cancelHost(entry);
			};
			pending.set(envelope.uuid, entry);
			entry.signal?.addEventListener("abort", entry.abort, { once: true });
			if (timeout > 0) entry.timer = setTimeout(() => {
				settle(entry, createError("TimeoutError", "Device request timed out: " + envelope.method));
				cancelHost(entry);
			}, timeout);
			try {
				const result = typeof value.send === "function" ? value.send(envelope) : value.postMessage(value.encoding === "object" ? envelope : JSON.stringify(envelope));
				Promise.resolve(result).catch(error => settle(entry, error));
			} catch (error) { settle(entry, error); }
		});
	}

	function receive(raw) {
		const envelope = decodeEnvelope(raw);
		if (!envelope || envelope.response !== true || typeof envelope.uuid !== "string") return false;
		const entry = pending.get(envelope.uuid);
		if (!entry || entry.transport !== transport() || envelope.method !== entry.envelope.method) return false;
		for (const field of ["clientId", "frameId"]) {
			if (entry.envelope[field] !== undefined && envelope[field] !== entry.envelope[field]) return false;
		}
		if (envelope.error) {
			const detail = envelope.error;
			const error = createError(typeof detail.name === "string" ? detail.name : "Error",
				typeof detail === "string" ? detail : (detail.message || "Native device request failed."), detail.code);
			error.envelope = envelope;
			settle(entry, error);
		} else {
			if (envelope.device === null || typeof envelope.device !== "object" || Array.isArray(envelope.device)) return false;
			settle(entry, null, envelope);
		}
		return true;
	}

	function configure(options = {}) {
		if (options.timeout !== undefined) {
			if (!Number.isFinite(options.timeout) || options.timeout < 0) throw new TypeError("Invalid device timeout.");
			defaultTimeout = options.timeout;
		}
	}

	function dispose() {
		closed = true;
		disconnect();
	}

	return { configure, disconnect, dispose, isSupported, receive, send, setNativeTransport };
}

const Bridge = createBridgeClient();
export { createBridgeClient };
export const { configure, disconnect, dispose, isSupported, receive, send, setNativeTransport } = Bridge;
export default Bridge;
