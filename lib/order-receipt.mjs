import { canManageOrderForStore } from "./order-filters.mjs";

function serializeDate(value) {
	if (value instanceof Date) return value.toISOString();
	return value || null;
}

function roundAmount(value) {
	const amount = Number(value);
	return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function buyerSummary(user = {}) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
	};
}

function storeSummary(store = {}) {
	return {
		id: store.id,
		name: store.name,
		username: store.username,
		email: store.email,
	};
}

function addressSummary(address = {}) {
	if (!address) return null;
	return {
		name: address.name,
		email: address.email,
		street: address.street,
		city: address.city,
		state: address.state,
		zip: address.zip,
		country: address.country,
		phone: address.phone,
	};
}

function returnRequestSummary(returnRequest) {
	if (!returnRequest) return null;
	return {
		id: returnRequest.id,
		status: returnRequest.status,
		reason: returnRequest.reason,
		resolutionNote: returnRequest.resolutionNote,
		refundAmount: roundAmount(returnRequest.refundAmount),
		createdAt: serializeDate(returnRequest.createdAt),
		updatedAt: serializeDate(returnRequest.updatedAt),
	};
}

export function buildOrderReceipt(
	order,
	{ currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$" } = {},
) {
	const items = (order.orderItems || []).map((item) => {
		const unitPrice = roundAmount(item.price);
		const quantity = Number(item.quantity) || 0;
		return {
			productId: item.product?.id || item.productId,
			name: item.product?.name || "",
			category: item.product?.category || "",
			quantity,
			unitPrice,
			lineTotal: roundAmount(unitPrice * quantity),
		};
	});
	const subtotal = roundAmount(
		items.reduce((total, item) => total + item.lineTotal, 0),
	);

	return {
		version: 1,
		issuedAt: new Date().toISOString(),
		order: {
			id: order.id,
			status: order.status,
			isPaid: Boolean(order.isPaid),
			paymentMethod: order.paymentMethod,
			paymentReference: order.paymentReference || "",
			createdAt: serializeDate(order.createdAt),
			updatedAt: serializeDate(order.updatedAt),
		},
		buyer: buyerSummary(order.user),
		store: storeSummary(order.store),
		address: addressSummary(order.address),
		items,
		totals: {
			subtotal,
			total: roundAmount(order.total),
			currency,
		},
		tracking: {
			carrier: order.trackingCarrier || "",
			number: order.trackingNumber || "",
			url: order.trackingUrl || "",
		},
		returnRequest: returnRequestSummary(order.returnRequest),
	};
}

export function canAccessOrderReceipt(user, order) {
	if (!user?.id || !order?.id && !order?.userId) return false;
	if (user.role === "admin") return true;
	if (order.userId === user.id) return true;
	return canManageOrderForStore(user, order);
}
