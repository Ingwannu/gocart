import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createWishlistProductWhere,
	normalizeWishlistProductId,
	resolveWishlistWriteError,
} from "../lib/wishlist.mjs";

describe("normalizeWishlistProductId", () => {
	it("normalizes saved product ids and rejects blanks", () => {
		assert.equal(normalizeWishlistProductId("  product_1 "), "product_1");
		assert.throws(() => normalizeWishlistProductId(" "), /Product is required/);
		assert.throws(() => normalizeWishlistProductId(null), /Product is required/);
	});
});

describe("createWishlistProductWhere", () => {
	it("keeps wishlist products public and searchable", () => {
		assert.deepEqual(createWishlistProductWhere({ q: " keyboard " }), {
			isArchived: false,
			inStock: true,
			store: { status: "approved", isActive: true },
			OR: [
				{ name: { contains: "keyboard", mode: "insensitive" } },
				{ description: { contains: "keyboard", mode: "insensitive" } },
				{ category: { contains: "keyboard", mode: "insensitive" } },
				{ store: { name: { contains: "keyboard", mode: "insensitive" } } },
				{ store: { username: { contains: "keyboard", mode: "insensitive" } } },
			],
		});
	});
});

describe("resolveWishlistWriteError", () => {
	it("maps duplicate saves to an idempotent saved response", () => {
		assert.deepEqual(resolveWishlistWriteError({ code: "P2002" }), {
			duplicate: true,
		});
		assert.equal(resolveWishlistWriteError({ code: "P2025" }), null);
	});
});
