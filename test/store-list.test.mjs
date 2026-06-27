import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildPublicStoreHref,
	buildPublicStorePagination,
	createPublicStoreWhere,
} from "../lib/store-list.mjs";

describe("createPublicStoreWhere", () => {
	it("keeps public store results limited to approved active stores", () => {
		assert.deepEqual(createPublicStoreWhere(), {
			status: "approved",
			isActive: true,
		});
	});

	it("searches store name, username, and description", () => {
		assert.deepEqual(createPublicStoreWhere({ q: "  gadgets  " }), {
			status: "approved",
			isActive: true,
			OR: [
				{ name: { contains: "gadgets", mode: "insensitive" } },
				{ username: { contains: "gadgets", mode: "insensitive" } },
				{ description: { contains: "gadgets", mode: "insensitive" } },
			],
		});
	});
});

describe("buildPublicStoreHref", () => {
	it("builds public store list links with search and page params", () => {
		assert.equal(
			buildPublicStoreHref({ search: "  gadget store  ", page: 3 }),
			"/stores?search=gadget+store&page=3",
		);
	});

	it("drops empty filters and first page", () => {
		assert.equal(buildPublicStoreHref({ search: " ", page: 1 }), "/stores");
	});
});

describe("buildPublicStorePagination", () => {
	it("normalizes store list pagination", () => {
		assert.deepEqual(
			buildPublicStorePagination({ page: "4", limit: "999" }, 90),
			{
				page: 3,
				limit: 36,
				skip: 72,
				take: 36,
				total: 90,
				totalPages: 3,
				hasNextPage: false,
				hasPreviousPage: true,
			},
		);
	});
});
