import { canManageStoreOrders } from "./store-access.mjs";

export const orderStatuses = new Set([
	"ORDER_PLACED",
	"PROCESSING",
	"SHIPPED",
	"DELIVERED",
	"CANCELLED",
]);

export const payoutStatuses = new Set(["PENDING", "READY", "PAID", "HOLD"]);

function textContains(query) {
	return { contains: query, mode: "insensitive" };
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function createOrderWhere({
	scope = "buyer",
	userId,
	storeId,
	q,
	status,
	payoutStatus,
	paid,
} = {}) {
	const where = {};

	if (scope === "store" && storeId) {
		where.storeId = storeId;
	} else if (scope !== "admin" && userId) {
		where.userId = userId;
	}

	if (orderStatuses.has(status)) {
		where.status = status;
	}

	if (scope === "admin" && payoutStatuses.has(payoutStatus)) {
		where.payoutStatus = payoutStatus;
	}

	if (paid === "true") where.isPaid = true;
	if (paid === "false") where.isPaid = false;

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ id: textContains(query) },
			{ user: { name: textContains(query) } },
			{ user: { email: textContains(query) } },
			{ store: { name: textContains(query) } },
			{ store: { username: textContains(query) } },
			{ trackingCarrier: textContains(query) },
			{ trackingNumber: textContains(query) },
			{
				orderItems: {
					some: {
						product: { name: textContains(query) },
					},
				},
			},
		];
	}

	return where;
}

export function buildOrderQuery({
	scope = "buyer",
	q,
	status,
	paid,
	payoutStatus,
	page,
} = {}) {
	const params = new URLSearchParams({ scope });
	const query = String(q || "").trim();
	const pageNumber = Number(page);

	if (query) params.set("q", query);
	if (status) params.set("status", status);
	if (paid) params.set("paid", paid);
	if (payoutStatus) params.set("payoutStatus", payoutStatus);
	if (Number.isSafeInteger(pageNumber) && pageNumber > 1) {
		params.set("page", String(pageNumber));
	}

	return `/api/orders?${params.toString()}`;
}

const sellerTransitions = {
	ORDER_PLACED: new Set(["PROCESSING", "CANCELLED"]),
	PROCESSING: new Set(["SHIPPED", "CANCELLED"]),
	SHIPPED: new Set(["DELIVERED"]),
	DELIVERED: new Set([]),
	CANCELLED: new Set([]),
};

export function isAllowedOrderStatusTransition({
	actorRole,
	isBuyer = false,
	currentStatus,
	nextStatus,
} = {}) {
	if (!orderStatuses.has(currentStatus) || !orderStatuses.has(nextStatus)) {
		return false;
	}
	if (currentStatus === nextStatus) return true;
	if (currentStatus === "CANCELLED") return false;

	if (actorRole === "admin") {
		return nextStatus !== "CANCELLED" || currentStatus !== "DELIVERED";
	}

	if (isBuyer) {
		return currentStatus === "ORDER_PLACED" && nextStatus === "CANCELLED";
	}

	return Boolean(sellerTransitions[currentStatus]?.has(nextStatus));
}

export function createOrderStockRestoreItems({
	currentStatus,
	nextStatus,
	orderItems = [],
} = {}) {
	if (currentStatus === "CANCELLED" || nextStatus !== "CANCELLED") return [];

	return orderItems
		.filter((item) => item.product?.stockQuantity !== null)
		.map((item) => ({
			productId: item.product.id,
			quantity: item.quantity,
		}));
}

export function buildOrderPagination({ page, limit } = {}, total = 0) {
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

function normalizeTrackingText(value, maxLength, message) {
	const normalized = String(value || "").trim();
	if (normalized.length > maxLength) throw new Error(message);
	return normalized;
}

function normalizeTrackingUrl(value) {
	const normalized = normalizeTrackingText(
		value,
		500,
		"Tracking URL is too long",
	);
	if (!normalized) return "";
	if (!/^https?:\/\//i.test(normalized)) {
		throw new Error("Tracking URL must start with http");
	}
	return normalized;
}

export function normalizeOrderFulfillmentPayload(body = {}) {
	const data = {};
	if (body.trackingCarrier !== undefined) {
		data.trackingCarrier = normalizeTrackingText(
			body.trackingCarrier,
			120,
			"Tracking carrier is too long",
		);
	}
	if (body.trackingNumber !== undefined) {
		data.trackingNumber = normalizeTrackingText(
			body.trackingNumber,
			120,
			"Tracking number is too long",
		);
	}
	if (body.trackingUrl !== undefined) {
		data.trackingUrl = normalizeTrackingUrl(body.trackingUrl);
	}
	return data;
}

export function canManageOrderForStore(user, order) {
	if (user?.role === "admin") return true;
	return canManageStoreOrders(user, order?.store);
}
