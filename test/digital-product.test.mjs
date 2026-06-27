import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canAccessDigitalDownload,
	isDigitalProduct,
	normalizeProductDeliveryFields,
	orderRequiresShippingAddress,
	serializeProductDigitalFields,
} from "../lib/digital-product.mjs";

describe("normalizeProductDeliveryFields", () => {
	it("normalizes physical product delivery fields without a download file", () => {
		assert.deepEqual(normalizeProductDeliveryFields({ deliveryType: "physical" }), {
			deliveryType: "physical",
			digitalAssetName: "",
			digitalAssetUrl: "",
		});
	});

	it("requires a private downloadable asset token for digital products", () => {
		assert.deepEqual(
			normalizeProductDeliveryFields({
				deliveryType: "digital",
				digitalAssetName: " Source code.zip ",
				digitalAssetUrl: " private://uploads/abc123-source-code.zip ",
			}),
			{
				deliveryType: "digital",
				digitalAssetName: "Source code.zip",
				digitalAssetUrl: "private://uploads/abc123-source-code.zip",
			},
		);
		assert.throws(
			() => normalizeProductDeliveryFields({ deliveryType: "digital" }),
			/Digital products require a download file/,
		);
		for (const digitalAssetUrl of [
			"javascript:alert(1)",
			"/uploads/source-code.zip",
			"https://example.com/source-code.zip",
		]) {
			assert.throws(
				() =>
					normalizeProductDeliveryFields({
						deliveryType: "digital",
						digitalAssetUrl,
					}),
				/Digital download URL must be a private upload token/,
			);
		}
	});
});

describe("digital order access", () => {
	it("requires shipping only when an order includes physical products", () => {
		assert.equal(
			orderRequiresShippingAddress([
				{ deliveryType: "digital" },
				{ deliveryType: "digital" },
			]),
			false,
		);
		assert.equal(
			orderRequiresShippingAddress([
				{ deliveryType: "digital" },
				{ deliveryType: "physical" },
			]),
			true,
		);
	});

	it("allows paid buyers to download only purchased digital products", () => {
		const order = {
			userId: "buyer_1",
			isPaid: true,
			status: "ORDER_PLACED",
			orderItems: [
				{
					productId: "digital_1",
					product: {
						id: "digital_1",
						deliveryType: "digital",
						digitalAssetUrl: "private://uploads/abc123-source-code.zip",
					},
				},
				{
					productId: "physical_1",
					product: { id: "physical_1", deliveryType: "physical" },
				},
			],
		};

		assert.equal(isDigitalProduct(order.orderItems[0].product), true);
		assert.equal(
			canAccessDigitalDownload({
				user: { id: "buyer_1", role: "user" },
				order,
				productId: "digital_1",
			}).ok,
			true,
		);
		assert.equal(
			canAccessDigitalDownload({
				user: { id: "other", role: "user" },
				order,
				productId: "digital_1",
			}).ok,
			false,
		);
		assert.equal(
			canAccessDigitalDownload({
				user: { id: "buyer_1", role: "user" },
				order,
				productId: "physical_1",
			}).ok,
			false,
		);
	});

	it("rejects legacy public and external digital asset URLs", () => {
		for (const digitalAssetUrl of [
			"/uploads/source-code.zip",
			"https://example.com/source-code.zip",
		]) {
			const result = canAccessDigitalDownload({
				user: { id: "buyer_1", role: "user" },
				order: {
					userId: "buyer_1",
					isPaid: true,
					status: "ORDER_PLACED",
					orderItems: [
						{
							productId: "digital_1",
							product: {
								id: "digital_1",
								deliveryType: "digital",
								digitalAssetUrl,
							},
						},
					],
				},
				productId: "digital_1",
			});

			assert.equal(result.ok, false);
			assert.equal(result.status, 404);
		}
	});
});

describe("serializeProductDigitalFields", () => {
	it("hides download URLs unless management payloads explicitly request them", () => {
		const product = {
			deliveryType: "digital",
			digitalAssetName: "source.zip",
			digitalAssetUrl: "private://uploads/abc123-source.zip",
		};

		assert.deepEqual(serializeProductDigitalFields(product), {
			deliveryType: "digital",
			digitalAssetName: "source.zip",
		});
		assert.deepEqual(
			serializeProductDigitalFields(product, { includeDigitalAsset: true }),
			{
				deliveryType: "digital",
				digitalAssetName: "source.zip",
				digitalAssetUrl: "private://uploads/abc123-source.zip",
			},
		);
	});
});
