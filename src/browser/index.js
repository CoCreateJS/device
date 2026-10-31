import { createError, validateMethod } from "../bridge/protocol.js";

function createBrowserProvider(navigatorObject = globalThis.navigator) {
	const handlers = new Map();

	function register(method, handler) {
		validateMethod(method);
		if (typeof handler !== "function") throw new TypeError("Browser provider must be a function.");
		const previous = handlers.get(method);
		handlers.set(method, handler);
		return () => {
			if (handlers.get(method) !== handler) return false;
			if (previous) handlers.set(method, previous);
			else handlers.delete(method);
			return true;
		};
	}

	const contacts = navigatorObject?.contacts;
	const select = contacts?.select;
	const properties = contacts?.getProperties;
	const setBadge = navigatorObject?.setAppBadge;
	const clearBadge = navigatorObject?.clearAppBadge;
	if (typeof select === "function") register("device.contacts.select", async ({ properties, options }) => ({
		contacts: await select.call(contacts, properties, options)
	}));
	if (typeof properties === "function") register("device.contacts.getProperties", async () => ({
		properties: await properties.call(contacts)
	}));
	if (typeof setBadge === "function") register("device.badging.set", async ({ count }) => {
		if (count === undefined) await setBadge.call(navigatorObject);
		else await setBadge.call(navigatorObject, count);
		return {};
	});
	if (typeof clearBadge === "function") register("device.badging.clear", async () => {
		await clearBadge.call(navigatorObject);
		return {};
	});

	function isSupported(method) { return handlers.has(method); }

	async function send(envelope) {
		const handler = handlers.get(envelope.method);
		if (!handler) throw createError("NotSupportedError", "Browser capability unavailable: " + envelope.method, "UNSUPPORTED_CAPABILITY");
		// Invoke before the first await so browser user activation is preserved.
		const device = await handler(envelope.device, envelope);
		return { ...envelope, response: true, device };
	}

	return { register, isSupported, send };
}

export { createBrowserProvider };
export default createBrowserProvider;
