const inventoryModes = new Set(["set", "adjust"]);

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function normalizeReason(value) {
	const reason = String(value || "").trim();
	if (reason.length < 5) throw new Error("Inventory reason is too short");
	if (reason.length > 500) throw new Error("Inventory reason is too long");
	return reason;
}

function normalizeQuantity(value, mode) {
	const quantity = Number(value);
	if (!Number.isSafeInteger(quantity)) throw new Error("Invalid inventory quantity");
	if (mode === "set" && quantity < 0) {
		throw new Error("Invalid inventory quantity");
	}
	if (mode === "adjust" && quantity === 0) {
		throw new Error("Adjustment quantity cannot be zero");
	}
	return quantity;
}

export function normalizeInventoryAdjustmentPayload(body = {}) {
	const mode = inventoryModes.has(body.mode) ? body.mode : "adjust";
	return {
		mode,
		quantity: normalizeQuantity(body.quantity, mode),
		reason: normalizeReason(body.reason),
	};
}

export function createInventoryUpdate({ currentQuantity, payload } = {}) {
	if (!payload) throw new Error("Inventory payload is required");
	if (payload.mode === "adjust" && currentQuantity === null) {
		throw new Error("Cannot adjust untracked stock");
	}

	const previousQuantity = currentQuantity;
	const nextQuantity =
		payload.mode === "set"
			? payload.quantity
			: Number(currentQuantity) + payload.quantity;
	if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 0) {
		throw new Error("Stock cannot be negative");
	}

	const previousForDelta = previousQuantity ?? 0;
	const delta = nextQuantity - previousForDelta;
	return {
		previousQuantity,
		nextQuantity,
		delta,
		productData: {
			stockQuantity: nextQuantity,
			inStock: nextQuantity > 0,
		},
	};
}

export function buildInventoryAdjustmentPagination(
	{ page, limit } = {},
	total = 0,
) {
	const normalizedTotal = Math.max(0, normalizePositiveInteger(total, 0));
	const normalizedLimit = Math.min(normalizePositiveInteger(limit, 20), 50);
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

export function resolveInventoryWriteError(error) {
	if (error?.code === "P2025") {
		return { message: "Inventory record not found", status: 404 };
	}
	return null;
}
