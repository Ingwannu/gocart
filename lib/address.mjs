const requiredAddressFields = [
	"name",
	"email",
	"street",
	"city",
	"state",
	"zip",
	"country",
	"phone",
];

function normalizeField(body, field) {
	return String(body[field] || "").trim();
}

export function normalizeAddressPayload(body) {
	const data = {};
	for (const field of requiredAddressFields) {
		data[field] = normalizeField(body, field);
	}
	data.email = data.email.toLowerCase();

	if (requiredAddressFields.some((field) => !data[field])) {
		throw new Error("Missing required address fields");
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
		throw new Error("Invalid email");
	}

	return data;
}

export function resolveAddressMutationBlock({ orderCount = 0 } = {}) {
	if (orderCount > 0) {
		return {
			message: "Address is already used by an order",
			status: 409,
		};
	}

	return null;
}
