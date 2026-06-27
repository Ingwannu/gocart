export function slugifyCategory(value) {
	const slug = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/&/g, " ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!slug) throw new Error("Category name is required");
	return slug;
}

function normalizeSortOrder(value, fallback = 0) {
	if (value === undefined) return fallback;
	const sortOrder = Number(value);
	if (!Number.isSafeInteger(sortOrder)) {
		throw new Error("Invalid sort order");
	}
	return sortOrder;
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function normalizeProductCategoryPayload(body = {}, existing = null) {
	const name =
		body.name !== undefined ? String(body.name || "").trim() : existing?.name;
	if (!name) throw new Error("Category name is required");
	return {
		name,
		slug: body.slug ? slugifyCategory(body.slug) : slugifyCategory(name),
		description:
			body.description !== undefined
				? String(body.description || "").trim()
				: existing?.description || "",
		isActive:
			body.isActive !== undefined ? Boolean(body.isActive) : existing?.isActive ?? true,
		sortOrder: normalizeSortOrder(body.sortOrder, existing?.sortOrder || 0),
	};
}

export function resolveProductCategoryWriteError(error) {
	if (error?.code === "P2002") {
		return { message: "Product category slug already exists", status: 409 };
	}
	if (error?.code === "P2025") {
		return { message: "Category not found", status: 404 };
	}
	return null;
}

export function createAdminProductCategoryWhere({ q, active } = {}) {
	const where = {};
	if (active === "true") where.isActive = true;
	if (active === "false") where.isActive = false;

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ name: { contains: query, mode: "insensitive" } },
			{ slug: { contains: query, mode: "insensitive" } },
			{ description: { contains: query, mode: "insensitive" } },
		];
	}

	return where;
}

export function buildAdminProductCategoryPagination(
	{ page, limit } = {},
	total = 0,
) {
	const normalizedTotal = Math.max(0, normalizePositiveInteger(total, 0));
	const normalizedLimit = Math.min(normalizePositiveInteger(limit, 25), 50);
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
