export function isPublicProduct(product) {
	if (!product?.id) return false;
	if (product.isArchived || product.inStock === false) return false;
	if (product.stockQuantity !== undefined && product.stockQuantity !== null) {
		if (Number(product.stockQuantity) <= 0) return false;
	}
	if (!product.store) return true;
	return product.store.status === "approved" && product.store.isActive !== false;
}

export function createPublicProductDetailWhere(productId) {
	return {
		id: productId,
		inStock: true,
		isArchived: false,
		OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }],
		store: { status: "approved", isActive: true },
	};
}

export function upsertPublicProduct(products, product) {
	if (!product?.id) return products;
	if (!isPublicProduct(product)) {
		return products.filter((item) => item.id !== product.id);
	}
	return [product, ...products.filter((item) => item.id !== product.id)];
}

export function buildShopHref({ search, group, category, page } = {}) {
	const params = new URLSearchParams();
	const query = String(search || "").trim();
	const groupSlug = String(group || "").trim();
	const categoryName = String(category || "").trim();
	const pageNumber = Number(page);

	if (query) params.set("search", query);
	if (groupSlug) params.set("group", groupSlug);
	if (categoryName) params.set("category", categoryName);
	if (Number.isSafeInteger(pageNumber) && pageNumber > 1) {
		params.set("page", String(pageNumber));
	}

	const queryString = params.toString();
	return queryString ? `/shop?${queryString}` : "/shop";
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function buildProductListPagination(
	{ page, limit } = {},
	total = 0,
	{ defaultLimit = 24, maxLimit = 100 } = {},
) {
	const normalizedTotal = Math.max(0, normalizePositiveInteger(total, 0));
	const normalizedLimit = Math.min(
		normalizePositiveInteger(limit, defaultLimit),
		maxLimit,
	);
	const totalPages = Math.max(1, Math.ceil(normalizedTotal / normalizedLimit));
	const normalizedPage = Math.min(
		normalizePositiveInteger(page, 1),
		totalPages,
	);

	return {
		page: normalizedPage,
		limit: normalizedLimit,
		skip: (normalizedPage - 1) * normalizedLimit,
		take: normalizedLimit,
		total: normalizedTotal,
		totalPages,
		hasNextPage: normalizedPage < totalPages,
		hasPreviousPage: normalizedPage > 1,
	};
}
