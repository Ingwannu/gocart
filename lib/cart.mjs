export const MAX_CART_QUANTITY = 99;

export function normalizeCartItems(input) {
	const source =
		input && typeof input === "object" && !Array.isArray(input) ? input : {};
	const cartItems = {};

	for (const [productId, rawQuantity] of Object.entries(source)) {
		const quantity = Number(rawQuantity);
		if (
			typeof productId !== "string" ||
			!productId.trim() ||
			!Number.isSafeInteger(quantity) ||
			quantity <= 0
		) {
			continue;
		}

		cartItems[productId] = Math.min(quantity, MAX_CART_QUANTITY);
	}

	return cartItems;
}

export function totalCartItems(cartItems) {
	return Object.values(normalizeCartItems(cartItems)).reduce(
		(total, quantity) => total + quantity,
		0,
	);
}

export function parseStoredCart(value) {
	if (!value) return {};
	if (typeof value !== "string") return normalizeCartItems(value);

	try {
		return normalizeCartItems(JSON.parse(value));
	} catch {
		return {};
	}
}
