import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildOrderReceipt,
	canAccessOrderReceipt,
} from "../lib/order-receipt.mjs";

describe("buildOrderReceipt", () => {
	it("exports buyer-safe order receipt data with line totals", () => {
		const receipt = buildOrderReceipt({
			id: "order_1",
			total: 42.5,
			status: "DELIVERED",
			isPaid: true,
			paymentMethod: "STRIPE",
			paymentReference: "cs_test_123",
			createdAt: new Date("2026-06-05T00:00:00.000Z"),
			updatedAt: new Date("2026-06-05T01:00:00.000Z"),
			trackingCarrier: "CJ",
			trackingNumber: "1234",
			trackingUrl: "https://track.example.com/1234",
			user: {
				id: "buyer_1",
				name: "Buyer",
				email: "buyer@example.com",
				password: "hashed",
				cart: "{}",
			},
			store: {
				id: "store_1",
				name: "Test Store",
				username: "test-store",
				email: "store@example.com",
			},
			address: {
				name: "Buyer",
				email: "buyer@example.com",
				street: "Street 1",
				city: "Seoul",
				state: "Seoul",
				zip: "00000",
				country: "KR",
				phone: "010",
			},
			orderItems: [
				{
					quantity: 2,
					price: 10,
					product: {
						id: "product_1",
						name: "Keyboard",
						category: "Desk",
					},
				},
				{
					quantity: 1,
					price: 22.5,
					product: {
						id: "product_2",
						name: "Mouse",
						category: "Desk",
					},
				},
			],
			returnRequest: { id: "return_1", status: "REQUESTED" },
		});

		assert.equal(receipt.version, 1);
		assert.equal(receipt.order.id, "order_1");
		assert.equal(receipt.order.createdAt, "2026-06-05T00:00:00.000Z");
		assert.deepEqual(receipt.buyer, {
			id: "buyer_1",
			name: "Buyer",
			email: "buyer@example.com",
		});
		assert.equal(receipt.buyer.password, undefined);
		assert.equal(receipt.buyer.cart, undefined);
		assert.deepEqual(
			receipt.items.map((item) => item.lineTotal),
			[20, 22.5],
		);
		assert.deepEqual(receipt.totals, {
			subtotal: 42.5,
			total: 42.5,
			currency: "$",
		});
		assert.equal(receipt.returnRequest.status, "REQUESTED");
	});

	it("exports digital-only order receipts without a shipping address", () => {
		const receipt = buildOrderReceipt({
			id: "order_digital",
			total: 10,
			status: "ORDER_PLACED",
			isPaid: true,
			paymentMethod: "STRIPE",
			createdAt: new Date("2026-06-05T00:00:00.000Z"),
			updatedAt: new Date("2026-06-05T01:00:00.000Z"),
			user: { id: "buyer_1", name: "Buyer", email: "buyer@example.com" },
			store: { id: "store_1", name: "Store", username: "store" },
			address: null,
			orderItems: [
				{
					quantity: 1,
					price: 10,
					product: {
						id: "digital_1",
						name: "Source Pack",
						category: "Code",
						deliveryType: "digital",
					},
				},
			],
		});

		assert.equal(receipt.address, null);
		assert.equal(receipt.items[0].name, "Source Pack");
	});
});

describe("canAccessOrderReceipt", () => {
	it("allows buyers, admins, owners, and active store staff only", () => {
		const order = {
			userId: "buyer_1",
			store: {
				userId: "owner_1",
				status: "approved",
				isActive: true,
				staffMembers: [
					{ userId: "viewer_1", role: "viewer", isActive: true },
					{ userId: "staff_1", role: "staff", isActive: true },
				],
			},
		};

		assert.equal(canAccessOrderReceipt({ id: "buyer_1", role: "user" }, order), true);
		assert.equal(canAccessOrderReceipt({ id: "admin_1", role: "admin" }, order), true);
		assert.equal(canAccessOrderReceipt({ id: "owner_1", role: "seller" }, order), true);
		assert.equal(canAccessOrderReceipt({ id: "viewer_1", role: "user" }, order), false);
		assert.equal(canAccessOrderReceipt({ id: "staff_1", role: "user" }, order), true);
		assert.equal(canAccessOrderReceipt({ id: "other", role: "user" }, order), false);
	});
});
