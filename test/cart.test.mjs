import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	MAX_CART_QUANTITY,
	normalizeCartItems,
	parseStoredCart,
	totalCartItems,
} from "../lib/cart.mjs";

describe("normalizeCartItems", () => {
	it("keeps valid product quantities", () => {
		assert.deepEqual(normalizeCartItems({ abc: 2, xyz: "3" }), {
			abc: 2,
			xyz: 3,
		});
	});

	it("drops invalid entries and caps high quantities", () => {
		assert.deepEqual(
			normalizeCartItems({
				abc: 0,
				def: -1,
				ghi: 1.5,
				jkl: MAX_CART_QUANTITY + 10,
			}),
			{ jkl: MAX_CART_QUANTITY },
		);
	});
});

describe("parseStoredCart", () => {
	it("returns an empty cart for invalid JSON", () => {
		assert.deepEqual(parseStoredCart("{"), {});
	});

	it("normalizes parsed JSON carts", () => {
		assert.deepEqual(parseStoredCart('{"abc":2,"bad":0}'), { abc: 2 });
	});
});

describe("totalCartItems", () => {
	it("adds normalized quantities", () => {
		assert.equal(totalCartItems({ abc: 2, xyz: 3, bad: 0 }), 5);
	});
});
