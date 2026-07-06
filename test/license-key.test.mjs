import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	collectLicenseItems,
	generateLicenseKey,
	isLicenseKeyFormat,
	normalizeInstanceId,
	normalizeLicenseKeyInput,
	resolveLicenseValidation,
	serializeLicenseKey,
} from "../lib/license-key.mjs";

describe("generateLicenseKey", () => {
	it("creates unique keys in the WS-XXXXX-XXXXX-XXXXX-XXXXX format", () => {
		const keys = new Set();
		for (let i = 0; i < 200; i += 1) {
			const key = generateLicenseKey();
			assert.equal(isLicenseKeyFormat(key), true, `bad format: ${key}`);
			keys.add(key);
		}
		assert.equal(keys.size, 200);
	});

	it("never emits ambiguous characters", () => {
		for (let i = 0; i < 50; i += 1) {
			assert.doesNotMatch(generateLicenseKey(), /[01OIL]/);
		}
	});
});

describe("isLicenseKeyFormat", () => {
	it("rejects malformed keys", () => {
		assert.equal(isLicenseKeyFormat(""), false);
		assert.equal(isLicenseKeyFormat("WS-ABCDE"), false);
		assert.equal(isLicenseKeyFormat("XX-ABCDE-ABCDE-ABCDE-ABCDE"), false);
		assert.equal(isLicenseKeyFormat("WS-ABCD1-ABCDE-ABCDE-ABCDE"), false);
	});

	it("accepts lowercase input after normalization", () => {
		const key = generateLicenseKey();
		assert.equal(isLicenseKeyFormat(normalizeLicenseKeyInput(key.toLowerCase())), true);
	});
});

describe("collectLicenseItems", () => {
	const digitalProduct = { id: "prod_1", deliveryType: "digital" };
	const physicalProduct = { id: "prod_2", deliveryType: "physical" };

	it("licenses digital products on paid orders only", () => {
		assert.deepEqual(
			collectLicenseItems({
				isPaid: true,
				orderItems: [
					{ productId: "prod_1", product: digitalProduct },
					{ productId: "prod_2", product: physicalProduct },
				],
			}),
			[{ productId: "prod_1" }],
		);
		assert.deepEqual(
			collectLicenseItems({
				isPaid: false,
				orderItems: [{ productId: "prod_1", product: digitalProduct }],
			}),
			[],
		);
	});

	it("does not require an uploaded digital asset", () => {
		assert.deepEqual(
			collectLicenseItems({
				isPaid: true,
				orderItems: [
					{ productId: "prod_1", product: { ...digitalProduct, digitalAssetUrl: "" } },
				],
			}),
			[{ productId: "prod_1" }],
		);
	});

	it("deduplicates repeated products", () => {
		assert.deepEqual(
			collectLicenseItems({
				isPaid: true,
				orderItems: [
					{ productId: "prod_1", product: digitalProduct },
					{ productId: "prod_1", product: digitalProduct },
				],
			}),
			[{ productId: "prod_1" }],
		);
	});
});

describe("resolveLicenseValidation", () => {
	const activeLicense = {
		id: "lic_1",
		productId: "prod_1",
		status: "ACTIVE",
		boundInstanceId: "",
		revokedAt: null,
		order: { isPaid: true },
	};

	it("rejects unknown, revoked, and unpaid licenses", () => {
		assert.deepEqual(resolveLicenseValidation({ license: null }), {
			ok: false,
			reason: "unknown_key",
		});
		assert.deepEqual(
			resolveLicenseValidation({
				license: { ...activeLicense, revokedAt: new Date() },
			}),
			{ ok: false, reason: "revoked" },
		);
		assert.deepEqual(
			resolveLicenseValidation({
				license: { ...activeLicense, status: "REVOKED" },
			}),
			{ ok: false, reason: "revoked" },
		);
		assert.deepEqual(
			resolveLicenseValidation({
				license: { ...activeLicense, order: { isPaid: false } },
			}),
			{ ok: false, reason: "unpaid" },
		);
	});

	it("enforces the product the license was issued for", () => {
		assert.deepEqual(
			resolveLicenseValidation({ license: activeLicense, productId: "prod_2" }),
			{ ok: false, reason: "product_mismatch" },
		);
		assert.equal(
			resolveLicenseValidation({ license: activeLicense, productId: "prod_1" }).ok,
			true,
		);
	});

	it("binds the first instance and locks out others", () => {
		assert.deepEqual(
			resolveLicenseValidation({ license: activeLicense, instanceId: "guild-123" }),
			{ ok: true, bind: "guild-123" },
		);
		const bound = { ...activeLicense, boundInstanceId: "guild-123" };
		assert.deepEqual(
			resolveLicenseValidation({ license: bound, instanceId: "guild-123" }),
			{ ok: true },
		);
		assert.deepEqual(
			resolveLicenseValidation({ license: bound, instanceId: "guild-999" }),
			{ ok: false, reason: "instance_mismatch" },
		);
	});

	it("validates without binding when no instance id is supplied", () => {
		assert.deepEqual(resolveLicenseValidation({ license: activeLicense }), {
			ok: true,
		});
		assert.deepEqual(
			resolveLicenseValidation({
				license: { ...activeLicense, boundInstanceId: "guild-123" },
			}),
			{ ok: true },
		);
	});
});

describe("normalizeInstanceId", () => {
	it("trims and caps hostile input", () => {
		assert.equal(normalizeInstanceId("  guild-123  "), "guild-123");
		assert.equal(normalizeInstanceId("x".repeat(500)).length, 190);
		assert.equal(normalizeInstanceId(null), "");
	});
});

describe("serializeLicenseKey", () => {
	it("exposes only buyer-safe fields", () => {
		const serialized = serializeLicenseKey({
			id: "lic_1",
			key: "WS-AAAAA-AAAAA-AAAAA-AAAAA",
			productId: "prod_1",
			product: { name: "Discord Bot Kit", digitalAssetUrl: "private://uploads/x.zip" },
			status: "ACTIVE",
			boundInstanceId: "",
			userId: "user_1",
			orderId: "order_1",
			boundAt: null,
			revokedAt: null,
			createdAt: new Date(0),
		});
		assert.equal(serialized.productName, "Discord Bot Kit");
		assert.equal(serialized.userId, undefined);
		assert.equal(serialized.orderId, undefined);
		assert.equal(Object.hasOwn(serialized, "digitalAssetUrl"), false);
	});
});
