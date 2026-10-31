import { createError } from "../bridge/protocol.js";

const installed = new WeakMap();

function createNavigatorFacade(original, overrides = {}) {
	if (!original || (typeof original !== "object" && typeof original !== "function"))
		throw new TypeError("The original navigator must be an object.");
	const target = Object.create(Object.getPrototypeOf(original));
	const bound = new Map();
	function read(property) {
		if (Object.prototype.hasOwnProperty.call(overrides, property)) {
			const replacement = Reflect.get(overrides, property, overrides);
			if (replacement !== undefined) return replacement;
		}
		const value = Reflect.get(original, property, original);
		if (typeof value !== "function" || property === "constructor") return value;
		const cached = bound.get(property);
		if (cached?.value === value) return cached.bound;
		const result = value.bind(original);
		bound.set(property, { value, bound: result });
		return result;
	}
	return new Proxy(target, {
		get(_target, property) { return read(property); },
		set(_target, property, value) {
			if (Reflect.getOwnPropertyDescriptor(overrides, property)) return false;
			return Reflect.set(original, property, value, original);
		},
		has(_target, property) { return property in original || (Reflect.has(overrides, property) && read(property) !== undefined); },
		ownKeys() {
			return [...new Set([...Reflect.ownKeys(original), ...Reflect.ownKeys(overrides).filter(key => read(key) !== undefined)])];
		},
		getOwnPropertyDescriptor(_target, property) {
			const replacement = Reflect.getOwnPropertyDescriptor(overrides, property);
			if (replacement && read(property) !== undefined)
				return { configurable: true, enumerable: replacement.enumerable, get: () => read(property) };
			const descriptor = Reflect.getOwnPropertyDescriptor(original, property);
			if (!descriptor) return undefined;
			if ("value" in descriptor) return { ...descriptor, configurable: true, value: read(property) };
			return { configurable: true, enumerable: descriptor.enumerable, get: () => read(property),
				set: descriptor.set ? value => Reflect.set(original, property, value, original) : undefined };
		},
		deleteProperty(_target, property) {
			if (Reflect.has(overrides, property)) return false;
			return Reflect.deleteProperty(original, property);
		},
		// Reflection must not freeze a surrogate whose keys come from the backing object.
		preventExtensions() { return false; },
		defineProperty() { return false; }
	});
}

function getNavigatorInstallation(target = globalThis) { return installed.get(target); }

function installNavigatorFacade({ target = globalThis, original = target.navigator, overrides = {}, cleanup } = {}) {
	if (installed.has(target)) return installed.get(target).facade;
	const descriptor = Object.getOwnPropertyDescriptor(target, "navigator");
	if (descriptor && !descriptor.configurable && !("value" in descriptor && descriptor.writable))
		throw createError("NotSupportedError", "This runtime does not allow a navigator facade.");
	const facade = createNavigatorFacade(original, overrides);
	if (descriptor && !descriptor.configurable) Object.defineProperty(target, "navigator", { value: facade });
	else Object.defineProperty(target, "navigator", {
		configurable: true, enumerable: descriptor?.enumerable ?? true, get: () => facade
	});
	installed.set(target, { descriptor, facade, original, cleanup });
	return facade;
}

function restoreNavigator(target = globalThis) {
	const state = installed.get(target);
	if (!state) return false;
	if (state.descriptor) Object.defineProperty(target, "navigator", state.descriptor);
	else delete target.navigator;
	installed.delete(target);
	state.cleanup?.();
	return true;
}

export { createNavigatorFacade, getNavigatorInstallation, installNavigatorFacade, restoreNavigator };
export default { createNavigatorFacade, getNavigatorInstallation, installNavigatorFacade, restoreNavigator };
