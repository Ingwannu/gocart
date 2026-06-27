function textContains(query) {
	return { contains: query, mode: "insensitive" };
}

export function normalizeWishlistProductId(value) {
	const productId = String(value || "").trim();
	if (!productId) throw new Error("Product is required");
	return productId;
}

export function createWishlistProductWhere({ q } = {}) {
	const where = {
		isArchived: false,
		inStock: true,
		store: { status: "approved", isActive: true },
	};
	const query = String(q || "").trim();
	if (!query) return where;

	where.OR = [
		{ name: textContains(query) },
		{ description: textContains(query) },
		{ category: textContains(query) },
		{ store: { name: textContains(query) } },
		{ store: { username: textContains(query) } },
	];
	return where;
}

export function resolveWishlistWriteError(error) {
	if (error?.code === "P2002") return { duplicate: true };
	return null;
}
