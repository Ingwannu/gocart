const PRIVATE_ACCOUNT_FIELDS = new Set(["password", "cart"]);

function serialize(value) {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(serialize);
	if (!value || typeof value !== "object") return value;

	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => !PRIVATE_ACCOUNT_FIELDS.has(key))
			.map(([key, entry]) => [key, serialize(entry)]),
	);
}

function collectionSummary(collections) {
	return Object.fromEntries(
		Object.entries(collections).map(([key, value]) => [
			key,
			Array.isArray(value) ? value.length : 0,
		]),
	);
}

export function buildAccountExport({
	user,
	addresses = [],
	orders = [],
	ratings = [],
	returnRequests = [],
	supportTickets = [],
	newsletterSubscriptions = [],
	wishlistItems = [],
	productQuestions = [],
}) {
	const account = {
		id: user.id,
		name: user.name,
		email: user.email,
		image: user.image || "",
		role: user.role,
		isSuspended: Boolean(user.isSuspended),
		createdAt: user.createdAt ? serialize(user.createdAt) : null,
	};
	const collections = {
		addresses: serialize(addresses),
		orders: serialize(orders),
		ratings: serialize(ratings),
		returnRequests: serialize(returnRequests),
		supportTickets: serialize(supportTickets),
		newsletterSubscriptions: serialize(newsletterSubscriptions),
		wishlistItems: serialize(wishlistItems),
		productQuestions: serialize(productQuestions),
	};

	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		account,
		summary: collectionSummary(collections),
		...collections,
	};
}
