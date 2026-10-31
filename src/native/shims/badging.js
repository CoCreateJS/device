function createBadgingShim({ device }) {
	const set = count => {
		let value;
		try {
			if (count !== undefined) {
				value = Math.trunc(+count);
				if (!Number.isFinite(value) || value < 0 || value >= 2 ** 64)
					throw new TypeError("Badge count is outside the unsigned 64-bit range.");
			}
		} catch (error) { return Promise.reject(error); }
		return device.send({ method: "device.badging.set", device: count === undefined ? {} : { count: value } }).then(() => undefined);
	};
	const clear = () => device.send({ method: "device.badging.clear", device: {} }).then(() => undefined);
	return Object.defineProperties({}, {
		setAppBadge: { enumerable: true, get: () => device.isNativeSupported("device.badging.set") ? set : undefined },
		clearAppBadge: { enumerable: true, get: () => device.isNativeSupported("device.badging.clear") ? clear : undefined }
	});
}

export { createBadgingShim };
export default createBadgingShim;
