import { createBrowserProvider } from "./browser/index.js";
import { createBridgeClient } from "./bridge/client.js";
import { createEnvelope, createError, isRecord, PROTOCOL_VERSION } from "./bridge/protocol.js";

/**
 *
 * @public
 * @environment client
 */
function createDevice({ navigatorObject = globalThis.navigator, globalObject = globalThis, bridge = createBridgeClient({ globalObject }) } = {}) {
	const browser = createBrowserProvider(navigatorObject);
	let providerOrder = ["native", "browser"];
	let context = {};
	const timeouts = new Map([["device.contacts.select", 0]]);

	/**
	 *
 * @public
 * @environment client
 */
	function configure(options = {}) {
		if (options.providers !== undefined) {
			if (!Array.isArray(options.providers) || !options.providers.length || options.providers.some(x => !["native", "browser"].includes(x)))
				throw new TypeError("Providers must be a nonempty array of native/browser names.");
			providerOrder = [...new Set(options.providers)];
		}
		if (options.context !== undefined) {
			for (const [key, value] of Object.entries(options.context)) {
				if (!["clientId", "frameId"].includes(key) || typeof value !== "string") throw new TypeError("Context supports string clientId/frameId only.");
			}
			context = { ...options.context };
		}
		if (options.timeouts) for (const [method, value] of Object.entries(options.timeouts)) {
			if (!Number.isFinite(value) || value < 0) throw new TypeError("Invalid method timeout.");
			timeouts.set(method, value);
		}
		bridge.configure(options);
	}

	/**
	 *
 * @public
 * @environment client
 */
	function isNativeSupported(method) {
		return providerOrder.includes("native") && bridge.isSupported(method);
	}

	/**
	 *
 * @public
 * @environment client
 */
	function isSupported(method) {
		return isNativeSupported(method) || (providerOrder.includes("browser") && browser.isSupported(method));
	}

	/**
	 *
 * @public
 * @environment client
 */
	function send(request, options = {}) {
		let envelope;
		try {
			if (!isRecord(request)) throw new TypeError("A device request must be an envelope object.");
			envelope = createEnvelope({ ...context, ...request });
		} catch (error) { return Promise.reject(error); }
		if (options.signal?.aborted) return Promise.reject(createError("AbortError", "Device request aborted."));
		for (const provider of providerOrder) {
			if (provider === "browser" && browser.isSupported(envelope.method)) return browser.send(envelope);
			if (provider === "native" && bridge.isSupported(envelope.method)) {
				return bridge.send(envelope, { ...options, timeout: options.timeout ?? timeouts.get(envelope.method) }).catch(error => {
					// Interactive APIs choose a route up front; a delayed browser retry can lose user activation.
					const mayFallback = envelope.method !== "device.contacts.select" && options.fallback !== false;
					if (mayFallback && error.deviceCode === "UNSUPPORTED_CAPABILITY" && providerOrder.includes("browser") && browser.isSupported(envelope.method))
						return browser.send(envelope);
					throw error;
				});
			}
		}
		return Promise.reject(createError("NotSupportedError", "No provider is available for " + envelope.method, "UNSUPPORTED_CAPABILITY"));
	}

	return {
		/**
		 *
 * @public
 * @environment client
 */
		configure, createEnvelope, isNativeSupported, isSupported, send,
		/**
		 *
 * @public
 * @environment client
 */
		registerBrowserProvider: browser.register,
		/**
		 *
 * @public
 * @environment client
 */
		setNativeTransport: bridge.setNativeTransport,
		/**
		 *
 * @public
 * @environment client
 */
		/**
		 *
 * @public
 * @environment client
 */
		/**
		 *
 * @public
 * @environment client
 */
		receive: bridge.receive, disconnect: bridge.disconnect, dispose: bridge.dispose,
		protocolVersion: PROTOCOL_VERSION
	};
}

const Device = createDevice();
export { createDevice, createEnvelope };
export const { configure, disconnect, dispose, isNativeSupported, isSupported, receive, registerBrowserProvider, send, setNativeTransport } = Device;
export default Device;

/**
 *
 * @name default
 * @kind member
 * @public
 * @environment client
 */

/**
 * A shared device capability API and envelope bridge for CoCreate apps.
 *
 * @module device
 * @environment client
 */
