function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function createPublicStoreWhere({ q } = {}) {
	const where = {
		status: "approved",
		isActive: true,
	};
	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ name: { contains: query, mode: "insensitive" } },
			{ username: { contains: query, mode: "insensitive" } },
			{ description: { contains: query, mode: "insensitive" } },
		];
	}
	return where;
}

export function buildPublicStoreHref({ search, page } = {}) {
	const params = new URLSearchParams();
	const query = String(search || "").trim();
	const pageNumber = Number(page);
	if (query) params.set("search", query);
	if (Number.isSafeInteger(pageNumber) && pageNumber > 1) {
		params.set("page", String(pageNumber));
	}
	const queryString = params.toString();
	return queryString ? `/stores?${queryString}` : "/stores";
}

export function buildPublicStorePagination({ page, limit } = {}, total = 0) {
	const normalizedTotal = Math.max(0, normalizePositiveInteger(total, 0));
	const normalizedLimit = Math.min(normalizePositiveInteger(limit, 12), 36);
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
