export function createDashboardProductWhere({ storeId } = {}) {
	return {
		isArchived: false,
		...(storeId ? { storeId } : {}),
	};
}

export function normalizeLowStockThreshold(value) {
	const threshold = Number(value);
	if (!Number.isSafeInteger(threshold) || threshold < 0) return 5;
	return Math.min(threshold, 100);
}

export function createLowStockProductWhere({ storeId, threshold } = {}) {
	return {
		isArchived: false,
		...(storeId ? { storeId } : {}),
		stockQuantity: {
			not: null,
			lte: normalizeLowStockThreshold(threshold),
		},
	};
}

export function createOutOfStockProductWhere({ storeId } = {}) {
	return {
		isArchived: false,
		...(storeId ? { storeId } : {}),
		OR: [{ inStock: false }, { stockQuantity: 0 }],
	};
}
