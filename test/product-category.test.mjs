import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAdminProductCategoryPagination,
	createAdminProductCategoryWhere,
	normalizeProductCategoryPayload,
	resolveProductCategoryWriteError,
	slugifyCategory,
} from "../lib/product-categories.mjs";

describe("slugifyCategory", () => {
	it("creates a stable lowercase category slug", () => {
		assert.equal(slugifyCategory(" Smart Phones & Gear "), "smart-phones-gear");
	});
});

describe("normalizeProductCategoryPayload", () => {
	it("normalizes category form values", () => {
		assert.deepEqual(
			normalizeProductCategoryPayload({
				name: " Smart Phones ",
				description: "Devices",
				isActive: true,
				sortOrder: "3",
			}),
			{
				name: "Smart Phones",
				slug: "smart-phones",
				description: "Devices",
				isActive: true,
				sortOrder: 3,
			},
		);
	});

	it("rejects invalid sort order values", () => {
		assert.throws(
			() =>
				normalizeProductCategoryPayload({
					name: "Phones",
					sortOrder: "2.5",
				}),
			/Invalid sort order/,
		);
	});
});

describe("createAdminProductCategoryWhere", () => {
	it("combines category text search and active filters", () => {
		assert.deepEqual(createAdminProductCategoryWhere({ q: "phone", active: "true" }), {
			isActive: true,
			OR: [
				{ name: { contains: "phone", mode: "insensitive" } },
				{ slug: { contains: "phone", mode: "insensitive" } },
				{ description: { contains: "phone", mode: "insensitive" } },
			],
		});
	});
});

describe("buildAdminProductCategoryPagination", () => {
	it("normalizes category pagination and clamps high limits", () => {
		assert.deepEqual(
			buildAdminProductCategoryPagination({ page: "3", limit: "999" }, 101),
			{
				page: 3,
				limit: 50,
				skip: 100,
				take: 50,
				total: 101,
				totalPages: 3,
				hasNextPage: false,
				hasPreviousPage: true,
			},
		);
	});
});

describe("resolveProductCategoryWriteError", () => {
	it("maps unique slug conflicts and missing records to API errors", () => {
		assert.deepEqual(resolveProductCategoryWriteError({ code: "P2002" }), {
			message: "Product category slug already exists",
			status: 409,
		});
		assert.deepEqual(resolveProductCategoryWriteError({ code: "P2025" }), {
			message: "Category not found",
			status: 404,
		});
		assert.equal(resolveProductCategoryWriteError({ code: "OTHER" }), null);
	});
});
