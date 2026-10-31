import Device, { createDevice } from "../index.js";
import { getNavigatorInstallation, installNavigatorFacade, restoreNavigator } from "./navigator.js";
import { createNavigatorOverrides } from "./shims/index.js";

function installNativeDevice(options = {}) {
	const target = options.target || globalThis;
	const existing = getNavigatorInstallation(target);
	if (existing) return existing.facade;
	const original = options.original || target.navigator;
	const device = options.device || (target === globalThis ? Device : createDevice({ navigatorObject: original, globalObject: target }));
	const overrides = createNavigatorOverrides(original, device);
	const unload = () => device.disconnect();
	const facade = installNavigatorFacade({ target, original, overrides, cleanup: () => {
		target.removeEventListener?.("pagehide", unload);
		device.disconnect();
	} });
	target.addEventListener?.("pagehide", unload);
	return facade;
}

export { installNativeDevice, restoreNavigator };
