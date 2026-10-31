import Device from "../index.js";
import { installNativeDevice, restoreNavigator } from "./runtime.js";

let navigatorFacade;
let initializationError;
// Source imports in Node must not mutate Node's navigator.
if (typeof window !== "undefined" && globalThis.navigator) {
	try { navigatorFacade = installNativeDevice(); }
	catch (error) { initializationError = error; }
}

const NativeDevice = Object.assign({}, Device, {
	installNativeDevice, restoreNavigator,
	get navigatorFacade() { return navigatorFacade; },
	get initializationError() { return initializationError; }
});
// Keep diagnostic access live rather than copying getter values with Object.assign.
Object.defineProperties(NativeDevice, {
	navigatorFacade: { enumerable: true, get: () => navigatorFacade },
	initializationError: { enumerable: true, get: () => initializationError }
});
export { Device, installNativeDevice, initializationError, navigatorFacade, restoreNavigator };
export default NativeDevice;
