function normalizeEmail(email) {
	const normalized = String(email || "").trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
		throw new Error("Invalid email");
	}
	return normalized;
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function normalizeNewsletterPayload(body = {}) {
	return {
		email: normalizeEmail(body.email),
	};
}

export function createNewsletterWhere({ q, status } = {}) {
	const where = {};
	const normalizedStatus = String(status || "").trim().toLowerCase();
	if (normalizedStatus === "active") where.isActive = true;
	if (normalizedStatus === "inactive") where.isActive = false;

	const query = String(q || "").trim();
	if (query) {
		where.email = { contains: query, mode: "insensitive" };
	}

	return where;
}

export function buildNewsletterPagination({ page, limit } = {}, total = 0) {
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

export function resolveNewsletterWriteError(error) {
	if (error?.code === "P2002") {
		return { message: "Email is already subscribed", status: 409 };
	}
	return null;
}
