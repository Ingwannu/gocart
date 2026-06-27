import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createPublicProductDetailWhere,
	buildProductListPagination,
	buildShopHref,
	isPublicProduct,
	upsertPublicProduct,
} from "../lib/product-list.mjs";

describe("isPublicProduct", () => {
	it("requires active stock and an approved active store", () => {
		assert.equal(
			isPublicProduct({
				id: "visible",
				inStock: true,
				isArchived: false,
				stockQuantity: null,
				store: { status: "approved", isActive: true },
			}),
			true,
		);
		assert.equal(
			isPublicProduct({
				id: "pending",
				inStock: true,
				isArchived: false,
				stockQuantity: 3,
				store: { status: "pending", isActive: true },
			}),
			false,
		);
		assert.equal(
			isPublicProduct({
				id: "inactive-store",
				inStock: true,
				isArchived: false,
				stockQuantity: 3,
				store: { status: "approved", isActive: false },
			}),
			false,
		);
		assert.equal(
			isPublicProduct({
				id: "out",
				inStock: true,
				isArchived: false,
				stockQuantity: 0,
				store: { status: "approved", isActive: true },
			}),
			false,
		);
	});
});

describe("upsertPublicProduct", () => {
	it("adds a newly-created public product to the front of the list", () => {
		const existing = [{ id: "old", name: "Old" }];
		const created = {
			id: "new",
			name: "New",
			inStock: true,
			store: { status: "approved", isActive: true },
		};

		assert.deepEqual(upsertPublicProduct(existing, created), [created, existing[0]]);
	});

	it("replaces an existing product instead of duplicating it", () => {
		const existing = [
			{ id: "new", name: "Old Name" },
			{ id: "other", name: "Other" },
		];
		const updated = {
			id: "new",
			name: "New Name",
			inStock: true,
			store: { status: "approved", isActive: true },
		};

		assert.deepEqual(upsertPublicProduct(existing, updated), [
			updated,
			existing[1],
		]);
	});

	it("removes products that are no longer public", () => {
		const existing = [
			{ id: "hidden", name: "Hidden", inStock: true },
			{ id: "visible", name: "Visible", inStock: true },
		];

		assert.deepEqual(
			upsertPublicProduct(existing, {
				id: "hidden",
				name: "Hidden",
				inStock: false,
				isArchived: false,
				store: { status: "approved", isActive: true },
			}),
			[existing[1]],
		);

		assert.deepEqual(
			upsertPublicProduct(existing, {
				id: "hidden",
				name: "Hidden",
				inStock: true,
				isArchived: true,
				store: { status: "approved", isActive: true },
			}),
			[existing[1]],
		);

		assert.deepEqual(
			upsertPublicProduct(existing, {
				id: "hidden",
				name: "Hidden",
				inStock: true,
				isArchived: false,
				store: { status: "rejected", isActive: true },
			}),
			[existing[1]],
		);

		assert.deepEqual(
			upsertPublicProduct(existing, {
				id: "hidden",
				name: "Hidden",
				inStock: true,
				isArchived: false,
				stockQuantity: 0,
				store: { status: "approved", isActive: true },
			}),
			[existing[1]],
		);
	});
});

describe("createPublicProductDetailWhere", () => {
	it("keeps direct product pages aligned with public listing visibility", () => {
		assert.deepEqual(createPublicProductDetailWhere("product_1"), {
			id: "product_1",
			inStock: true,
			isArchived: false,
			OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }],
			store: { status: "approved", isActive: true },
		});
	});
});

describe("buildShopHref", () => {
	it("builds trimmed shop search links with active group filters", () => {
		assert.equal(
			buildShopHref({ search: "  keyboard  ", group: "home-office" }),
			"/shop?search=keyboard&group=home-office",
		);
	});

	it("builds category filter links", () => {
		assert.equal(
			buildShopHref({ category: " Smart Phones " }),
			"/shop?category=Smart+Phones",
		);
	});

	it("keeps page state in shop links after the first page", () => {
		assert.equal(
			buildShopHref({ search: "monitor", group: "desk", page: 2 }),
			"/shop?search=monitor&group=desk&page=2",
		);
	});

	it("drops empty filters and returns the base shop route", () => {
		assert.equal(buildShopHref({ search: "  ", group: "", page: 1 }), "/shop");
	});
});

describe("buildProductListPagination", () => {
	it("normalizes page and limit into prisma pagination plus response metadata", () => {
		assert.deepEqual(buildProductListPagination({ page: "3", limit: "25" }, 61), {
			page: 3,
			limit: 25,
			skip: 50,
			take: 25,
			total: 61,
			totalPages: 3,
			hasNextPage: false,
			hasPreviousPage: true,
		});
	});

	it("falls back from invalid values and clamps excessive limits", () => {
		assert.deepEqual(
			buildProductListPagination({ page: "-2", limit: "999" }, 240, {
				defaultLimit: 30,
				maxLimit: 80,
			}),
			{
				page: 1,
				limit: 80,
				skip: 0,
				take: 80,
				total: 240,
				totalPages: 3,
				hasNextPage: true,
				hasPreviousPage: false,
			},
		);
	});
});
