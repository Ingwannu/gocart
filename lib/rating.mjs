export function normalizeRatingPayload(body) {
	const orderId = String(body.orderId || "").trim();
	const productId = String(body.productId || "").trim();
	const rating = Number(body.rating);
	const review = String(body.review || "").trim();

	if (!orderId || !productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
		throw new Error("Invalid rating payload");
	}
	if (review.length < 5) {
		throw new Error("Review is too short");
	}

	return { orderId, productId, rating, review };
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function textContains(query) {
	return { contains: query, mode: "insensitive" };
}

export function createAdminRatingWhere({ q, rating } = {}) {
	const where = {};
	const ratingNumber = Number(rating);
	if (Number.isInteger(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5) {
		where.rating = ratingNumber;
	}

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ review: textContains(query) },
			{ user: { name: textContains(query) } },
			{ user: { email: textContains(query) } },
			{ product: { name: textContains(query) } },
		];
	}

	return where;
}

export function buildAdminRatingPagination({ page, limit } = {}, total = 0) {
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

export function resolveRatingWriteError(error) {
	if (error?.code === "P2025") {
		return { message: "Rating not found", status: 404 };
	}
	return null;
}
