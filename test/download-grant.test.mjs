import assert from "node:assert/strict";
import { describe, it } from "node:test";

// We test the pure helpers that don't need a database: grant item collection
// and the access-control shape. The Prisma-backed functions are exercised via
// the route source tests; a full DB round-trip would require a live Postgres.
import {
	collectDigitalGrantItems,
	DEFAULT_MAX_DOWNLOADS,
	DEFAULT_GRANT_TTL_MS,
} from "../lib/download-grant.mjs";

describe("collectDigitalGrantItems", () => {
	it("returns nothing for unpaid orders", () => {
		const order = {
			isPaid: false,
			orderItems: [
				{
					productId: "d1",
					product: { id: "d1", deliveryType: "digital", digitalAssetUrl: "private://uploads/a1-source.zip" },
				},
			],
		};
		assert.deepEqual(collectDigitalGrantItems(order), []);
	});

	it("collects only digital items backed by private upload tokens", () => {
		const order = {
			isPaid: true,
			userId: "buyer1",
			orderItems: [
				{
					productId: "d1",
					product: {
						id: "d1",
						deliveryType: "digital",
						digitalAssetUrl: "private://uploads/abc-source.zip",
						digitalAssetName: "source.zip",
					},
				},
				{
					productId: "p1",
					product: { id: "p1", deliveryType: "physical" },
				},
				{
					productId: "d2",
					product: {
						id: "d2",
						deliveryType: "digital",
						digitalAssetUrl: "https://example.com/d2.zip",
					},
				},
			],
		};
		const items = collectDigitalGrantItems(order);
		assert.equal(items.length, 1);
		assert.equal(items[0].productId, "d1");
		assert.equal(items[0].digitalAssetUrl, "private://uploads/abc-source.zip");
	});

	it("dedupes repeated digital line items for the same product", () => {
		const order = {
			isPaid: true,
			userId: "buyer1",
			orderItems: [
				{
					productId: "d1",
					product: { id: "d1", deliveryType: "digital", digitalAssetUrl: "private://uploads/abc1-source.zip" },
				},
				{
					productId: "d1",
					product: { id: "d1", deliveryType: "digital", digitalAssetUrl: "private://uploads/abc1-source.zip" },
				},
			],
		};
		assert.equal(collectDigitalGrantItems(order).length, 1);
	});
});

describe("download grant defaults", () => {
	it("uses a sensible default download cap and TTL", () => {
		assert.equal(DEFAULT_MAX_DOWNLOADS, 5);
		assert.ok(DEFAULT_GRANT_TTL_MS >= 365 * 24 * 60 * 60 * 1000);
		assert.ok(DEFAULT_GRANT_TTL_MS <= 366 * 24 * 60 * 60 * 1000);
	});
});
