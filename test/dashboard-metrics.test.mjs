import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createDashboardProductWhere,
	createLowStockProductWhere,
	createOutOfStockProductWhere,
	normalizeLowStockThreshold,
} from "../lib/dashboard-metrics.mjs";

describe("createDashboardProductWhere", () => {
	it("excludes archived products from global dashboard counts", () => {
		assert.deepEqual(createDashboardProductWhere(), { isArchived: false });
	});

	it("keeps seller dashboard product counts scoped to one store", () => {
		assert.deepEqual(createDashboardProductWhere({ storeId: "store_1" }), {
			isArchived: false,
			storeId: "store_1",
		});
	});
});

describe("normalizeLowStockThreshold", () => {
	it("normalizes low stock thresholds with a practical default", () => {
		assert.equal(normalizeLowStockThreshold("3"), 3);
		assert.equal(normalizeLowStockThreshold("0"), 0);
		assert.equal(normalizeLowStockThreshold("bad"), 5);
		assert.equal(normalizeLowStockThreshold("999"), 100);
	});
});

describe("createLowStockProductWhere", () => {
	it("finds tracked, non-archived products under the stock threshold", () => {
		assert.deepEqual(createLowStockProductWhere({ threshold: "4" }), {
			isArchived: false,
			stockQuantity: { not: null, lte: 4 },
		});
	});

	it("scopes low stock products to one store", () => {
		assert.deepEqual(
			createLowStockProductWhere({ storeId: "store_1", threshold: "2" }),
			{
				isArchived: false,
				storeId: "store_1",
				stockQuantity: { not: null, lte: 2 },
			},
		);
	});
});

describe("createOutOfStockProductWhere", () => {
	it("finds unavailable or zero quantity products", () => {
		assert.deepEqual(createOutOfStockProductWhere(), {
			isArchived: false,
			OR: [{ inStock: false }, { stockQuantity: 0 }],
		});
	});
});
