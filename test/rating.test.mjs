import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAdminRatingPagination,
	createAdminRatingWhere,
	normalizeRatingPayload,
	resolveRatingWriteError,
} from "../lib/rating.mjs";

describe("normalizeRatingPayload", () => {
	it("normalizes rating review payloads", () => {
		assert.deepEqual(
			normalizeRatingPayload({
				orderId: " order_1 ",
				productId: " product_1 ",
				rating: "5",
				review: "  Works well  ",
			}),
			{
				orderId: "order_1",
				productId: "product_1",
				rating: 5,
				review: "Works well",
			},
		);
	});

	it("rejects invalid ratings and blank reviews", () => {
		assert.throws(
			() =>
				normalizeRatingPayload({
					orderId: "order_1",
					productId: "product_1",
					rating: 0,
					review: "Works well",
				}),
			/Invalid rating payload/,
		);
		assert.throws(
			() =>
				normalizeRatingPayload({
					orderId: "order_1",
					productId: "product_1",
					rating: 5,
					review: "       ",
				}),
			/Review is too short/,
		);
	});
});

describe("createAdminRatingWhere", () => {
	it("combines review search and rating filters for moderation", () => {
		assert.deepEqual(createAdminRatingWhere({ q: "keyboard", rating: "5" }), {
			rating: 5,
			OR: [
				{ review: { contains: "keyboard", mode: "insensitive" } },
				{ user: { name: { contains: "keyboard", mode: "insensitive" } } },
				{ user: { email: { contains: "keyboard", mode: "insensitive" } } },
				{ product: { name: { contains: "keyboard", mode: "insensitive" } } },
			],
		});
	});

	it("ignores invalid rating filters", () => {
		assert.deepEqual(createAdminRatingWhere({ rating: "9" }), {});
	});
});

describe("buildAdminRatingPagination", () => {
	it("normalizes rating list pagination", () => {
		assert.deepEqual(buildAdminRatingPagination({ page: "3", limit: "999" }, 121), {
			page: 3,
			limit: 50,
			skip: 100,
			take: 50,
			total: 121,
			totalPages: 3,
			hasNextPage: false,
			hasPreviousPage: true,
		});
	});
});

describe("resolveRatingWriteError", () => {
	it("maps missing rating writes to API errors", () => {
		assert.deepEqual(resolveRatingWriteError({ code: "P2025" }), {
			message: "Rating not found",
			status: 404,
		});
		assert.equal(resolveRatingWriteError({ code: "OTHER" }), null);
	});
});
