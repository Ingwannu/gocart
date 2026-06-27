import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildInventoryAdjustmentPagination,
	createInventoryUpdate,
	normalizeInventoryAdjustmentPayload,
	resolveInventoryWriteError,
} from "../lib/inventory.mjs";

describe("normalizeInventoryAdjustmentPayload", () => {
	it("normalizes exact stock quantity updates", () => {
		assert.deepEqual(
			normalizeInventoryAdjustmentPayload({
				mode: "set",
				quantity: "12",
				reason: "  Manual stock count ",
			}),
			{
				mode: "set",
				quantity: 12,
				reason: "Manual stock count",
			},
		);
	});

	it("normalizes signed stock adjustments", () => {
		assert.deepEqual(
			normalizeInventoryAdjustmentPayload({
				mode: "adjust",
				quantity: "-3",
				reason: " Damaged units ",
			}),
			{
				mode: "adjust",
				quantity: -3,
				reason: "Damaged units",
			},
		);
	});

	it("rejects vague reasons and invalid quantities", () => {
		assert.throws(
			() => normalizeInventoryAdjustmentPayload({ mode: "set", quantity: "1", reason: "x" }),
			/Inventory reason is too short/,
		);
		assert.throws(
			() =>
				normalizeInventoryAdjustmentPayload({
					mode: "adjust",
					quantity: "0",
					reason: "Stock check",
				}),
			/Adjustment quantity cannot be zero/,
		);
	});
});

describe("createInventoryUpdate", () => {
	it("sets exact tracked stock and stock visibility", () => {
		assert.deepEqual(
			createInventoryUpdate({
				currentQuantity: 3,
				payload: { mode: "set", quantity: 0, reason: "Sold through" },
			}),
			{
				previousQuantity: 3,
				nextQuantity: 0,
				delta: -3,
				productData: {
					stockQuantity: 0,
					inStock: false,
				},
			},
		);
	});

	it("adjusts tracked stock without allowing negative stock", () => {
		assert.deepEqual(
			createInventoryUpdate({
				currentQuantity: 5,
				payload: { mode: "adjust", quantity: -2, reason: "Cycle count" },
			}),
			{
				previousQuantity: 5,
				nextQuantity: 3,
				delta: -2,
				productData: {
					stockQuantity: 3,
					inStock: true,
				},
			},
		);
		assert.throws(
			() =>
				createInventoryUpdate({
					currentQuantity: 1,
					payload: { mode: "adjust", quantity: -2, reason: "Cycle count" },
				}),
			/Stock cannot be negative/,
		);
	});

	it("requires exact set mode before adjusting untracked stock", () => {
		assert.throws(
			() =>
				createInventoryUpdate({
					currentQuantity: null,
					payload: { mode: "adjust", quantity: 2, reason: "Restock" },
				}),
			/Cannot adjust untracked stock/,
		);
	});
});

describe("buildInventoryAdjustmentPagination", () => {
	it("normalizes inventory adjustment pagination", () => {
		assert.deepEqual(buildInventoryAdjustmentPagination({ page: "2", limit: "999" }, 81), {
			page: 2,
			limit: 50,
			skip: 50,
			take: 50,
			total: 81,
			totalPages: 2,
			hasNextPage: false,
			hasPreviousPage: true,
		});
	});
});

describe("resolveInventoryWriteError", () => {
	it("maps missing inventory writes to API errors", () => {
		assert.deepEqual(resolveInventoryWriteError({ code: "P2025" }), {
			message: "Inventory record not found",
			status: 404,
		});
		assert.equal(resolveInventoryWriteError({ code: "OTHER" }), null);
	});
});
