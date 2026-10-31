import { createBadgingShim } from "./badging.js";
import { createContactsShim } from "./contacts.js";

function createNavigatorOverrides(navigatorObject, device) {
	const overrides = createBadgingShim({ navigatorObject, device });
	Object.defineProperty(overrides, "contacts", {
		enumerable: true, get: createContactsShim({ navigatorObject, device })
	});
	return overrides;
}

export { createNavigatorOverrides };
export default createNavigatorOverrides;
