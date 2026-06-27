import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	normalizeAddressPayload,
	resolveAddressMutationBlock,
} from "../lib/address.mjs";

describe("normalizeAddressPayload", () => {
	it("normalizes required address fields", () => {
		assert.deepEqual(
			normalizeAddressPayload({
				name: " Test User ",
				email: " TEST@Example.COM ",
				street: " 1 Test St ",
				city: " Seoul ",
				state: " Seoul ",
				zip: 12345,
				country: " KR ",
				phone: " 010-0000-0000 ",
			}),
			{
				name: "Test User",
				email: "test@example.com",
				street: "1 Test St",
				city: "Seoul",
				state: "Seoul",
				zip: "12345",
				country: "KR",
				phone: "010-0000-0000",
			},
		);
	});

	it("rejects missing required address fields", () => {
		assert.throws(
			() =>
				normalizeAddressPayload({
					name: "Test",
					email: "test@example.com",
				}),
			/Missing required address fields/,
		);
	});
});

describe("resolveAddressMutationBlock", () => {
	it("blocks editing or deleting addresses already used by orders", () => {
		assert.deepEqual(resolveAddressMutationBlock({ orderCount: 1 }), {
			message: "Address is already used by an order",
			status: 409,
		});
	});

	it("allows unused addresses to be changed", () => {
		assert.equal(resolveAddressMutationBlock({ orderCount: 0 }), null);
	});
});
