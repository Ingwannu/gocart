import assert from "node:assert/strict";
import { describe, it } from "node:test";
import reducer, { addRating, setRatings } from "../lib/features/rating/ratingSlice.mjs";

describe("ratingSlice", () => {
	it("replaces an existing rating for the same order and product", () => {
		const existing = {
			id: "old",
			orderId: "order_1",
			productId: "product_1",
			rating: 3,
		};
		const updated = {
			id: "new",
			orderId: "order_1",
			productId: "product_1",
			rating: 5,
		};

		const initialized = reducer(undefined, setRatings([existing]));
		const next = reducer(initialized, addRating(updated));

		assert.deepEqual(next.ratings, [updated]);
	});
});
