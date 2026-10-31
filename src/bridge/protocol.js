const PROTOCOL_VERSION = 1;
let sequence = 0;

function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateMethod(method) {
	if (typeof method !== "string" || !/^device\.[A-Za-z]\w*(?:\.[A-Za-z]\w*)*$/.test(method))
		throw new TypeError("Device method must be a nonempty device.* operation.");
	return method;
}

function createError(name, message, code) {
	const domNames = ["AbortError", "DataError", "InvalidStateError", "NotAllowedError", "NotSupportedError", "SecurityError", "TimeoutError"];
	let error;
	if (domNames.includes(name) && typeof globalThis.DOMException === "function") error = new DOMException(message, name);
	else if (name === "TypeError") error = new TypeError(message);
	else if (name === "RangeError") error = new RangeError(message);
	else { error = new Error(message); error.name = name; }
	// DOMException.code is a standard readonly numeric field. Keep transport codes separate.
	if (code !== undefined) error.deviceCode = code;
	return error;
}

function createEnvelope(request = {}) {
	if (!isRecord(request)) throw new TypeError("A device request must be an envelope object.");
	validateMethod(request.method);
	if (request.response === true) throw new TypeError("Cannot send a response as a device request.");
	if (request.uuid !== undefined && (typeof request.uuid !== "string" || !request.uuid.trim()))
		throw new TypeError("Device uuid must be a nonempty string.");
	if (request.device !== undefined && !isRecord(request.device))
		throw new TypeError("Device payload must be an object.");
	return {
		...request,
		uuid: request.uuid || globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + "-" + (++sequence)),
		device: request.device ?? {}
	};
}

function decodeEnvelope(value) {
	if (typeof value === "string") {
		try { value = JSON.parse(value); } catch { return null; }
	}
	return isRecord(value) ? value : null;
}

export { PROTOCOL_VERSION, createEnvelope, createError, decodeEnvelope, isRecord, validateMethod };
export default createEnvelope;
