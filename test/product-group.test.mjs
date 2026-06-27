import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAdminProductGroupPagination,
	createAdminProductGroupWhere,
	createAdminProductWhere,
	createProductWhere,
	createSellerProductWhere,
	normalizeProductGroupPayload,
	resolveProductGroupWriteError,
	slugifyGroup,
} from "../lib/product-groups.mjs";

describe("slugifyGroup", () => {
	it("creates a stable lowercase slug", () => {
		assert.equal(slugifyGroup(" Home & Kitchen "), "home-kitchen");
	});
});

describe("createAdminProductWhere", () => {
	it("combines admin search and stock filters", () => {
		assert.deepEqual(createAdminProductWhere({ q: "cat", stock: "out" }), {
			isArchived: false,
			AND: [
				{
					OR: [{ inStock: false }, { stockQuantity: 0 }],
				},
				{
					OR: [
						{ name: { contains: "cat", mode: "insensitive" } },
						{ description: { contains: "cat", mode: "insensitive" } },
						{ category: { contains: "cat", mode: "insensitive" } },
						{ store: { name: { contains: "cat", mode: "insensitive" } } },
						{ store: { username: { contains: "cat", mode: "insensitive" } } },
					],
				},
			],
		});
	});

	it("filters admin products by category text", () => {
		assert.deepEqual(createAdminProductWhere({ category: "Phones" }), {
			isArchived: false,
			category: { equals: "Phones", mode: "insensitive" },
		});
	});

	it("filters admin low stock products", () => {
		assert.deepEqual(createAdminProductWhere({ stock: "low" }), {
			isArchived: false,
			stockQuantity: { not: null, lte: 5 },
		});
	});

	it("filters admin featured products", () => {
		assert.deepEqual(createAdminProductWhere({ featured: "true" }), {
			isArchived: false,
			isFeatured: true,
		});
	});
});

describe("createSellerProductWhere", () => {
	it("keeps seller products scoped to one store while filtering", () => {
		assert.deepEqual(
			createSellerProductWhere({
				storeId: "store_1",
				q: "cat",
				group: "pets",
				stock: "out",
			}),
			{
				storeId: "store_1",
				isArchived: false,
				group: { slug: "pets" },
				AND: [
					{
						OR: [{ inStock: false }, { stockQuantity: 0 }],
					},
					{
						OR: [
							{ name: { contains: "cat", mode: "insensitive" } },
							{ description: { contains: "cat", mode: "insensitive" } },
							{ category: { contains: "cat", mode: "insensitive" } },
						],
					},
				],
			},
		);
	});

	it("filters seller low stock products", () => {
		assert.deepEqual(
			createSellerProductWhere({ storeId: "store_1", stock: "low" }),
			{
				storeId: "store_1",
				isArchived: false,
				stockQuantity: { not: null, lte: 5 },
			},
		);
	});

	it("filters seller products by category text", () => {
		assert.deepEqual(
			createSellerProductWhere({ storeId: "store_1", category: "Phones" }),
			{
				storeId: "store_1",
				isArchived: false,
				category: { equals: "Phones", mode: "insensitive" },
			},
		);
	});
});

describe("normalizeProductGroupPayload", () => {
	it("normalizes group form values", () => {
		assert.deepEqual(
			normalizeProductGroupPayload({
				name: " Home & Kitchen ",
				description: "Goods",
				isActive: true,
				sortOrder: "5",
			}),
			{
				name: "Home & Kitchen",
				slug: "home-kitchen",
				description: "Goods",
				isActive: true,
				sortOrder: 5,
			},
		);
	});

	it("rejects invalid sort order values", () => {
		assert.throws(
			() =>
				normalizeProductGroupPayload({
					name: "Invalid",
					sortOrder: "abc",
				}),
			/Invalid sort order/,
		);
		assert.throws(
			() =>
				normalizeProductGroupPayload({
					name: "Invalid",
					sortOrder: "1.5",
				}),
			/Invalid sort order/,
		);
	});
});

describe("resolveProductGroupWriteError", () => {
	it("maps unique slug conflicts and missing records to API errors", () => {
		assert.deepEqual(resolveProductGroupWriteError({ code: "P2002" }), {
			message: "Product group slug already exists",
			status: 409,
		});
		assert.deepEqual(resolveProductGroupWriteError({ code: "P2025" }), {
			message: "Group not found",
			status: 404,
		});
		assert.equal(resolveProductGroupWriteError({ code: "OTHER" }), null);
	});
});

describe("createAdminProductGroupWhere", () => {
	it("combines group text search and active filters", () => {
		assert.deepEqual(createAdminProductGroupWhere({ q: "home", active: "true" }), {
			isActive: true,
			OR: [
				{ name: { contains: "home", mode: "insensitive" } },
				{ slug: { contains: "home", mode: "insensitive" } },
				{ description: { contains: "home", mode: "insensitive" } },
			],
		});
	});

	it("supports inactive group filters", () => {
		assert.deepEqual(createAdminProductGroupWhere({ active: "false" }), {
			isActive: false,
		});
	});
});

describe("buildAdminProductGroupPagination", () => {
	it("normalizes admin group list pagination and clamps high limits", () => {
		assert.deepEqual(
			buildAdminProductGroupPagination({ page: "4", limit: "999" }, 151),
			{
				page: 4,
				limit: 50,
				skip: 150,
				take: 50,
				total: 151,
				totalPages: 4,
				hasNextPage: false,
				hasPreviousPage: true,
			},
		);
	});

	it("falls back from invalid pagination values", () => {
		assert.deepEqual(
			buildAdminProductGroupPagination({ page: "bad", limit: "0" }, 18),
			{
				page: 1,
				limit: 25,
				skip: 0,
				take: 25,
				total: 18,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		);
	});
});

describe("createProductWhere", () => {
	it("combines public product search filters", () => {
		assert.deepEqual(createProductWhere({ q: "cat", group: "pets", category: "Phones", featured: "true" }), {
			inStock: true,
			isArchived: false,
			isFeatured: true,
			AND: [
				{
					OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }],
				},
				{
					OR: [
						{ name: { contains: "cat", mode: "insensitive" } },
						{ description: { contains: "cat", mode: "insensitive" } },
						{ category: { contains: "cat", mode: "insensitive" } },
					],
				},
			],
			store: { status: "approved", isActive: true },
			group: { slug: "pets", isActive: true },
			category: { equals: "Phones", mode: "insensitive" },
		});
	});
});
