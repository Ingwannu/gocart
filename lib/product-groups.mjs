export function slugifyGroup(value) {
	const slug = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/&/g, " ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!slug) throw new Error("Group name is required");
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

export function normalizeProductGroupPayload(body, existing = null) {
	const name = body.name !== undefined ? String(body.name || "").trim() : existing?.name;
	if (!name) throw new Error("Group name is required");
	return {
		name,
		slug: body.slug ? slugifyGroup(body.slug) : slugifyGroup(name),
		description:
			body.description !== undefined
				? String(body.description || "").trim()
				: existing?.description || "",
		isActive:
			body.isActive !== undefined ? Boolean(body.isActive) : existing?.isActive ?? true,
		sortOrder: normalizeSortOrder(body.sortOrder, existing?.sortOrder || 0),
	};
}

export function resolveProductGroupWriteError(error) {
	if (error?.code === "P2002") {
		return { message: "Product group slug already exists", status: 409 };
	}
	if (error?.code === "P2025") {
		return { message: "Group not found", status: 404 };
	}
	return null;
}

export function createAdminProductGroupWhere({ q, active } = {}) {
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

export function buildAdminProductGroupPagination(
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

function categoryFilter(category) {
	const value = String(category || "").trim();
	return value ? { equals: value, mode: "insensitive" } : null;
}

function featuredFilter(featured) {
	if (featured === "true") return true;
	if (featured === "false") return false;
	return null;
}

export function createProductWhere({ q, group, category, username, featured } = {}) {
	const stockFilter = [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }];
	const where = {
		inStock: true,
		isArchived: false,
		OR: stockFilter,
		store: {
			...(username ? { username } : {}),
			status: "approved",
			isActive: true,
		},
	};
	if (group) {
		where.group = { slug: group, isActive: true };
	}
	const categoryWhere = categoryFilter(category);
	if (categoryWhere) where.category = categoryWhere;
	const featuredWhere = featuredFilter(featured);
	if (featuredWhere !== null) where.isFeatured = featuredWhere;
	const query = String(q || "").trim();
	if (query) {
		where.AND = [
			{ OR: stockFilter },
			{
				OR: [
					{ name: { contains: query, mode: "insensitive" } },
					{ description: { contains: query, mode: "insensitive" } },
					{ category: { contains: query, mode: "insensitive" } },
				],
			},
		];
		delete where.OR;
	}
	return where;
}

export function createAdminProductWhere({
	q,
	group,
	category,
	username,
	stock,
	featured,
} = {}) {
	const where = { isArchived: false };
	if (group) where.group = { slug: group };
	const categoryWhere = categoryFilter(category);
	if (categoryWhere) where.category = categoryWhere;
	if (username) where.store = { username };
	const featuredWhere = featuredFilter(featured);
	if (featuredWhere !== null) where.isFeatured = featuredWhere;
	if (stock === "in") where.inStock = true;
	if (stock === "out") {
		where.OR = [{ inStock: false }, { stockQuantity: 0 }];
	}
	if (stock === "low") {
		where.stockQuantity = { not: null, lte: 5 };
	}

	const query = String(q || "").trim();
	if (query) {
		const searchFilter = {
			OR: [
				{ name: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
				{ category: { contains: query, mode: "insensitive" } },
				{ store: { name: { contains: query, mode: "insensitive" } } },
				{ store: { username: { contains: query, mode: "insensitive" } } },
			],
		};

		if (where.OR) {
			where.AND = [{ OR: where.OR }, searchFilter];
			delete where.OR;
		} else {
			Object.assign(where, searchFilter);
		}
	}

	return where;
}

export function createSellerProductWhere({
	storeId,
	q,
	group,
	category,
	stock,
	featured,
} = {}) {
	const where = { storeId, isArchived: false };
	if (group) where.group = { slug: group };
	const categoryWhere = categoryFilter(category);
	if (categoryWhere) where.category = categoryWhere;
	const featuredWhere = featuredFilter(featured);
	if (featuredWhere !== null) where.isFeatured = featuredWhere;
	if (stock === "in") where.inStock = true;
	if (stock === "out") {
		where.OR = [{ inStock: false }, { stockQuantity: 0 }];
	}
	if (stock === "low") {
		where.stockQuantity = { not: null, lte: 5 };
	}

	const query = String(q || "").trim();
	if (query) {
		const searchFilter = {
			OR: [
				{ name: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
				{ category: { contains: query, mode: "insensitive" } },
			],
		};

		if (where.OR) {
			where.AND = [{ OR: where.OR }, searchFilter];
			delete where.OR;
		} else {
			Object.assign(where, searchFilter);
		}
	}

	return where;
}
