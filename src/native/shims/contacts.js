import { createNavigatorFacade } from "../navigator.js";
import { createError } from "../../bridge/protocol.js";

function createContactsShim({ navigatorObject, device }) {
	const original = navigatorObject?.contacts;
	let selecting = false;
	const fields = new Set(["address", "email", "icon", "name", "tel"]);
	const select = (properties, options = {}) => {
		if (navigatorObject?.userActivation?.isActive === false)
			return Promise.reject(createError("SecurityError", "Contact selection requires user activation."));
		if (selecting) return Promise.reject(createError("InvalidStateError", "Contact picker is already showing."));
		let values;
		try {
			if (!properties || typeof properties !== "object" || typeof properties[Symbol.iterator] !== "function")
				throw new TypeError("Contact properties must be a sequence.");
			values = Array.from(properties, value => String(value));
			if (!values.length || values.some(value => !fields.has(value))) throw new TypeError("Invalid contact properties.");
			if (options !== null && typeof options !== "object") throw new TypeError("Contact picker options must be an object.");
		} catch (error) { return Promise.reject(error); }
		selecting = true;
		return device.send({
			method: "device.contacts.select", device: { properties: values, options: { multiple: Boolean(options?.multiple) } }
		}).then(response => {
			if (!Array.isArray(response.device?.contacts)) throw createError("DataError", "Native contacts response must contain a contacts array.");
			return response.device.contacts;
		}).finally(() => { selecting = false; });
	};
	const getProperties = () => device.send({ method: "device.contacts.getProperties", device: {} }).then(response => {
		if (!Array.isArray(response.device?.properties) || response.device.properties.some(value => typeof value !== "string"))
			throw createError("DataError", "Native contacts properties response must contain a string array.");
		return response.device.properties;
	});
	const overrides = Object.defineProperties({}, {
		select: { enumerable: true, get: () => device.isNativeSupported("device.contacts.select") ? select : undefined },
		getProperties: { enumerable: true, get: () => device.isNativeSupported("device.contacts.getProperties") ? getProperties : undefined }
	});
	const facade = createNavigatorFacade(original || {}, overrides);
	return () => original || device.isNativeSupported("device.contacts.select") || device.isNativeSupported("device.contacts.getProperties") ? facade : undefined;
}

export { createContactsShim };
export default createContactsShim;
