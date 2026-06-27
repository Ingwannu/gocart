export const returnRequestStatuses = new Set([
	"REQUESTED",
	"APPROVED",
	"REJECTED",
	"REFUNDED",
]);

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function normalizeAmount(value) {
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount < 0) {
		throw new Error("Invalid refund amount");
	}
	return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function textContains(query) {
	return { contains: query, mode: "insensitive" };
}

export function normalizeReturnRequestPayload(body = {}) {
	const reason = String(body.reason || "").trim();
	if (reason.length < 10) throw new Error("Return reason is too short");

	const orderId = String(body.orderId || "").trim();
	if (!orderId) throw new Error("Order is required");

	return { orderId, reason };
}

export function normalizeAdminReturnRequestPatchPayload(body = {}) {
	const data = {};
	if (body.status !== undefined) {
		if (!returnRequestStatuses.has(body.status)) {
			throw new Error("Invalid return status");
		}
		data.status = body.status;
	}
	if (body.resolutionNote !== undefined) {
		data.resolutionNote = String(body.resolutionNote || "").trim();
	}
	if (body.refundAmount !== undefined) {
		data.refundAmount = normalizeAmount(body.refundAmount);
	}
	return data;
}

export function resolveReturnRequestBlock({ order, userId } = {}) {
	if (!order || order.userId !== userId) {
		return { message: "Order not found", status: 404 };
	}
	if (order.status !== "DELIVERED") {
		return { message: "Only delivered orders can be returned", status: 403 };
	}
	return null;
}

export function createReturnRequestWhere({
	scope = "buyer",
	userId,
	q,
	status,
} = {}) {
	const where = {};
	if (scope !== "admin" && userId) {
		where.userId = userId;
	}
	if (returnRequestStatuses.has(status)) {
		where.status = status;
	}

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ id: textContains(query) },
			{ orderId: textContains(query) },
			{ reason: textContains(query) },
			{ resolutionNote: textContains(query) },
			{ user: { name: textContains(query) } },
			{ user: { email: textContains(query) } },
			{ order: { store: { name: textContains(query) } } },
		];
	}

	return where;
}

export function buildReturnRequestPagination({ page, limit } = {}, total = 0) {
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

export function resolveReturnRequestWriteError(error) {
	if (error?.code === "P2002") {
		return {
			message: "Return request already exists for this order",
			status: 409,
		};
	}
	if (error?.code === "P2025") {
		return { message: "Return request not found", status: 404 };
	}
	return null;
}
